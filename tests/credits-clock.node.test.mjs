import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/credits-clock.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createCreditsClock, stepCreditsClock } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const policy = { logicalUnitsPerSecond: 20, fasterMultiplier: 4, hiddenPolicy: 'pause' };
const sample = (atMs, flags = {}) => ({ atMs, playing: true, faster: false, visible: true, ...flags });

test('an epoch preserves authored pre-roll and never charges time before mount', () => {
  const state = createCreditsClock(-30, policy, sample(50000));
  assert.equal(state.offset, -30);
  assert.equal(stepCreditsClock(state, sample(50500)).offset, -20);
});

test('play, pause and faster transitions affect their following interval', () => {
  let state = createCreditsClock(0, policy, sample(0, { playing: false }));
  state = stepCreditsClock(state, sample(1000));
  assert.equal(state.offset, 0);
  state = stepCreditsClock(state, sample(2000, { faster: true }));
  assert.equal(state.offset, 20);
  state = stepCreditsClock(state, sample(3000, { playing: false }));
  assert.equal(state.offset, 100);
  state = stepCreditsClock(state, sample(7000));
  assert.equal(state.offset, 100);
  assert.equal(stepCreditsClock(state, sample(7500)).offset, 110);
});

test('visibility pause is explicit and never retroactively drops foreground time', () => {
  let state = createCreditsClock(0, policy, sample(0));
  state = stepCreditsClock(state, sample(1000, { visible: false }));
  assert.equal(state.offset, 20);
  state = stepCreditsClock(state, sample(9000));
  assert.equal(state.offset, 20);
  assert.equal(stepCreditsClock(state, sample(10000)).offset, 40);
});

test('continue while hidden still obeys the independent playing flag', () => {
  const rates = { ...policy, hiddenPolicy: 'continue' };
  let state = createCreditsClock(0, rates, sample(0, { visible: false }));
  state = stepCreditsClock(state, sample(2000, { visible: false, playing: false }));
  assert.equal(state.offset, 40);
  assert.equal(stepCreditsClock(state, sample(20000)).offset, 40);
});

test('a rate/profile update does not rewrite elapsed movement', () => {
  let state = createCreditsClock(0, policy, sample(0));
  state = stepCreditsClock(state, sample(1000, { faster: true }), { ...policy, logicalUnitsPerSecond: 30, fasterMultiplier: 2 });
  assert.equal(state.offset, 20);
  assert.equal(stepCreditsClock(state, sample(2000)).offset, 80);
});

test('equal-time boundary updates add no distance and caller objects are snapshotted', () => {
  const mutablePolicy = { ...policy }, mutableSample = sample(10);
  let state = createCreditsClock(2, mutablePolicy, mutableSample);
  mutablePolicy.logicalUnitsPerSecond = 999; mutableSample.playing = false;
  state = stepCreditsClock(state, sample(10, { faster: true }));
  assert.equal(state.offset, 2);
  assert.equal(stepCreditsClock(state, sample(1010)).offset, 82);
});

test('different frame cadences retain the same explicit constant-speed trajectory', () => {
  const initial = createCreditsClock(0, policy, sample(0));
  const single = stepCreditsClock(initial, sample(1000));
  let partitioned = initial;
  for (let i = 1; i <= 60; i++) partitioned = stepCreditsClock(partitioned, sample(i * 1000 / 60));
  assert(Math.abs(partitioned.offset - single.offset) < 1e-10);
  assert.equal(single.offset, 20);
});

test('invalid controls, backward time and numeric overflow fail explicitly', () => {
  for (const value of [NaN, Infinity, -Infinity, '1']) assert.throws(() => createCreditsClock(value, policy, sample(0)));
  for (const rates of [null, { ...policy, logicalUnitsPerSecond: -1 }, { ...policy, fasterMultiplier: 0 },
    { ...policy, hiddenPolicy: undefined }, { ...policy, logicalUnitsPerSecond: Number.MAX_VALUE, fasterMultiplier: 2 }])
    assert.throws(() => createCreditsClock(0, rates, sample(0)));
  const state = createCreditsClock(0, policy, sample(10));
  assert.throws(() => stepCreditsClock(state, sample(9)), /monotonic/);
  assert.throws(() => stepCreditsClock(state, sample(11, { visible: 1 })), /booleans/);
  const large = createCreditsClock(Number.MAX_VALUE, { ...policy, logicalUnitsPerSecond: Number.MAX_VALUE, fasterMultiplier: 1 }, sample(0));
  assert.throws(() => stepCreditsClock(large, sample(1000)), /finite/);
});
