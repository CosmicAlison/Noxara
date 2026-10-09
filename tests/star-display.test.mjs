import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {starDisplayName,catalogueSummary} from '../src/star-display.ts';
const data=JSON.parse(readFileSync(new URL('../public/star-facts.json',import.meta.url),'utf8'));
const star={hr:5968,name:'HR 5968',type:'Star',story:'Old story'};
test('HR 5968 uses its Bayer designation and contains sourced discovery history',()=>{
 assert.equal(data['5968'].properName,null);
 assert.equal(starDisplayName(star,data['5968']),'Rho Coronae Borealis');
 const summary=catalogueSummary(star,data['5968']);
 assert.match(summary,/approximately 56.21 light-years/);
 assert.match(summary,/estimated temperature is 6000 kelvin/);
 assert.match(data['5968'].funFact.text,/1997/);
 assert.ok(data['5968'].notableFacts[0].sourceUrl.startsWith('https://science.nasa.gov/'));
});
test('display chooses proper name, Bayer, Flamsteed, then HR',()=>{
 const facts={...data['5968'],name:undefined};
 assert.equal(starDisplayName(star,{...facts,properName:'Example'}),'Example');
 assert.equal(starDisplayName(star,{...facts,bayerDesignation:null}),'15 Coronae Borealis');
 assert.equal(starDisplayName(star,{...facts,bayerDesignation:null,flamsteedNumber:null}),'HR 5968');
 assert.equal(starDisplayName(star,null),'HR 5968');
});
test('missing facts stay unknown and unsourced old stories are not fallback claims',()=>{
 const summary=catalogueSummary(star,null);
 assert.match(summary,/unavailable/);assert.ok(!summary.includes('Old story'));
});

test('all 9,110 entries have a sourced name and typed fun fact',()=>{
 assert.equal(Object.keys(data).length,9110);
 for(const [hr,entry] of Object.entries(data)){
  assert.ok(entry.name.trim(),hr);
  assert.ok(entry.nameType,hr);
  assert.ok(entry.nameSourceUrls.length,hr);
  assert.ok(entry.funFact.text.trim(),hr);
  assert.ok(entry.funFact.sourceUrls.every(url=>url.startsWith('https://')),hr);
  assert.equal(entry.funFact.generated,entry.funFact.kind==='catalogue_based_explanation',hr);
  assert.equal(starDisplayName({...star,hr:Number(hr)},entry),entry.name,hr);
 }
});
