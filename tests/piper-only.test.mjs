import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Piper is the only narration engine in the app',()=>{
 const edge=read('src/edge.ts');
 const worker=read('src/edge.worker.ts');
 const main=read('src/main.tsx');
 const pkg=JSON.parse(read('package.json'));
 assert.match(edge,/synthesizePiper/);
 assert.match(main,/speakNarration/);
 assert.doesNotMatch(edge+worker+main,/kokoro|Kokoro|benchmarkVoices|chooseVoice|voiceEngine/);
 assert.equal(pkg.dependencies['kokoro-js'],undefined);
});
