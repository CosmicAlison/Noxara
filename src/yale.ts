import { horizontalCoordinates, angularDistance } from './astronomy';
export type YaleStar = { name:string; type:string; color:string; ra:number; dec:number; magnitude:number; altitude:number; azimuth:number; separation?:number; story:string };
type Row = [number,number,number,number];
let catalog:Row[]|null=null;
/** Loads the locally bundled BSC5 conversion. No external astronomy service required. */
export async function loadYaleCatalog():Promise<number>{
  if(catalog)return catalog.length;
  const response=await fetch('/bsc5.json');
  if(!response.ok)throw new Error('Bundled Yale catalogue is missing (public/bsc5.json).');
  const data:unknown=await response.json();
  if(!Array.isArray(data)||data.length!==9110||!data.every(row=>Array.isArray(row)&&row.length===4&&row.every(v=>typeof v==='number'&&Number.isFinite(v))))throw new Error('Invalid BSC5 catalogue.');
  catalog=data as Row[];
  return catalog.length;
}
export function yaleVisible(latitude:number,longitude:number,at=new Date()):YaleStar[]{
  if(!catalog)return [];
  return catalog.map(([id,ra,dec,magnitude])=>{
    const {altitude,azimuth}=horizontalCoordinates(ra,dec,latitude,longitude,at);
    return {name:'HR '+id,type:'Yale Bright Star Catalogue',color:'#dceaff',ra,dec,magnitude,altitude,azimuth,story:'This star is listed as Harvard Revised '+id+' in the Yale Bright Star Catalogue. Its light reaches us from beyond our solar system.'};
  }).filter(s=>s.altitude>5).sort((a,b)=>a.magnitude-b.magnitude);
}
export function identifyYale(latitude:number,longitude:number,heading:number,altitude:number,at=new Date(),maxSeparation=15):YaleStar|null{
  const ranked=yaleVisible(latitude,longitude,at).map(s=>({...s,separation:angularDistance(heading,altitude,s.azimuth,s.altitude)})).sort((a,b)=>(a.separation??180)-(b.separation??180));
  return ranked[0]&&(ranked[0].separation??180)<=maxSeparation?ranked[0]:null;
}
