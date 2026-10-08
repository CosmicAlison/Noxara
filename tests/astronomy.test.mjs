import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {horizontalCoordinates,angularDistance} from '../src/astronomy.ts';

test('Yale catalogue has 9,110 valid records',()=>{
 const rows=JSON.parse(readFileSync(new URL('../public/bsc5.json',import.meta.url),'utf8'));
 assert.equal(rows.length,9110);
 assert.ok(rows.every(row=>Array.isArray(row)&&row.length===4&&row.every(Number.isFinite)));
 assert.ok(rows.every(([id,ra,dec])=>id>=1&&id<=9110&&ra>=0&&ra<24&&dec>=-90&&dec<=90));
});

test('angular separation is zero for identical directions',()=>{
 assert.ok(angularDistance(10,25,10,25)<0.00001);
 assert.ok(Math.abs(angularDistance(0,0,180,0)-180)<0.00001);
});

test('celestial pole altitude equals observer latitude in northern hemisphere',()=>{
 const result=horizontalCoordinates(0,90,35,0,new Date('2026-10-08T00:00:00Z'));
 assert.ok(Math.abs(result.altitude-35)<0.0001);
 assert.ok(Math.abs(result.azimuth-0)<0.0001);
});

test('southern celestial pole altitude equals absolute southern latitude',()=>{
 const result=horizontalCoordinates(0,-90,-20,0,new Date('2026-10-08T00:00:00Z'));
 assert.ok(Math.abs(result.altitude-20)<0.0001);
 assert.ok(Math.abs(result.azimuth-180)<0.0001);
});
