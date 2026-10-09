// Browser-only inference. Models are downloaded on demand and cached by the browser.
export type SetupProgress = (message:string)=>void;
const KOKORO='onnx-community/Kokoro-82M-v1.0-ONNX';
const GEMMA='onnx-community/gemma-3-270m-it-ONNX';
let tts: any;
let generator: any;
let audio: HTMLAudioElement|null=null;
let audioUrl: string|null=null;
export function supportsEdge(){return typeof navigator!=='undefined' && 'gpu' in navigator;}
export async function installEdge(progress:SetupProgress){
  if(!supportsEdge())throw new Error('This device/browser does not expose WebGPU. Please use an updated Chrome browser with WebGPU support.');
  progress('Downloading the Noxara voice. Keep this page open…');
  const {KokoroTTS}=await import('kokoro-js');
  tts=await KokoroTTS.from_pretrained(KOKORO,{device:'wasm',dtype:'q8'});
  progress('Voice ready. Downloading Gemma; this may take several minutes…');
  const {pipeline}=await import('@huggingface/transformers');
  generator=await pipeline('text-generation',GEMMA,{device:'webgpu',dtype:'q4f16'});
  progress('Warming up the models…');
  await generator([{role:'user',content:'Say ready.'}],{max_new_tokens:8,do_sample:false});
  progress('Ready to explore.');
}
export function isEdgeReady(){return Boolean(tts&&generator);}
export function stopEdgeSpeech(){if(audio){audio.pause();audio.src='';audio=null;}if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}}
export async function speakEdge(text:string,onDone:()=>void){
  if(!tts)throw new Error('Noxara voice is not installed.');
  stopEdgeSpeech();
  const output=await tts.generate(text,{voice:'af_heart'});
  const blob=output.toBlob();
  audioUrl=URL.createObjectURL(blob);
  audio=new Audio(audioUrl);
  audio.onended=onDone;
  audio.onerror=onDone;
  await audio.play();
}
export async function askGemma(name:string,type:string,facts:string,question?:string){
  if(!generator)throw new Error('Gemma is not installed.');
  const prompt='You are Noxara, a warm, concise astronomy storyteller. Speak naturally in 2-4 short sentences. Only assert facts supported by the supplied verified object data; never invent distances, dates, mythology or physical properties. If asked for unknown details, say you cannot verify them. Object: '+name+'. Classification: '+type+'. Verified context: '+facts+'. '+(question?'User asks: '+question:'Introduce this object poetically.');
  const result=await generator([{role:'user',content:prompt}],{max_new_tokens:130,do_sample:false});
  const messages=result?.[0]?.generated_text;
  const answer=Array.isArray(messages)?messages[messages.length - 1]?.content:String(messages??'');
  return typeof answer==='string'&&answer.trim()?answer.trim():facts;
}
