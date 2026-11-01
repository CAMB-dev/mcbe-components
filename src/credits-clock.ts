/** Private deterministic Web clock. Native Credits timing and held-key speed
 * are not inferred here; a resolved profile supplies both rates explicitly. */
export interface CreditsClockPolicy {
  readonly logicalUnitsPerSecond: number;
  readonly fasterMultiplier: number;
  readonly hiddenPolicy: 'pause' | 'continue';
}

export interface CreditsClockSample {
  readonly atMs: number;
  readonly playing: boolean;
  readonly faster: boolean;
  readonly visible: boolean;
}

export interface CreditsClockState {
  readonly offset: number;
  readonly sample: CreditsClockSample;
  readonly policy: CreditsClockPolicy;
}

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

function policyCopy(value: CreditsClockPolicy): CreditsClockPolicy {
  if (!value || typeof value !== 'object') throw new TypeError('A Credits clock policy is required.');
  finite(value.logicalUnitsPerSecond, 'logicalUnitsPerSecond');
  finite(value.fasterMultiplier, 'fasterMultiplier');
  if (value.logicalUnitsPerSecond < 0 || value.fasterMultiplier <= 0)
    throw new RangeError('Credits clock rates must be non-negative, with a positive faster multiplier.');
  finite(value.logicalUnitsPerSecond * value.fasterMultiplier, 'Combined Credits clock rate');
  if (value.hiddenPolicy !== 'pause' && value.hiddenPolicy !== 'continue')
    throw new RangeError('An explicit pause or continue hidden policy is required.');
  return { logicalUnitsPerSecond: value.logicalUnitsPerSecond, fasterMultiplier: value.fasterMultiplier,
    hiddenPolicy: value.hiddenPolicy };
}

function sampleCopy(value: CreditsClockSample): CreditsClockSample {
  if (!value || typeof value !== 'object') throw new TypeError('A Credits clock sample is required.');
  finite(value.atMs, 'Credits clock timestamp');
  if (typeof value.playing !== 'boolean' || typeof value.faster !== 'boolean' || typeof value.visible !== 'boolean')
    throw new TypeError('Credits clock playing, faster and visible flags must be booleans.');
  return { atMs: value.atMs, playing: value.playing, faster: value.faster, visible: value.visible };
}

/** Establishes an epoch without charging time before the first observation.
 * A finite negative offset is valid for an explicitly authored pre-roll. */
export function createCreditsClock(initialOffset: number, policy: CreditsClockPolicy,
  sample: CreditsClockSample): CreditsClockState {
  finite(initialOffset, 'Initial Credits offset');
  return { offset: initialOffset, policy: policyCopy(policy), sample: sampleCopy(sample) };
}

/** Integrates the preceding interval using its preceding flags/rate, then
 * applies new controls at this sample's boundary. Call at control/visibility
 * changes as well as animation frames; no missing transition time is guessed. */
export function stepCreditsClock(state: CreditsClockState, sample: CreditsClockSample,
  nextPolicy?: CreditsClockPolicy): CreditsClockState {
  if (!state || typeof state !== 'object') throw new TypeError('A Credits clock state is required.');
  finite(state.offset, 'Credits offset');
  const previous = sampleCopy(state.sample), policy = policyCopy(state.policy);
  const next = sampleCopy(sample), nextRates = policyCopy(nextPolicy === undefined ? policy : nextPolicy);
  if (next.atMs < previous.atMs) throw new RangeError('Credits clock timestamps must be monotonic.');
  const elapsedMs = next.atMs - previous.atMs;
  finite(elapsedMs, 'Elapsed Credits clock time');
  const moving = previous.playing && (previous.visible || policy.hiddenPolicy === 'continue');
  const rate = moving ? policy.logicalUnitsPerSecond * (previous.faster ? policy.fasterMultiplier : 1) : 0;
  const distance = elapsedMs / 1000 * rate;
  finite(distance, 'Credits clock distance');
  const offset = state.offset + distance;
  finite(offset, 'Resulting Credits offset');
  return { offset, sample: next, policy: nextRates };
}
