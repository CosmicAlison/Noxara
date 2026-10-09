// One model operation at a time; termination really stops work on cancel/timeout.
export type WorkerReply = {id:number; progress?:string; result?:unknown; error?:string};
type WorkerLike = Pick<Worker, 'postMessage'|'terminate'|'onmessage'|'onerror'|'onmessageerror'>;
export class ModelWorkerClient {
  private worker:WorkerLike|null=null;
  private sequence=0;
  private pending:{id:number; resolve:(value:unknown)=>void; reject:(reason:Error)=>void; timer:ReturnType<typeof setTimeout>; progress?:(message:string)=>void}|null=null;
  ready=false;
  private createWorker:()=>WorkerLike;
  constructor(createWorker:()=>WorkerLike) {this.createWorker=createWorker;}
  request<T>(task:string,payload:unknown,timeoutMs:number,progress?:(message:string)=>void):Promise<T>{
    if(this.pending)return Promise.reject(new Error('The guide is already working. Please wait or cancel.'));
    if(!this.worker){
      this.worker=this.createWorker();
      this.worker.onmessage=event=>{
        const data=event.data as WorkerReply;
        const pending=this.pending;
        if(!pending||data.id!==pending.id)return;
        if(data.progress!==undefined){pending.progress?.(data.progress);return;}
        clearTimeout(pending.timer);this.pending=null;
        if(data.error)pending.reject(new Error(data.error));
        else pending.resolve(data.result);
      };
      this.worker.onerror=()=>this.reset(new Error('The local guide stopped unexpectedly. Please retry.'));
      this.worker.onmessageerror=()=>this.reset(new Error('Could not read the guide response. Please retry.'));
    }
    return new Promise<T>((resolve,reject)=>{
      const id=++this.sequence;
      const timer=setTimeout(()=>this.reset(new Error('The local guide took too long on this device. Please retry.')),timeoutMs);
      this.pending={id,resolve:resolve as (value:unknown)=>void,reject,timer,progress};
      try{this.worker!.postMessage({id,task,payload});}catch(error){this.reset(error instanceof Error?error:new Error(String(error)));}
    });
  }
  reset(reason=new Error('Generation cancelled.')){
    this.worker?.terminate();this.worker=null;this.ready=false;
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(reason);this.pending=null;}
  }
}
