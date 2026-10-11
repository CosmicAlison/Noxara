import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('first launch requires Gemma and Piper before entering the guide',()=>{
 const edge=read('src/edge.ts');
 const main=read('src/main.tsx');
 assert.match(edge,/return client\.ready && isPiperReady\(\)/);
 assert.match(edge,/await preparePiper\(progress\)/);
 assert.match(main,/async function beginSetup\(\)\{if\(isGuideReady\(\)\)/);
 assert.match(main,/if\(!isGuideReady\(\)\)await installEdge\(progress\)/);
 assert.match(main,/Install guide & voice/);
 assert.doesNotMatch(main,/Piper downloads its offline voice on first use/);
});
