import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, AudioLines, Check, Compass, Mic, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import './style.css';
import {installEdge,isEdgeReady,speakEdge,stopEdgeSpeech,askGemma,supportsEdge,prepareEdgeSpeech,cancelEdgeGeneration} from './edge';
import {identifyStar,type VisibleStar} from './astronomy';
import {identifySolarObject,type SolarObject} from './ephemeris';
import {loadYaleCatalog,identifyYale,type YaleStar} from './yale';

type Screen = 'welcome' | 'setup' | 'point' | 'loading' | 'discovery' | 'listen';
type CelestialObject = { name: string; type: string; color: string; story: string };
const objects: CelestialObject[] = [
  { name: 'Antares', type: 'Red supergiant · Scorpius', color: '#f2a38a', story: 'Meet Antares, the red heart of Scorpius. Its name means rival of Mars, and its light has traveled hundreds of years to reach you. Looking up is a little like looking back in time.' },
  { name: 'Sirius', type: 'Bright star · Canis Major', color: '#d9e8ff', story: 'That brilliant light is Sirius, the brightest star in our night sky. Ancient Egyptians watched for its return as a sign of the coming Nile flood. One star, so many human stories.' },
  { name: 'Canopus', type: 'Bright star · Carina', color: '#fff0d4', story: 'You have found Canopus, one of the brightest stars in the sky. Travelers once used its light to navigate across the sea, long before GPS existed.' }
];
const Recognition = () => (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
  (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [index, setIndex] = useState(0);
  const [position,setPosition]=useState<{latitude:number;longitude:number}|null>(null);
  const [heading,setHeading]=useState<number|null>(null);
  const [tilt,setTilt]=useState<number|null>(null);
  const [star,setStar]=useState<VisibleStar|SolarObject|YaleStar|null>(null);
  const [skyError,setSkyError]=useState('');
  const [sensorPermission,setSensorPermission]=useState<'unknown'|'granted'|'denied'>('unknown');
  const [catalogCount,setCatalogCount]=useState(0);
  const [catalogError,setCatalogError]=useState('');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [notice, setNotice] = useState('');
  const [installing,setInstalling]=useState(false);
  const [setupMessage,setSetupMessage]=useState('Download a natural voice and a small local astronomy AI. These resources are saved by your browser for later visits. A Wi-Fi connection is recommended.');
  const [setupError,setSetupError]=useState('');
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const generation = useRef(0);
  const generating = useRef(false);
  const speechRequest = useRef(0);
  const [loadingMessage,setLoadingMessage]=useState('Writing your story…');
  const [loadingError,setLoadingError]=useState('');
  const [loadingSeconds,setLoadingSeconds]=useState(0);
  const [voiceLoading,setVoiceLoading]=useState(false);
  const lastRequest=useRef<{object:VisibleStar|SolarObject|YaleStar|CelestialObject;question?:string}|null>(null);
  const obj = star || objects[index];
  useEffect(()=>{loadYaleCatalog().then(setCatalogCount).catch(e=>setCatalogError(String(e instanceof Error?e.message:e)));},[]);
  useEffect(()=>{if(screen!=='point')return;navigator.geolocation?.getCurrentPosition(p=>setPosition({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>setSkyError('Enable location access to identify stars.'),{enableHighAccuracy:true,timeout:12000});},[screen]);
  useEffect(()=>{if(screen!=='point')return;const handler=(event:Event)=>{const e=event as DeviceOrientationEvent & {webkitCompassHeading?:number};if(typeof e.webkitCompassHeading==='number')setHeading(e.webkitCompassHeading);else if(e.absolute&&typeof e.alpha==='number')setHeading((360-e.alpha)%360);if(typeof e.beta==='number')setTilt(Math.max(0,Math.min(90,e.beta)));};window.addEventListener('deviceorientationabsolute',handler);window.addEventListener('deviceorientation',handler);return()=>{window.removeEventListener('deviceorientationabsolute',handler);window.removeEventListener('deviceorientation',handler);};},[screen]);
  async function enableSensors(){const ctor=window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {requestPermission?:()=>Promise<string>};if(!ctor){setSkyError('Motion sensors are not available in this browser.');return;}if(ctor.requestPermission){try{const permission=await ctor.requestPermission();setSensorPermission(permission==='granted'?'granted':'denied');setSkyError(permission==='granted'?'':'Motion access was denied. Enable motion access in your browser settings.');}catch{setSensorPermission('denied');setSkyError('Could not enable motion sensors.');}}else{setSensorPermission('granted');setSkyError('');}}
  async function beginSetup(){if(isEdgeReady()){setScreen('point');return;}setInstalling(true);setSetupError('');try{await installEdge(setSetupMessage);setScreen('point');}catch(e){setSetupError(e instanceof Error?e.message:String(e));}finally{setInstalling(false);}}
  async function generateNarrative(selected:VisibleStar|SolarObject|YaleStar|CelestialObject,q?:string){
    if(generating.current)return;
    generating.current=true;
    const request=++generation.current;
    lastRequest.current={object:selected,question:q};
    stopAudio();setNotice('');setLoadingError('');setLoadingSeconds(0);
    setLoadingMessage(q?'Thinking about your question…':'Writing your story…');
    setScreen('loading');
    const progress=(message:string)=>{if(request===generation.current)setLoadingMessage(message);};
    try{
      if(!isEdgeReady())await installEdge(progress);
      if(request!==generation.current)return;
      const story=await askGemma(selected,q,progress);
      if(request!==generation.current)return;
      let voiceReady=false;
      if(!muted){
        progress('Preparing narration…');setLoadingSeconds(0);
        try{await prepareEdgeSpeech(story);voiceReady=true;}
        catch(error){if(request===generation.current)setNotice('Your story is ready, but audio failed: '+String(error));}
      }
      if(request!==generation.current)return;
      setResponse(story);setScreen('discovery');
      if(voiceReady)void narrate(story);
    }catch(error){
      if(request===generation.current)setLoadingError(error instanceof Error?error.message:String(error));
    }finally{if(request===generation.current)generating.current=false;}
  }
  function selectStar(selected:VisibleStar|SolarObject|YaleStar){
    if(generating.current)return;
    setStar(selected);setResponse('');void generateNarrative(selected);
  }
  function cancelGeneration(){
    generation.current++;generating.current=false;cancelEdgeGeneration();stopAudio();
    setLoadingError('');setScreen(response?'discovery':'point');
  }
  function stopAudio(){speechRequest.current++;if(voiceLoading)cancelEdgeGeneration();stopEdgeSpeech();setSpeaking(false);setVoiceLoading(false);}
  useEffect(()=>{
    if(screen!=='loading'||loadingError)return;
    const clock=setInterval(()=>setLoadingSeconds(seconds=>seconds+1),1000);
    return()=>clearInterval(clock);
  },[screen,loadingError]);
  useEffect(()=>()=>{generation.current++;cancelEdgeGeneration();recognition.current?.stop();},[]);
  async function narrate(text:string){
    if(muted||!text)return;
    const request=++speechRequest.current;
    setVoiceLoading(true);setNotice('');
    try{
      if(!isEdgeReady())await installEdge(()=>{});
      if(request!==speechRequest.current)return;
      await prepareEdgeSpeech(text);
      if(request!==speechRequest.current)return;
      setVoiceLoading(false);setSpeaking(true);
      await speakEdge(text,()=>{if(request===speechRequest.current)setSpeaking(false);});
    }catch(error){if(request===speechRequest.current){setVoiceLoading(false);setSpeaking(false);setNotice(error instanceof Error?error.message:String(error));}}
  }
  function discover(){if(!position||heading===null||tilt===null){setSkyError('Waiting for location and orientation. Allow permissions, then point your phone at the sky and try again.');return;}const starMatch=catalogCount===9110?identifyYale(position.latitude,position.longitude,heading,tilt):identifyStar(position.latitude,position.longitude,heading,tilt);
    const solarMatch=identifySolarObject(position.latitude,position.longitude,heading,tilt);
    const match=!starMatch?solarMatch:!solarMatch?starMatch:(starMatch.separation??180)<=(solarMatch.separation??180)?starMatch:solarMatch;if(!match){setSkyError('No bright star, planet or Moon found near this direction. Try pointing toward a brighter object.');return;}selectStar(match);}
  function pointElsewhere() { generation.current++;stopAudio();setStar(null);setIndex(i => (i + 1) % objects.length); setScreen('point'); }
  function listen() {
    stopAudio(); setQuestion(''); setNotice(''); setScreen('listen');
    const Constructor = Recognition();
    if (!Constructor) { setNotice('Voice recognition is unavailable here. Type your question instead.'); return; }
    try {
      const rec = new Constructor(); rec.lang = 'en-US'; rec.interimResults = true;
      rec.onresult = e => setQuestion(Array.from(e.results).map(result => result[0].transcript).join(' '));
      rec.onerror = () => setNotice('Microphone unavailable. You can type your question instead.');
      recognition.current = rec; rec.start();
    } catch { setNotice('Microphone unavailable. You can type your question instead.'); }
  }
  function finishQuestion(){
    const q=question.trim();if(!q||generating.current)return;
    recognition.current?.stop();void generateNarrative(obj,q);
  }
  function cancelQuestion() { recognition.current?.stop(); setScreen('discovery'); }
  return <main className="app">
    <header className="topbar"><div className="logo"><span>✧</span> noxara</div></header>
    {screen === 'welcome' && <section className="screen welcome">
      <div className="sky welcome-sky"><div className="moon"/><div className="orbit one"/><div className="orbit two"/></div>
      <span className="eyebrow">A LITTLE CLOSER TO THE COSMOS</span>
      <h1>The universe has <em>stories to tell.</em></h1>
      <p>Point your phone at the night sky. Discover what you're seeing, and let the stars speak.</p>
      <button className="primary" onClick={() => setScreen('setup')}>Begin exploring <ArrowRight size={20}/></button>
      <small>No account. No distractions. Just the sky.</small>
    </section>}
    {screen === 'setup' && <section className="screen setup"><span className="eyebrow">PREPARE YOUR UNIVERSE</span><h1>Make the cosmos <em>yours.</em></h1><p>Noxara installs Kokoro first, then Gemma. Both models must download and initialize successfully before you can enter the sky experience. Installation requires an internet connection. Gemma uses WebGPU where available or attempts CPU / WebAssembly otherwise; CPU setup may be slow and memory-intensive. Both models must pass initialization before entering. Afterwards, cached models can run locally.</p><div className="narration"><div className="narration-heading"><AudioLines size={20}/> Your private, on-device guide</div><p role="status">{setupMessage}</p>{installing&&<progress className="setup-progress"/>}{setupError&&<p className="notice" role="alert">{setupError}</p>}</div><button className="primary" disabled={installing||!supportsEdge()} onClick={beginSetup}>{installing?'Installing resources…':'Install Kokoro & Gemma'} <ArrowRight size={19}/></button>{!supportsEdge()&&<p className="notice">This browser cannot run the local guide. Try an updated browser.</p>}<small>Downloads are cached by your browser and may need repeating if site data is cleared.</small></section>}
    {screen === 'point' && <section className="screen point">
      <span className="eyebrow">01 / LOOK UP</span><h1>Find something <em>wonderful.</em></h1>
      <p>Point the top of your phone toward the sky.</p>
      <div className="sky aim"><div className="ring outer"/><div className="ring inner"/><div className="cross">+</div><span>ALIGN WITH THE SKY</span></div>
      <p className="hint">Hold steady, then tap Done.</p>
      <p className="hint" role="status">{position?"Location ready":"Location pending"} · {heading===null?"Compass pending":Math.round(heading)+"° heading"} · {tilt===null?"Tilt pending":Math.round(tilt)+"° tilt"}</p>
      {sensorPermission!=='granted'&&<button className="secondary" onClick={enableSensors}>Enable motion sensors</button>}
      <p className="hint">{catalogCount===9110?"Yale catalogue ready · 9,110 records":"Bright-star fallback active"}</p>
      {catalogError&&<p className="notice" role="status">{catalogError}</p>}
      {skyError&&<p className="notice" role="status">{skyError}</p>}
      <button className="primary" onClick={discover}>Done <Check size={20}/></button>
    </section>}
    {screen === 'loading' && <section className="screen loading-screen" aria-busy={!loadingError}>
      <span className="eyebrow">A STORY IS TAKING SHAPE</span>
      <h1>A moment <em>with the stars.</em></h1>
      {!loadingError&&<><div className="story-loader" aria-hidden="true"/><p className="hint" role="status">{loadingMessage}</p><p className="hint">{loadingSeconds < 15 ? 'Your guide is preparing this discovery.' : 'This device is taking a little longer. You can cancel at any time.'}</p></>}
      {loadingError&&<><p className="notice" role="alert">{loadingError}</p><button className="primary" onClick={()=>{const request=lastRequest.current;if(request)void generateNarrative(request.object,request.question);}}>Try again <RotateCcw size={18}/></button></>}
      <button className="secondary" onClick={cancelGeneration}>{loadingError?'Go back':'Cancel'}</button>
    </section>}
    {screen === 'discovery' && <section className="screen discovery">
      <span className="eyebrow">YOU'VE DISCOVERED</span><h1>{obj.name}</h1><p>{obj.type}</p>
      <div className="sky object"><div className="celestial" style={{ background: obj.color, boxShadow: '0 0 38px 16px ' + obj.color + '55, 0 0 100px 55px ' + obj.color + '22' }}/></div>
      <div className="narration">
        <div className="narration-heading"><AudioLines size={20}/><span>{voiceLoading ? 'Preparing narration…' : speaking ? 'Noxara is speaking…' : 'A story from the sky'}</span>
          <button className="icon-button" aria-label={muted ? 'Unmute narration' : 'Mute narration'} onClick={() => { stopAudio(); setMuted(m => !m); }}>{muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button>
        </div>
        <p>{response}</p>
        {notice&&<p className="notice" role="status">{notice}</p>}
        <button className="replay" disabled={voiceLoading} onClick={() => narrate(response)}><RotateCcw size={15}/> Hear it again</button>
      </div>
      <div className="actions"><button className="primary" onClick={listen}><Mic size={19}/> Ask a question</button><button className="secondary" onClick={pointElsewhere}><Compass size={19}/> Point elsewhere</button></div>
    </section>}
    {screen === 'listen' && <section className="screen listen">
      <button className="back" onClick={cancelQuestion}><ArrowLeft size={17}/> Back</button>
      <span className="eyebrow">ASK ABOUT {obj.name.toUpperCase()}</span><h1>What makes you <em>curious?</em></h1>
      <div className="listening-art"><div className="pulse a"/><div className="pulse b"/><div className="mic"><Mic size={36}/></div></div>
      <p className="hint">Speak naturally, or type your question.</p>
      <textarea aria-label="Your question" placeholder={'What would you like to know about ' + obj.name + '?'} value={question} onChange={e => setQuestion(e.target.value)} rows={3}/>
      {notice && <p className="notice" role="status">{notice}</p>}
      <button className="primary" disabled={!question.trim()} onClick={finishQuestion}>Done speaking <Check size={19}/></button>
      <button className="secondary" onClick={cancelQuestion}>Cancel</button>
    </section>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);

