export type StarFact = {
  properName?: string|null;
  name?: string|null;
  constellation?: string|null;
  constellationName?: string|null;
  bayerDesignation?: string|null;
  flamsteedNumber?: number|null;
  spectralType?: string|null;
  distanceLy?: number|null;
  temperatureK?: number|null;
  temperatureIsApproximate?: boolean;
  funFact?: {title?:string;text?:string;sourceUrls?:string[];editorialStatus?:string}|null;
  notableFacts?: {text:string;sourceUrl?:string}[];
};
let facts: Record<string,StarFact> = {};
let pending: Promise<number>|null = null;
export function loadStarFacts(): Promise<number> {
  if(pending)return pending;
  pending=fetch(import.meta.env.BASE_URL+'star-facts.json').then(async r=>{
    if(!r.ok)throw new Error('Star facts file unavailable');
    const data:unknown=await r.json();
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==9110)
      throw new Error('Invalid star facts catalogue: expected 9,110 HR entries');
    facts=data as Record<string,StarFact>;
    return Object.keys(facts).length;
  }).catch(e=>{pending=null;throw e;});
  return pending;
}
export function getStarFact(hr:number):StarFact|null{return facts[String(hr)]??null;}
export function describeStar(hr:number,magnitude:number):{name:string;type:string;story:string}{
  const f=getStarFact(hr);
  const name=f?.name||f?.properName||('HR '+hr);
  const type=[f?.spectralType?('Spectral type '+f.spectralType):null,f?.constellationName||f?.constellation].filter(Boolean).join(' · ')||'Yale Bright Star Catalogue';
  const parts=[name+' (HR '+hr+') is a star'+(f?.constellationName?' in '+f.constellationName:'')+'.',
    'Its apparent visual magnitude is '+magnitude.toFixed(2)+'.'];
  if(typeof f?.distanceLy==='number'&&Number.isFinite(f.distanceLy)&&f.distanceLy>0)
    parts.push('It is approximately '+Math.round(f.distanceLy*10)/10+' light-years away.');
  if(f?.spectralType)parts.push('Its spectral classification is '+f.spectralType+'.');
  if(typeof f?.temperatureK==='number'&&f.temperatureK>0)
    parts.push('Its '+(f.temperatureIsApproximate?'estimated ':'')+'temperature is '+f.temperatureK+' kelvin.');
  if(f?.funFact?.text)parts.push('Curated background (draft): '+f.funFact.text);
  else if(f?.notableFacts?.length)parts.push(...f.notableFacts.slice(0,2).map(x=>x.text));
  return {name,type,story:parts.join(' ')};
}
