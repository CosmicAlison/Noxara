// Browser-only inference. Models are downloaded on demand and cached by the browser.
export type SetupProgress = (message:string)=>void;
function reportDownload(progress:SetupProgress,model:string,event:any){
  if(event.status==='progress' && typeof event.progress==='number')progress(model+' download: '+Math.round(event.progress)+'%'+(event.file?' — '+event.file:''));
  else if(event.status==='initiate')progress(model+': fetching '+(event.file||'model resources'));
  else if(event.status==='done')progress(model+': cached '+(event.file||'model resource'));
}
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
  progress('Step 1 of 2 — downloading Kokoro voice. Keep this page open…');
  const {KokoroTTS}=await import('kokoro-js');
  tts=await KokoroTTS.from_pretrained(KOKORO,{device:'wasm',dtype:'q8',progress_callback:(event:any)=>reportDownload(progress,'Kokoro',event)});
  progress('Kokoro installed. Step 2 of 2 — preparing Gemma…');
  const gpuAvailable=await hasWebGPU();
  const backend=gpuAvailable?'webgpu':'wasm';
  const precision=gpuAvailable?'q4f16':'fp32';
  progress('Gemma: using '+(gpuAvailable?'WebGPU':'CPU / WebAssembly')+' ('+precision+'). Downloading model files…');
  try{
    const {pipeline}=await import('@huggingface/transformers');
    generator=await pipeline('text-generation',GEMMA,{
      device:backend,dtype:precision,
      progress_callback:(event:any)=>reportDownload(progress,'Gemma',event)
    });
    progress('Gemma downloaded. Testing local '+(gpuAvailable?'GPU':'CPU')+' inference…');
    const test=await generator([{role:'user',content:'Say ready.'}],{max_new_tokens:4,do_sample:false});
    if(!test?.length)throw new Error('Gemma returned no test output.');
    progress('Kokoro and Gemma both ready. Entering Noxara…');
  }catch(error){
    generator=null;
    throw new Error('Gemma '+backend+' setup failed: '+String(error)+'. Kokoro is cached; retry setup or use a more capable device.');
  }
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
