/** Bright-star catalog (J2000 coordinates, approximate magnitudes). No network required. */
export type Star = { hr: number; name: string; type: string; color: string; ra: number; dec: number; magnitude: number; story: string };
export type VisibleStar = Star & { altitude: number; azimuth: number; separation?: number };
const brightStarHr: Record<string, number> = {
  Sirius:2491, Canopus:2326, Arcturus:5340, Vega:7001, Capella:1708,
  Rigel:1713, Procyon:2943, Achernar:472, Betelgeuse:2061, Hadar:5267,
  Acrux:4730, Altair:7557, Aldebaran:1457, Spica:5056, Antares:6134,
  Pollux:2990, Fomalhaut:8728, Deneb:7924, Mimosa:4853, Regulus:3982
};
export const stars: Star[] = [
  ['Sirius',6.7525,-16.716,-1.46,'#dceaff','The brightest star in the night sky, Sirius has guided travelers and inspired stories for millennia.'],
  ['Canopus',6.3992,-52.695,-0.74,'#fff2d5','Canopus is the second-brightest star in the night sky and a historic navigational beacon.'],
  ['Arcturus',14.261,19.182,-0.05,'#ffd6ad','Arcturus is an orange giant in Boötes. Its warm glow is easy to recognize.'],
  ['Vega',18.6156,38.783,0.03,'#dfe9ff','Vega shines in Lyra and forms one corner of the Summer Triangle.'],
  ['Capella',5.2782,45.998,0.08,'#fff0bf','Capella is a brilliant system of stars in the constellation Auriga.'],
  ['Rigel',5.2423,-8.202,0.13,'#dceaff','Rigel is a luminous blue supergiant marking Orion’s foot.'],
  ['Procyon',7.655,5.225,0.34,'#fff0d7','Procyon is one of the stars of the Winter Triangle.'],
  ['Achernar',1.6286,-57.237,0.46,'#dceaff','Achernar marks the end of the river constellation Eridanus.'],
  ['Betelgeuse',5.9195,7.407,0.5,'#f5a68e','Betelgeuse is a red supergiant at Orion’s shoulder.'],
  ['Hadar',14.0637,-60.373,0.61,'#e2eaff','Hadar is a brilliant star in Centaurus.'],
  ['Acrux',12.4433,-63.099,0.76,'#dceaff','Acrux is the brightest star in the Southern Cross.'],
  ['Altair',19.8464,8.868,0.77,'#e4edff','Altair marks the eagle Aquila and is part of the Summer Triangle.'],
  ['Aldebaran',4.5987,16.509,0.85,'#f5b48c','Aldebaran glows orange in Taurus, near the Hyades star cluster.'],
  ['Spica',13.4199,-11.161,0.98,'#e1eaff','Spica is the brightest star in Virgo.'],
  ['Antares',16.4901,-26.432,1.06,'#f2a38a','Antares is a red supergiant in Scorpius, traditionally called the rival of Mars.'],
  ['Pollux',7.7553,28.026,1.14,'#ffdfb6','Pollux is the brighter of the Gemini twins.'],
  ['Fomalhaut',22.9608,-29.622,1.16,'#e2ebff','Fomalhaut shines in Piscis Austrinus, the southern fish.'],
  ['Deneb',20.6905,45.28,1.25,'#e4eeff','Deneb is a distant luminous supergiant in Cygnus.'],
  ['Mimosa',12.7953,-59.689,1.25,'#dceaff','Mimosa is a bright blue star in the Southern Cross.'],
  ['Regulus',10.1395,11.967,1.35,'#dceaff','Regulus is the bright heart of Leo.']
].map(([name,ra,dec,magnitude,color,story]) => ({hr: brightStarHr[name as string], name: name as string, ra: ra as number, dec: dec as number, magnitude: magnitude as number, color: color as string, story: story as string, type:'Bright star'}));
const rad = Math.PI/180;
const normalize = (degrees:number) => ((degrees%360)+360)%360;
export function horizontalCoordinates(raHours:number,decDeg:number,latitude:number,longitude:number,at:Date):{altitude:number;azimuth:number} {
  const jd=at.getTime()/86400000+2440587.5;
  const t=(jd-2451545)/36525;
  const gmst=normalize(280.46061837+360.98564736629*(jd-2451545)+0.000387933*t*t-t*t*t/38710000);
  const ha=normalize(gmst+longitude-raHours*15)*rad;
  const dec=decDeg*rad,lat=latitude*rad;
  const sinAlt=Math.sin(dec)*Math.sin(lat)+Math.cos(dec)*Math.cos(lat)*Math.cos(ha);
  const alt=Math.asin(Math.max(-1,Math.min(1,sinAlt)));
  const az=Math.atan2(-Math.sin(ha)*Math.cos(dec),Math.sin(dec)*Math.cos(lat)-Math.cos(dec)*Math.sin(lat)*Math.cos(ha));
  return {altitude:alt/rad,azimuth:normalize(az/rad)};
}
export function visibleStars(latitude:number,longitude:number,at=new Date()):VisibleStar[] {
  return stars.map(s=>({...s,...horizontalCoordinates(s.ra,s.dec,latitude,longitude,at)})).filter(s=>s.altitude>5).sort((a,b)=>a.magnitude-b.magnitude);
}
export function angularDistance(az1:number,alt1:number,az2:number,alt2:number) {
  const a=alt1*rad,b=alt2*rad,delta=(az1-az2)*rad;
  return Math.acos(Math.max(-1,Math.min(1,Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos(delta))))/rad;
}
export function identifyStar(latitude:number,longitude:number,heading:number,altitude:number,at=new Date(),maxSeparation=15):VisibleStar|null {
  const candidates=visibleStars(latitude,longitude,at).map(s=>({...s,separation:angularDistance(heading,altitude,s.azimuth,s.altitude)})).sort((a,b)=>(a.separation??180)-(b.separation??180));
  return candidates[0] && candidates[0].separation!<=maxSeparation ? candidates[0] : null;
}

