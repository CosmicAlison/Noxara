import {mkdir,readdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
const destination='public/piper-runtime';
const phonemizer=dirname(require.resolve('@diffusionstudio/piper-wasm/package.json'));
const onnx=dirname(require.resolve('onnxruntime-web/package.json'));
await mkdir(join(destination,'onnx'),{recursive:true});
for(const ext of ['.wasm','.data']){
  const name='piper_phonemize'+ext;
  await copyFile(join(phonemizer,'build',name),join(destination,name));
}
const wasmFiles=(await readdir(join(onnx,'dist'))).filter(file=>file.startsWith('ort-wasm')&&file.endsWith('.wasm'));
if(!wasmFiles.length)throw new Error('ONNX runtime WASM assets are missing.');
await Promise.all(wasmFiles.map(name=>copyFile(join(onnx,'dist',name),join(destination,'onnx',name))));
console.log('Bundled '+wasmFiles.length+' ONNX WASM files and Piper phonemizer assets.');
