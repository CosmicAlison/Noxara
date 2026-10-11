import type {GuideObject} from './star-facts';
import {preparePiper,synthesizePiper,resetPiper} from './piper';
import {BENCHMARK_TEXT,measurement,type VoiceEngine,type VoiceMeasurement} from './tts-benchmark';
import {ModelWorkerClient} from './worker-client';
export type SetupProgress = (message:string)=>void;
const client=new ModelWorkerClient(()=>new Worker(new URL('./edge.worker.ts',import.meta.url),{type:'module'}));
let audio:HTMLAudioElement|null=null;
let audioUrl:string|null=null;
let speechVersion=0;
// Keep only the last narration: replay should not run Kokoro again.

export function supportsEdge(){return typeof WebAssembly!=='undefined'&&typeof Worker!=='undefined';}
export function isEdgeReady(){return client.ready;}
export async function installEdge(progress:SetupProgress){
  if(!supportsEdge())throw new Error('This browser cannot run the local guide.');
  if(client.ready)return;
  try{await client.request('install',null,15*60*1000,progress);client.ready=true;}
  catch(error){client.reset();throw error;}
}
export function stopEdgeSpeech(){
  speechVersion++;
  if(audio){audio.pause();audio.src='';audio=null;}
  if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}
}
export function cancelEdgeGeneration(){stopEdgeSpeech();client.reset();resetPiper();}
const MAX_CHUNK_CHARS=100;
let cachedChunks:{text:string;blobs:Blob[]}|null=null;
function chunkNarration(text:string):string[]{
  const sentences=(text.match(/[^.!?]+(?:[.!?]+|$)/g)||[text]).map(x=>x.trim()).filter(Boolean);
  const chunks:string[]=[];
  for(const sentence of sentences){
    let current='';
    for(const word of sentence.split(/\s+/)){
      if(current && current.length+word.length+1>MAX_CHUNK_CHARS){chunks.push(current);current='';}
      current+=(current?' ':'')+word;
    }
    if(current)chunks.push(current);
  }
  return chunks;
}
export async function prepareEdgeSpeech(text:string):Promise<void>{
  if(cachedChunks?.text===text)return;
  // Prepare only the first short chunk before playback, not the whole paragraph.
  const chunks=chunkNarration(text);
  if(!chunks.length)throw new Error('There is no narration to play.');
  const first=await client.request<Blob>('voice',{text:chunks[0]},60000);
  cachedChunks={text,blobs:[first]};
}
async function playBlob(blob:Blob,version:number):Promise<void>{
  if(version!==speechVersion)return;
  const url=URL.createObjectURL(blob);
  const player=new Audio(url);audio=player;audioUrl=url;
  try{
    await new Promise<void>((resolve,reject)=>{
      player.onended=()=>resolve();
      player.onpause=()=>{if(version!==speechVersion)resolve();};
      player.onerror=()=>reject(new Error('Audio playback failed on this device.'));
      player.play().catch(reject);
    });
  }finally{
    player.onended=null;player.onpause=null;player.onerror=null;
    if(audio===player)audio=null;
    if(audioUrl===url)audioUrl=null;
    URL.revokeObjectURL(url);
  }
}
export async function speakEdge(text:string,onDone:()=>void){
  stopEdgeSpeech();
  const version=speechVersion;
  await prepareEdgeSpeech(text);
  if(version!==speechVersion)return;
  const chunks=chunkNarration(text);
  try{
    for(let i=0;i<chunks.length;i++){
      if(version!==speechVersion)return;
      let blob=cachedChunks!.blobs[i];
      if(!blob){
        blob=await client.request<Blob>('voice',{text:chunks[i]},60000);
        if(version!==speechVersion)return;
        cachedChunks!.blobs[i]=blob;
      }
      await playBlob(blob,version);
    }
    if(version===speechVersion)onDone();
  }catch(error){
    if(version!==speechVersion)return;
    if(error instanceof DOMException&&error.name==='NotAllowedError')
      throw new Error('Tap Hear it again to play the narration. Your browser blocked automatic playback.');
    throw error;
  }
}
export async function askGemma(object:GuideObject,question?:string,progress?:SetupProgress):Promise<string>{
  if(!client.ready)throw new Error('The guide is not ready. Please retry setup.');
  return client.request<string>('ask',{object,question},90000,progress);
}

let cachedPiper:{text:string;blob:Blob}|null=null;
export async function prepareNarration(text:string,engine:VoiceEngine,progress?:(message:string)=>void):Promise<void>{
  if(engine==='kokoro')return prepareEdgeSpeech(text);
  if(cachedPiper?.text===text)return;
  await preparePiper(progress);
  const blob=await synthesizePiper(text);
  cachedPiper={text,blob};
}
export async function speakNarration(text:string,engine:VoiceEngine,onDone:()=>void):Promise<void>{
  if(engine==='kokoro')return speakEdge(text,onDone);
  stopEdgeSpeech();
  const version=speechVersion;
  await prepareNarration(text,'piper');
  if(version!==speechVersion)return;
  await playBlob(cachedPiper!.blob,version);
  if(version===speechVersion)onDone();
}
export async function benchmarkVoices(progress?:(message:string)=>void):Promise<{piper:VoiceMeasurement;kokoro:VoiceMeasurement}>{
  if(!client.ready)throw new Error('Install the Noxara guide before benchmarking.');
  // Voice download and warm-up are excluded: compare warmed synthesis of identical text.
  progress?.('Preparing Piper voice (download time is excluded)…');
  await preparePiper(progress);
  progress?.('Measuring Piper synthesis…');
  const piperStart=performance.now();
  await synthesizePiper(BENCHMARK_TEXT);
  const piper=measurement('piper',performance.now()-piperStart,BENCHMARK_TEXT.length);
  progress?.('Measuring Kokoro synthesis…');
  const kokoroStart=performance.now();
  await client.request<Blob>('voice',{text:BENCHMARK_TEXT},120000);
  const kokoro=measurement('kokoro',performance.now()-kokoroStart,BENCHMARK_TEXT.length);
  return {piper,kokoro};
}
