import test from 'node:test';
import assert from 'node:assert/strict';
import { startHeroRotation, heroSlides } from '../src/home/heroSlides.mjs';

test('hero rotation waits five seconds, advances once per tick, and cleans up', () => {
  let callback; let delay; let cancelled; let index = 0;
  const cleanup = startHeroRotation(() => { index = (index + 1) % heroSlides.length; },
    (fn, ms) => { callback = fn; delay = ms; return 42; }, (id) => { cancelled = id; });
  assert.equal(delay, 5000);
  assert.equal(index, 0);
  callback(); assert.equal(index, 1);
  for (let i = 1; i < heroSlides.length; i++) callback();
  assert.equal(index, 0);
  cleanup(); assert.equal(cancelled, 42);
});
