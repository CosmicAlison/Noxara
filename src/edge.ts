import type {GuideObject} from './star-facts';
import {preparePiper,isPiperReady,synthesizePiper,resetPiper} from './piper';
import {ModelWorkerClient} from './worker-client';
export type SetupProgress=(message:string)=>void;
const client=new ModelWorkerClient(()=>new Worker(new URL('./edge.worker.ts',import.meta.url),{type:'module'}));
let audio:HTMLAudioElement|null=null;
let audioUrl:string|null=null;
let speechVersion=0;
let cachedPiper:{text:string;blob:Blob}|null=null;
export function supportsEdge(){return typeof WebAssembly!=='undefined'&&typeof Worker!=='undefined';}
export function isEdgeReady(){return client.ready;}
export function isGuideReady(){return client.ready && isPiperReady();}
export async function installEdge(progress:SetupProgress){
  if(!supportsEdge())throw new Error('This browser cannot run the local guide.');
  if(isGuideReady())return;
  // Install in sequence to avoid exhausting mobile memory with simultaneous model initialization.
  if(!client.ready){
    try{progress('Step 1 of 2 · Preparing Gemma…');await client.request('install',null,15*60*1000,progress);client.ready=true;}
    catch(error){client.reset();throw error;}
  }
  progress('Step 2 of 2 · Preparing Piper voice…');
  await preparePiper(progress);
  progress('Gemma and Piper are ready.');
}
export function stopEdgeSpeech(){
  speechVersion++;
  if(audio){audio.pause();audio.src='';audio=null;}
  if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}
}
export function cancelEdgeGeneration(){stopEdgeSpeech();client.reset();resetPiper();}
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

export async function askGemma(object:GuideObject,question?:string,progress?:SetupProgress):Promise<string>{
  if(!client.ready)throw new Error('The guide is not ready. Please retry setup.');
  return client.request<string>('ask',{object,question},90000,progress);
}
export async function prepareNarration(text:string,progress?:(message:string)=>void):Promise<void>{
  if(cachedPiper?.text===text)return;
  await preparePiper(progress);
  const blob=await synthesizePiper(text);
  cachedPiper={text,blob};
}
export async function speakNarration(text:string,onDone:()=>void):Promise<void>{
  stopEdgeSpeech();
  const version=speechVersion;
  await prepareNarration(text);
  if(version!==speechVersion)return;
  await playBlob(cachedPiper!.blob,version);
  if(version===speechVersion)onDone();
}
