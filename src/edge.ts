// Browser-only inference. Models are downloaded on demand and cached by the browser.
export type SetupProgress = (message:string)=>void;
const KOKORO='onnx-community/Kokoro-82M-v1.0-ONNX';
const GEMMA='onnx-community/gemma-3-270m-it-ONNX';
let tts: any;
let generator: any;
let audio: HTMLAudioElement|null=null;
let audioUrl: string|null=null;
export function supportsEdge(){return typeof WebAssembly!=='undefined';}
async function hasWebGPU(){try{const gpu=(navigator as Navigator & {gpu?:{requestAdapter:()=>Promise<unknown>}}).gpu;return Boolean(gpu && await gpu.requestAdapter());}catch{return false;}}
export async function installEdge(progress:SetupProgress){
  if(!supportsEdge())throw new Error('WebAssembly is unavailable in this browser.');
  progress('Downloading the Noxara voice. Keep this page open…');
  const {KokoroTTS}=await import('kokoro-js');
  tts=await KokoroTTS.from_pretrained(KOKORO,{device:'wasm',dtype:'q8'});
  const gpuAvailable=await hasWebGPU();
  if(!gpuAvailable){
    progress('Voice installed. This browser has no working WebGPU adapter, so Gemma is unavailable. You can still explore and hear the verified astronomy stories.');
    return;
  }
  progress('Voice ready. Preparing Gemma for GPU inference…');
  try{
    const {pipeline}=await import('@huggingface/transformers');
    generator=await pipeline('text-generation',GEMMA,{
      device:'webgpu',dtype:'q4f16',
      progress_callback:(event:any)=>{
        if(event.status==='progress' && typeof event.progress==='number')progress('Downloading Gemma: '+Math.round(event.progress)+'%'+(event.file?' — '+event.file:''));
        else if(event.status==='initiate')progress('Fetching Gemma resource: '+(event.file||'model files'));
        else if(event.status==='done')progress('Cached: '+(event.file||'model resource'));
      }
    });
    progress('Warming up Gemma…');
    await generator([{role:'user',content:'Say ready.'}],{max_new_tokens:8,do_sample:false});
    progress('Voice and Gemma ready to explore.');
  }catch(error){
    generator=null;
    progress('Voice installed. Gemma could not start on this browser: '+String(error)+'. Verified stories remain available.');
  }
}
export function isEdgeReady(){return Boolean(tts);}
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
  if(!generator)return question?'I can share this verified information about '+name+': '+facts+' I cannot answer additional questions without the local AI model.':facts;
  const prompt='You are Noxara, a warm, concise astronomy storyteller. Speak naturally in 2-4 short sentences. Only assert facts supported by the supplied verified object data; never invent distances, dates, mythology or physical properties. If asked for unknown details, say you cannot verify them. Object: '+name+'. Classification: '+type+'. Verified context: '+facts+'. '+(question?'User asks: '+question:'Introduce this object poetically.');
  const result=await generator([{role:'user',content:prompt}],{max_new_tokens:130,do_sample:false});
  const messages=result?.[0]?.generated_text;
  const answer=Array.isArray(messages)?messages[messages.length - 1]?.content:String(messages??'');
  return typeof answer==='string'&&answer.trim()?answer.trim():facts;
}
