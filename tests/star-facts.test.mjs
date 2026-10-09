import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStarFactsLoader, objectContext, gemmaPrompt} from '../src/star-facts.ts';
import {stars} from '../src/astronomy.ts';

const facts = JSON.parse(readFileSync(new URL('../public/star-facts.json', import.meta.url), 'utf8'));
const rows = JSON.parse(readFileSync(new URL('../public/bsc5.json', import.meta.url), 'utf8'));
const sirius = stars.find(s => s.name === 'Sirius');

test('fallback stars use matching HR identities and positions', () => {
  for (const star of stars) {
    const row = rows.find(([hr]) => hr === star.hr);
    assert.ok(row, star.name);
    assert.ok(Math.abs(row[1] - star.ra) < 0.01, star.name);
    assert.ok(Math.abs(row[2] - star.dec) < 0.01, star.name);
    assert.equal(facts[star.hr].properName.toLowerCase(), star.name.toLowerCase());
  }
});

test('selected HR context includes sourced facts and qualified estimates only', () => {
  const data = facts[sirius.hr];
  const context = objectContext(sirius, data);
  assert.match(context, /HR 2491/);
  assert.ok(context.includes(String(data.distanceLy)));
  assert.match(context, /Estimated distance: approximately/);
  assert.match(context, /Approximate temperature:.*not a measured temperature/);
  for (const fact of data.notableFacts) assert.ok(context.includes(fact.sourceUrl));
  assert.ok(!context.includes(sirius.story));
  assert.ok(!context.includes('Canopus'));
  for (const question of [undefined, 'How hot is it?']) {
    const prompt = gemmaPrompt(sirius, context, question);
    assert.ok(prompt.includes(context));
    assert.match(prompt, /Missing values are unknown, not zero/);
    if (question) assert.ok(prompt.includes(question));
  }
});

test('missing fields and non-stellar records do not become physical claims', () => {
  const data = {...facts[sirius.hr], distanceLy:null, temperatureK:null, spectralType:null, notableFacts:[]};
  const context = objectContext(sirius, data);
  assert.doesNotMatch(context, /Estimated distance|temperature:|spectral type:|null/);
  const nonstellar = objectContext(sirius, {...data, objectKind:'non-stellar', distanceLy:100, temperatureK:9000});
  assert.doesNotMatch(nonstellar, /Estimated distance|temperature:/);
  const missing = objectContext(sirius, null);
  assert.match(missing, /Supplemental data unavailable/);
  assert.ok(!missing.includes(sirius.story));
});

test('solar-system objects retain ephemeris context', () => {
  const moon = {name:'Moon', type:'Moon', story:'Current altitude: 30 degrees.'};
  assert.equal(objectContext(moon, null), moon.story);
});

test('catalogue loader shares concurrent requests and caches parsed results', async () => {
  let calls = 0;
  const load = createStarFactsLoader(async () => { calls++; return new Response(JSON.stringify({'2491':facts['2491']})); });
  const [a,b] = await Promise.all([load(),load()]);
  assert.equal(a,b);
  assert.equal(await load(),a);
  assert.equal(calls,1);
});

test('failed HTTP, JSON and shape validation can be retried', async () => {
  for (const response of [new Response('',{status:503}), new Response('not json'), new Response('[]')]) {
    let calls = 0;
    const load = createStarFactsLoader(async () => ++calls === 1 ? response : new Response('{}'));
    await assert.rejects(load());
    assert.deepEqual(await load(),{});
    assert.equal(calls,2);
  }
});
