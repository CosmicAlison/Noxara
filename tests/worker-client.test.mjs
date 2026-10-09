import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelWorkerClient} from '../src/worker-client.ts';
class FakeWorker {
  onmessage=null; onerror=null; onmessageerror=null; sent=[]; terminated=false;
  postMessage(message){this.sent.push(message);}
  terminate(){this.terminated=true;}
  reply(message){this.onmessage?.({data:message});}
}
function fixture(){const workers=[];const client=new ModelWorkerClient(()=>{const w=new FakeWorker();workers.push(w);return w;});return {client,workers};}
test('worker forwards progress and returns results without overlapping inference',async()=>{
  const {client,workers}=fixture();const progress=[];
  const result=client.request('ask',{},1000,message=>progress.push(message));
  await assert.rejects(client.request('ask',{},1000),/already working/);
  const worker=workers[0],id=worker.sent[0].id;
  worker.reply({id,progress:'Writing your story…'});
  worker.reply({id,result:'A sourced narrative.'});
  assert.equal(await result,'A sourced narrative.');assert.deepEqual(progress,['Writing your story…']);
});
test('cancellation terminates work and late results cannot complete another request',async()=>{
  const {client,workers}=fixture();client.ready=true;
  const first=client.request('ask',{},1000);client.reset();
  await assert.rejects(first,/cancelled/);assert.equal(client.ready,false);assert.equal(workers[0].terminated,true);
  const next=client.request('ask',{},1000);const id=workers[1].sent[0].id;
  workers[0].reply({id:workers[0].sent[0].id,result:'stale'});
  workers[1].reply({id,result:'current'});assert.equal(await next,'current');
});
test('timeout terminates computation rather than leaving a late narration running',async()=>{
  const {client,workers}=fixture();client.ready=true;
  await assert.rejects(client.request('voice',{},5),/too long/);
  assert.equal(workers[0].terminated,true);assert.equal(client.ready,false);
});
test('worker crash rejects pending request and can restart',async()=>{
  const {client,workers}=fixture();const first=client.request('ask',{},1000);
  workers[0].onerror();await assert.rejects(first,/stopped unexpectedly/);
  const next=client.request('install',{},1000);workers[1].reply({id:workers[1].sent[0].id,result:true});
  assert.equal(await next,true);
});
