import type {GuideObject} from './star-facts';
import {ModelWorkerClient} from './worker-client';
export type SetupProgress = (message:string)=>void;
const client=new ModelWorkerClient(()=>new Worker(new URL('./edge.worker.ts',import.meta.url),{type:'module'}));
let audio:HTMLAudioElement|null=null;
let audioUrl:string|null=null;
let speechVersion=0;
// Keep only the last narration: replay should not run Kokoro again.
let cachedVoice:{text:string;blob:Blob}|null=null;
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
export function cancelEdgeGeneration(){stopEdgeSpeech();client.reset();}
export async function prepareEdgeSpeech(text:string):Promise<void>{
  if(cachedVoice?.text===text)return;
  const blob=await client.request<Blob>('voice',{text},60000);
  cachedVoice={text,blob};
}
export async function speakEdge(text:string,onDone:()=>void){
  stopEdgeSpeech();
  const version=speechVersion;
  await prepareEdgeSpeech(text);
  if(version!==speechVersion)return; // Mute/navigation must suppress late audio.
  audioUrl=URL.createObjectURL(cachedVoice!.blob);
  const player=new Audio(audioUrl);audio=player;
  player.onended=()=>{if(version===speechVersion){stopEdgeSpeech();onDone();}};
  player.onerror=()=>{if(version===speechVersion){stopEdgeSpeech();onDone();}};
  try{await player.play();}catch(error){
    if(version!==speechVersion)return;
    stopEdgeSpeech();
    if(error instanceof DOMException&&error.name==='NotAllowedError')throw new Error('Tap Hear it again to play the narration. Your browser blocked automatic playback.');
    throw error;
  }
}
export async function askGemma(object:GuideObject,question?:string,progress?:SetupProgress):Promise<string>{
  if(!client.ready)throw new Error('The guide is not ready. Please retry setup.');
  return client.request<string>('ask',{object,question},90000,progress);
}
