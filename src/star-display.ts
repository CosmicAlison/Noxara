import type {GuideObject,StarFacts} from './star-facts';
const greek:Record<string,string>={'α':'Alpha','β':'Beta','γ':'Gamma','δ':'Delta','ε':'Epsilon','ζ':'Zeta','η':'Eta','θ':'Theta','ι':'Iota','κ':'Kappa','λ':'Lambda','μ':'Mu','ν':'Nu','ξ':'Xi','ο':'Omicron','π':'Pi','ρ':'Rho','σ':'Sigma','τ':'Tau','υ':'Upsilon','φ':'Phi','χ':'Chi','ψ':'Psi','ω':'Omega'};
export function starDisplayName(object:GuideObject,facts:StarFacts|null):string{
  if(facts?.name)return facts.name;
  if(facts?.properName)return facts.properName;
  const constellation=facts?.constellation;
  // Expand this designation for readability; other catalogue abbreviations remain valid labels.
  const suffix=constellation==='CrB'?'Coronae Borealis':constellation;
  if(facts?.bayerDesignation&&suffix)return facts.bayerDesignation.replace(/[α-ω]/g,letter=>greek[letter]??letter)+' '+suffix;
  if(facts?.flamsteedNumber!=null&&suffix)return facts.flamsteedNumber+' '+suffix;
  return object.name;
}
export function catalogueSummary(object:GuideObject,facts:StarFacts|null):string{
  const name=starDisplayName(object,facts);
  if(!facts)return object.hr===undefined?object.story:name+' is listed in the Yale Bright Star Catalogue. Supplemental details are currently unavailable.';
  const sentences=[name+' is catalogued as '+(facts.objectKind==='star'?'a star':'a '+facts.objectKind+' object')+(facts.constellation?' in '+(facts.constellationName??facts.constellation):'')+'.'];
  if(facts.objectKind==='star'){
    if(facts.distanceLy!=null)sentences.push('Its estimated distance is approximately '+facts.distanceLy+' light-years.');
    if(facts.spectralType)sentences.push('Its spectral classification is '+facts.spectralType+'.');
    if(facts.temperatureK!=null)sentences.push('Its '+(facts.temperatureIsApproximate?'estimated ':'catalogue ')+'temperature is '+facts.temperatureK+' kelvin.');
  }
  return sentences.join(' ');
}
