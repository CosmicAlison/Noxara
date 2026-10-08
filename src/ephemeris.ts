import * as Astronomy from 'astronomy-engine';
import { angularDistance } from './astronomy';

export type SolarObject = {
  name: string;
  type: string;
  color: string;
  story: string;
  altitude: number;
  azimuth: number;
  separation?: number;
};

const planets = [
  ['Mercury', Astronomy.Body.Mercury],
  ['Venus', Astronomy.Body.Venus],
  ['Mars', Astronomy.Body.Mars],
  ['Jupiter', Astronomy.Body.Jupiter],
  ['Saturn', Astronomy.Body.Saturn],
  ['Uranus', Astronomy.Body.Uranus],
  ['Neptune', Astronomy.Body.Neptune],
  ['Moon', Astronomy.Body.Moon]
] as const;

export function solarSystemPositions(latitude: number, longitude: number, at = new Date()): SolarObject[] {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  return planets.map(([name, body]) => {
    const eq = Astronomy.Equator(body, at, observer, true, true);
    const horizontal = Astronomy.Horizon(at, observer, eq.ra, eq.dec, 'normal');
    return {
      name,
      type: name === 'Moon' ? 'Earth’s Moon' : 'Solar system planet',
      color: name === 'Mars' ? '#e6a083' : '#e8e8db',
      story: name === 'Moon'
        ? 'Our Moon has accompanied human observers for thousands of years, shaping calendars and inspiring stories across cultures.'
        : name + ' is a planet in our solar system. Its apparent position changes as Earth and the planets orbit the Sun.',
      altitude: horizontal.altitude,
      azimuth: horizontal.azimuth
    };
  }).filter(object => object.altitude > 0);
}

export function identifySolarObject(latitude:number,longitude:number,heading:number,altitude:number,at=new Date(),maxSeparation=10):SolarObject|null {
  const candidates=solarSystemPositions(latitude,longitude,at)
    .map(object=>({...object,separation:angularDistance(heading,altitude,object.azimuth,object.altitude)}))
    .sort((a,b)=>a.separation-b.separation);
  return candidates[0] && candidates[0].separation<=maxSeparation ? candidates[0] : null;
}
