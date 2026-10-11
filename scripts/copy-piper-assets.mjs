import {mkdir,readdir,copyFile,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
const destination='public/piper-runtime';
async function packageDir(name){
  let dir=dirname(require.resolve(name));
  for(let depth=0;depth<8;depth++,dir=dirname(dir)){
    try{const pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));if(pkg.name===name)return dir;}catch{}
  }
  throw new Error('Could not locate '+name+' package root.');
}
const phonemizer=await packageDir('@diffusionstudio/piper-wasm');
const onnx=await packageDir('onnxruntime-web');
await mkdir(join(destination,'onnx'),{recursive:true});
for(const ext of ['.wasm','.data']){
  const name='piper_phonemize'+ext;
  await copyFile(join(phonemizer,'build',name),join(destination,name));
}
const wasmFiles=(await readdir(join(onnx,'dist'))).filter(file=>file.startsWith('ort-wasm')&&file.endsWith('.wasm'));
if(!wasmFiles.length)throw new Error('ONNX runtime WASM assets are missing.');
await Promise.all(wasmFiles.map(name=>copyFile(join(onnx,'dist',name),join(destination,'onnx',name))));
console.log('Bundled '+wasmFiles.length+' ONNX WASM files and Piper phonemizer assets.');
