import { horizontalCoordinates, angularDistance, stars } from './astronomy';

export type YaleStar = {
  hr:number; name:string; type:string; color:string; ra:number; dec:number; magnitude:number;
  altitude:number; azimuth:number; separation?:number; story:string;
};
type Row = [number,number,number,number];
let catalog:Row[]|null=null;
let loading:Promise<number>|null=null;

/** BSC5 records: [Harvard Revised number, RA hours, Dec degrees, V magnitude]. */
export function loadYaleCatalog():Promise<number>{
  if(catalog)return Promise.resolve(catalog.length);
  if(loading)return loading;
  loading=fetch(import.meta.env.BASE_URL+'bsc5.json').then(async response=>{
    if(!response.ok)throw new Error('Bundled Yale catalogue not found. Place bsc5.json in public/.');
    const data:unknown=await response.json();
    if(!Array.isArray(data)||data.length!==9110||
      !data.every(row=>Array.isArray(row)&&row.length===4&&
        row.every(value=>typeof value==='number'&&Number.isFinite(value))))
      throw new Error('Invalid Yale BSC5 catalogue format.');
    catalog=data as Row[];
    return catalog.length;
  }).catch(error=>{loading=null;throw error;});
  return loading;
}

function knownStar(ra:number,dec:number){
  return stars.find(star=>angularDistance(star.ra*15,star.dec,ra*15,dec)<0.15);
}
export function yaleVisible(latitude:number,longitude:number,at=new Date(),limitMagnitude=6.5):YaleStar[]{
  if(!catalog)return [];
  const visible:YaleStar[]=[];
  for(const [id,ra,dec,magnitude] of catalog){
    // The 14 non-stellar BSC placeholders have no sky position.
    if((ra===0&&dec===0&&magnitude===0)||magnitude>limitMagnitude)continue;
    const {altitude,azimuth}=horizontalCoordinates(ra,dec,latitude,longitude,at);
    if(altitude<=5)continue;
    const known=knownStar(ra,dec);
    visible.push({
      hr:id,
      name:known?.name??'HR '+id,
      type:known?.type??'Yale Bright Star Catalogue',
      color:known?.color??'#dceaff',
      ra,dec,magnitude,altitude,azimuth,
      story:known?.story??('This is star HR '+id+' in the Yale Bright Star Catalogue. Its apparent visual magnitude is '+magnitude.toFixed(2)+'.')
    });
  }
  return visible.sort((a,b)=>a.magnitude-b.magnitude);
}
export function identifyYale(latitude:number,longitude:number,heading:number,altitude:number,at=new Date(),maxSeparation=8):YaleStar|null{
  const candidates=yaleVisible(latitude,longitude,at,6.5)
    .map(star=>({...star,separation:angularDistance(heading,altitude,star.azimuth,star.altitude)}))
    .filter(star=>star.separation<=maxSeparation)
    .sort((a,b)=>(a.separation+Math.max(0,a.magnitude)*1.2)-(b.separation+Math.max(0,b.magnitude)*1.2));
  return candidates[0]??null;
}

