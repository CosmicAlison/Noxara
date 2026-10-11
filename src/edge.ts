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
  progress('Kokoro downloaded. Testing local voice synthesis…');
  try {
    const probe=await tts.generate('Ready.',{voice:'af_heart'});
    if(!probe.toBlob().size)throw new Error('Kokoro generated empty audio.');
  } catch(e) { tts=null; throw new Error('Kokoro voice test failed: '+String(e)); }
  progress('Kokoro voice test passed. Step 2 of 2 — preparing Gemma…');
  const gpuAvailable=await hasWebGPU();
  const {pipeline}=await import('@huggingface/transformers');
  const attempts: Array<{device:'webgpu'|'wasm';dtype:'q4f16'|'fp32'}> = gpuAvailable
    ? [{device:'webgpu',dtype:'q4f16'},{device:'wasm',dtype:'fp32'}]
    : [{device:'wasm',dtype:'fp32'}];
  const failures:string[]=[];
  for(const {device,dtype} of attempts){
    try{
      generator=null;
      progress('Gemma: loading '+device+' ('+dtype+'). Keep this page open…');
      const candidate=await pipeline('text-generation',GEMMA,{
        device,dtype,progress_callback:(event:any)=>reportDownload(progress,'Gemma',event)
      });
      progress('Gemma loaded. Testing '+device+' inference…');
      const test=await candidate([{role:'user',content:'Say ready.'}],{max_new_tokens:4,do_sample:false});
      if(!test?.length)throw new Error('Gemma returned no test output.');
      generator=candidate;
      progress('Kokoro and Gemma both passed inference tests. Entering Noxara…');
      return;
    }catch(e){
      failures.push(device+': '+String(e));
      progress('Gemma '+device+' failed; '+(device==='webgpu'?'retrying on CPU / WebAssembly…':'setup could not complete.'));
    }
  }
  generator=null;
  throw new Error('Gemma initialization failed. '+failures.join(' | '));
}
export function isEdgeReady(){return Boolean(tts&&generator);}
let speechGeneration=0;
/** Small chunks keep CPU/WASM synthesis responsive on mid-range Android phones. */
function speechChunks(text:string,maxChars=105):string[]{
  const sentences=(text.match(/[^.!?]+(?:[.!?]+|$)/g)||[text]).map(s=>s.trim()).filter(Boolean);
  const chunks:string[]=[];
  for(const sentence of sentences){
    const words=sentence.split(/\s+/);
    let current='';
    for(const word of words){
      if(current && (current.length+word.length+1>maxChars)){
        chunks.push(current);current='';
      }
      current+=(current?' ':'')+word;
    }
    if(current)chunks.push(current);
  }
  return chunks;
}
export function stopEdgeSpeech(){
  speechGeneration++;
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}
  if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}
}
async function playSpeechBlob(blob:Blob,generation:number):Promise<void>{
  if(generation!==speechGeneration)return;
  const url=URL.createObjectURL(blob);
  const player=new Audio(url);
  audio=player;audioUrl=url;
  try{
    await new Promise<void>((resolve,reject)=>{
      player.onended=()=>resolve();
      player.onerror=()=>reject(new Error('Android audio playback failed.'));
      player.play().catch(reject);
    });
  }finally{
    player.pause();player.onended=null;player.onerror=null;
    if(audio===player)audio=null;
    if(audioUrl===url)audioUrl=null;
    URL.revokeObjectURL(url);
  }
}
export async function speakEdge(text:string,onDone:()=>void,onStatus?:(message:string)=>void){
  if(!tts)throw new Error('Noxara voice is not installed.');
  stopEdgeSpeech();
  const generation=speechGeneration;
  const chunks=speechChunks(text);
  if(!chunks.length){onDone();return;}
  try{
    for(let i=0;i<chunks.length;i++){
      if(generation!==speechGeneration)return;
      onStatus?.('Generating voice · '+(i+1)+' of '+chunks.length+'…');
      const started=performance.now();
      const output=await tts.generate(chunks[i],{voice:'af_heart'});
      if(generation!==speechGeneration)return;
      const blob=output.toBlob();
      if(!blob.size)throw new Error('Kokoro produced empty audio for chunk '+(i+1)+'.');
      onStatus?.('Playing '+(i+1)+' of '+chunks.length+' · generated in '+Math.round((performance.now()-started)/1000)+'s');
      await playSpeechBlob(blob,generation);
    }
    if(generation===speechGeneration)onDone();
  }catch(e){
    if(generation===speechGeneration)throw e;
  }
}
export async function askGemma(name:string,type:string,facts:string,question?:string){
  if(!generator)throw new Error('Gemma is not installed.');
  const prompt='You are Noxara, a warm, concise astronomy storyteller. Speak naturally in 2-4 short sentences. Only assert facts supported by the supplied verified object data; never invent distances, dates, mythology or physical properties. Speak with wonder, not like a scientific disclaimer. When a number is an estimate, naturally say about, roughly, or approximately once. Never say phrases such as 'not a measured temperature', 'this is an estimate rather than a measurement', or discuss uncertainty methodology unless specifically asked. If asked for an unknown detail, briefly say it is unknown. Object: '+name+'. Classification: '+type+'. Verified context: '+facts+'. '+(question?'User asks: '+question:'Introduce this object poetically.');
  const result=await generator([{role:'user',content:prompt}],{max_new_tokens:130,do_sample:false});
  const messages=result?.[0]?.generated_text;
  const answer=Array.isArray(messages)?messages[messages.length - 1]?.content:String(messages??'');
  return typeof answer==='string'&&answer.trim()?answer.trim():facts;
}
