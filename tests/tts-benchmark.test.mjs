import test from 'node:test';
import assert from 'node:assert/strict';
import {BENCHMARK_TEXT,measurement,comparison} from '../src/tts-benchmark.ts';
test('benchmark uses the same nonempty narration for both engines',()=>{
 assert.ok(BENCHMARK_TEXT.length>50);
 const p=measurement('piper',2000,BENCHMARK_TEXT.length);
 const k=measurement('kokoro',30000,BENCHMARK_TEXT.length);
 assert.equal(p.characters,k.characters);
 assert.equal(p.charactersPerSecond,BENCHMARK_TEXT.length/2);
 assert.match(comparison(p,k),/15.0× faster/);
});
test('benchmark reports the actual winner and validates inputs',()=>{
 assert.match(comparison(measurement('piper',4000,20),measurement('kokoro',2000,20)),/Kokoro synthesized 2.0×/);
 assert.throws(()=>measurement('piper',-1,10),/Invalid/);
 assert.throws(()=>measurement('piper',100,0),/Invalid/);
 assert.throws(()=>comparison(measurement('kokoro',1,10),measurement('piper',2,10)),/Expected/);
});
