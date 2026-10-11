import {ModelWorkerClient} from './worker-client';
const client=new ModelWorkerClient(()=>new Worker(new URL('./piper.worker.ts',import.meta.url),{type:'module'}));
let preparation:Promise<void>|null=null;
export function preparePiper(progress?:(message:string)=>void):Promise<void>{
  if(client.ready)return Promise.resolve();
  if(preparation)return preparation;
  preparation=client.request<boolean>('install',null,5*60*1000,progress).then(()=>{
    client.ready=true;
  }).catch(error=>{client.reset();throw error;}).finally(()=>{preparation=null;});
  return preparation;
}
export async function synthesizePiper(text:string):Promise<Blob>{
  await preparePiper();
  return client.request<Blob>('voice',{text},90000);
}
export function resetPiper(){client.reset();preparation=null;}
