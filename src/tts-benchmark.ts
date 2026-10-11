export type VoiceEngine='piper'|'kokoro';
export type VoiceMeasurement={engine:VoiceEngine;milliseconds:number;characters:number;charactersPerSecond:number};
export const BENCHMARK_TEXT='Look up at Sirius. Its light has crossed the vast darkness to reach your eyes tonight.';
export function measurement(engine:VoiceEngine,milliseconds:number,characters:number):VoiceMeasurement{
  if(!Number.isFinite(milliseconds)||milliseconds<0||!Number.isFinite(characters)||characters<=0)
    throw new Error('Invalid voice benchmark sample.');
  return {engine,milliseconds,characters,charactersPerSecond:milliseconds===0?0:characters/(milliseconds/1000)};
}
export function comparison(piper:VoiceMeasurement,kokoro:VoiceMeasurement):string{
  if(piper.engine!=='piper'||kokoro.engine!=='kokoro')throw new Error('Expected Piper and Kokoro results.');
  if(piper.milliseconds===0||kokoro.milliseconds===0)return 'Timing resolution was insufficient.';
  const ratio=kokoro.milliseconds/piper.milliseconds;
  return ratio>=1?'Piper synthesized '+ratio.toFixed(1)+'× faster than Kokoro.':'Kokoro synthesized '+(1/ratio).toFixed(1)+'× faster than Piper.';
}
