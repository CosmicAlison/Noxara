// Piper runs in its own worker so slow neural voice synthesis cannot block Gemma.
import * as piper from '@mintplex-labs/piper-tts-web';
const VOICE='en_US-hfc_female-medium';
let ready=false;
let busy=false;
self.onmessage=async(event:MessageEvent)=>{
  const {id,task,payload}=event.data as {id:number;task:string;payload?:{text:string}};
  const progress=(message:string)=>self.postMessage({id,progress:message});
  if(busy){self.postMessage({id,error:'Piper is already generating speech.'});return;}
  busy=true;
  try{
    if(task==='install'){
      if(!ready){
        progress('Downloading Piper voice for offline use…');
        await piper.download(VOICE,(event:{loaded:number;total:number})=>{
          if(event.total>0)progress('Piper download: '+Math.round(100*event.loaded/event.total)+'%');
        });
        ready=true;
      }
      self.postMessage({id,result:true});
    }else if(task==='voice'){
      if(!ready)throw new Error('Piper voice has not been prepared.');
      const text=payload?.text?.trim();
      if(!text)throw new Error('Cannot synthesize an empty narration.');
      const blob=await piper.predict({text,voiceId:VOICE});
      self.postMessage({id,result:blob});
    }else throw new Error('Unknown Piper task.');
  }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
  finally{busy=false;}
};
