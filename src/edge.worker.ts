import {getStarFacts, objectContext, gemmaPrompt, type GuideObject} from './star-facts';
type SetupProgress = (message:string)=>void;
function reportDownload(progress:SetupProgress,model:string,event:any){
  if(event.status==='progress' && typeof event.progress==='number')progress(model+' download: '+Math.round(event.progress)+'%'+(event.file?' — '+event.file:''));
  else if(event.status==='initiate')progress(model+': fetching '+(event.file||'model resources'));
  else if(event.status==='done')progress(model+': cached '+(event.file||'model resource'));
}
const KOKORO='onnx-community/Kokoro-82M-v1.0-ONNX';
const GEMMA='onnx-community/gemma-3-270m-it-ONNX';
let tts: any;
let generator: any;
async function hasWebGPU(){try{const gpu=(navigator as Navigator & {gpu?:{requestAdapter:()=>Promise<unknown>}}).gpu;return Boolean(gpu && await gpu.requestAdapter());}catch{return false;}}
async function installEdge(progress:SetupProgress){
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
    readAnswer(test);
    progress('Testing narration…');
    await tts.generate('Ready.',{voice:'af_heart'});
    progress('Kokoro and Gemma both ready. Entering Noxara…');
  }catch(error){
    generator=null;
    throw new Error('Local guide '+backend+' setup failed: '+String(error)+'. Kokoro is cached; retry setup or use a more capable device.');
  }
}

function readAnswer(result:any):string {
  const messages=result?.[0]?.generated_text;
  const answer=Array.isArray(messages)?messages[messages.length-1]?.content:messages;
  if(typeof answer!=='string'||!answer.trim()||/<unused\d+>/.test(answer))throw new Error('Gemma did not produce a usable narrative. Please retry.');
  return answer.trim();
}
let busy=false;
self.onmessage=async(event:MessageEvent)=>{
  const {id,task,payload}=event.data;
  const progress=(message:string)=>self.postMessage({id,progress:message});
  if(busy){self.postMessage({id,error:'The guide is busy.'});return;}
  busy=true;
  try{
    let result:unknown;
    if(task==='install'){
      await installEdge(progress);
      result=true;
    }else if(task==='ask'){
      if(!generator)throw new Error('Gemma is not ready. Please retry setup.');
      const {object,question}=payload as {object:GuideObject;question?:string};
      progress('Reading star facts…');
      const facts=object.hr===undefined?null:await getStarFacts(object.hr).catch(()=>null);
      progress(question?'Thinking about your question…':'Writing your story…');
      result=readAnswer(await generator([{role:'user',content:gemmaPrompt(object,objectContext(object,facts),question)}],{max_new_tokens:96,do_sample:false}));
    }else if(task==='voice'){
      if(!tts)throw new Error('The voice is not ready. Please retry setup.');
      result=(await tts.generate(payload.text,{voice:'af_heart'})).toBlob();
    }else throw new Error('Unknown guide operation.');
    self.postMessage({id,result});
  }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
  finally{busy=false;}
};
