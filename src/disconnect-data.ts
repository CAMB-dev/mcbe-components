import type {
  DisconnectActionDetail, DisconnectActionsModel, DisconnectActionsPlan, DisconnectBackgroundProfile,
  DisconnectButtonKind, DisconnectButtonState, DisconnectLayout, DisconnectPlannedButton, DisconnectVariant,
} from './disconnect-types';

/** Internal source-profile data only. Importing or planning never consults DOM,
 * device/platform flags, clocks, services, textures or controller APIs. */
const MAX_AXIS = 8192;
const MAX_PIXELS = 16777216;
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
function record(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${name} must be a plain data record.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) if (!('value' in descriptors[key as keyof typeof descriptors]!)) throw new TypeError(`${name} must not contain accessors.`);
  return value as Record<string, unknown>;
}
function field(value: Record<string, unknown>, key: string, name: string): unknown {
  if (!own(value, key)) throw new TypeError(`${name}.${key} is required as an own data field.`);
  return value[key];
}
function option<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new TypeError(`${name} must be ${values.join(' or ')}.`);
  return value as T;
}
function flag(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean.`);
  return value;
}
function positive(value: unknown, name: string, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) throw new RangeError(`${name} must be positive and finite within${max}.`);
  return value;
}
function pair(value: unknown, name: string): readonly [unknown, unknown] {
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${name} requires an explicit pair.`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) if (!('value' in descriptors[key as keyof typeof descriptors]!)) throw new TypeError(`${name} must not contain accessors.`);
  if (!own(descriptors, '0') || !own(descriptors, '1')) throw new TypeError(`${name} must not contain sparse axes.`);
  return [descriptors['0']!.value, descriptors['1']!.value];
}
function label(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length > 1048576) throw new TypeError(`${name} must be bounded text.`);
  return value;
}
function button(value: unknown, name: string): DisconnectButtonState {
  const source = record(value, name);
  return Object.freeze({ label: label(field(source, 'label', name), `${name}.label`),
    visible: flag(field(source, 'visible', name), `${name}.visible`), enabled: flag(field(source, 'enabled', name), `${name}.enabled`) });
}
export function snapshotDisconnectLayout(layout: DisconnectLayout): DisconnectLayout {
  const source = record(layout, 'layout'), [rawWidth, rawHeight] = pair(field(source, 'size', 'layout'), 'layout.size');
  const rawScale = field(source, 'scale', 'layout');
  if (typeof rawScale !== 'number' || !Number.isSafeInteger(rawScale) || rawScale <= 0) throw new RangeError('layout.scale must be a positive safe integer.');
  const width = positive(rawWidth, 'layout.size width', MAX_AXIS), height = positive(rawHeight, 'layout.size height', MAX_AXIS);
  const physicalWidth = width * rawScale, physicalHeight = height * rawScale;
  if (![physicalWidth, physicalHeight].every(axis => Number.isSafeInteger(axis) && axis > 0 && axis <= MAX_AXIS)
    || physicalWidth * physicalHeight > MAX_PIXELS) throw new RangeError('Disconnect frame requires positive safe integer physical axes at most8192 and at most16777216 pixels.');
  const fontSource = record(field(source, 'font', 'layout'), 'layout.font');
  const family = field(fontSource, 'family', 'layout.font');
  if (typeof family !== 'string' || !family.trim() || family.length > 8192 || /[\u0000-\u001f\u007f]/.test(family)) throw new TypeError('layout.font.family must be bounded nonblank text without control characters.');
  const fontSize = positive(field(fontSource, 'size', 'layout.font'), 'layout.font.size', MAX_AXIS);
  const lineHeight = positive(field(fontSource, 'lineHeight', 'layout.font'), 'layout.font.lineHeight', MAX_AXIS);
  if (!Number.isFinite(fontSize * rawScale) || !Number.isFinite(lineHeight * rawScale)) throw new RangeError('Scaled Disconnect font extents must remain finite.');
  return Object.freeze({
    size: Object.freeze([width, height] as const), scale: rawScale,
    hiddenSlots: option(field(source, 'hiddenSlots', 'layout'), ['reserve', 'collapse'], 'layout.hiddenSlots'),
    rowAlignment: option(field(source, 'rowAlignment', 'layout'), ['left', 'center'], 'layout.rowAlignment'),
    uriButtonAnchor: option(field(source, 'uriButtonAnchor', 'layout'), ['top-center', 'center'], 'layout.uriButtonAnchor'),
    textAlignment: option(field(source, 'textAlignment', 'layout'), ['left', 'center'], 'layout.textAlignment'),
    textVerticalAlignment: option(field(source, 'textVerticalAlignment', 'layout'), ['top', 'center'], 'layout.textVerticalAlignment'),
    font: Object.freeze({ family, size: fontSize, lineHeight }),
  });
}
export function snapshotDisconnectModel(model: DisconnectActionsModel): DisconnectActionsModel {
  const source = record(model, 'model'), variant = option(field(source, 'variant', 'model'), ['disconnect', 'realms-disconnect', 'realms-warning'], 'model.variant');
  if (variant === 'disconnect') return Object.freeze({ variant, ok: button(field(source, 'ok', 'model'), 'model.ok'), openAccount: button(field(source, 'openAccount', 'model'), 'model.openAccount') });
  const store = button(field(source, 'store', 'model'), 'model.store'), storeIgnored = flag(field(source, 'storeIgnored', 'model'), 'model.storeIgnored');
  if (variant === 'realms-disconnect') return Object.freeze({ variant, store, storeIgnored, back: button(field(source, 'back', 'model'), 'model.back'), openAccount: button(field(source, 'openAccount', 'model'), 'model.openAccount') });
  return Object.freeze({ variant, store, storeIgnored, continue: button(field(source, 'continue', 'model'), 'model.continue'), cancel: button(field(source, 'cancel', 'model'), 'model.cancel') });
}
/** Validation also returns a fresh frozen profile, so later caller mutation
 * cannot silently change a renderer/sampling request already accepted. */
export function validateDisconnectBackground(profile: DisconnectBackgroundProfile): DisconnectBackgroundProfile {
  const source = record(profile, 'background');
  const renderer = option(field(source, 'renderer', 'background'), ['css', 'gpu'], 'background.renderer');
  const sampling = option(field(source, 'sampling', 'background'), ['point', 'bilinear'], 'background.sampling');
  if (renderer === 'gpu' && sampling !== 'point') throw new TypeError('Disconnect GPU rendering currently supports point sampling only.');
  const [x, y] = pair(field(source, 'tileOrigin', 'background'), 'background.tileOrigin');
  for (const axis of [x, y]) if (typeof axis !== 'number' || !Number.isFinite(axis) || axis < -32 || axis > 0) throw new RangeError('background.tileOrigin axes must be finite within[-32,0].');
  return Object.freeze({ renderer, sampling, tileOrigin: Object.freeze([x as number, y as number] as const),
    originRounding: option(field(source, 'originRounding', 'background'), ['floor', 'truncate'], 'background.originRounding') });
}

/** Source boxes are logical; frameSize/style dimensions are physical. Non-URI
 * fixed holders retain their source heights under both hiddenSlots policies.
 * Only URI panel visibility has an authored holder binding. Horizontal hidden
 * buttons may collapse, while ignored Store never removes its explicit gap. */
export function planDisconnectActions(rawLayout: DisconnectLayout, rawModel: DisconnectActionsModel): DisconnectActionsPlan {
  const layout = snapshotDisconnectLayout(rawLayout), model = snapshotDisconnectModel(rawModel), [width, height] = layout.size;
  const buttons: DisconnectPlannedButton[] = [], reserve = layout.hiddenSlots === 'reserve';
  const included = (state: DisconnectButtonState) => reserve || state.visible;
  const add = (kind: DisconnectButtonKind, state: DisconnectButtonState, x: number, y: number, w: number, h: number) => {
    if (included(state)) buttons.push(Object.freeze({ kind, state, box: Object.freeze([x, y, w, h] as const) }));
  };
  const uriHeight = model.variant !== 'realms-warning' && included(model.openAccount) ? 30 : 0;
  const addUri = (state: DisconnectButtonState, top: number) => add('open-account', state, (width - 200) / 2, top + (layout.uriButtonAnchor === 'center' ? 2 : 0), 200, 26);
  if (model.variant === 'disconnect') {
    const top = height * .8 - (uriHeight + 26);
    addUri(model.openAccount, top); add('ok', model.ok, (width - 128) / 2, top + uriHeight, 128, 26);
  } else if (model.variant === 'realms-disconnect') {
    const top = height / 2 + 30 - (uriHeight + 30) / 2;
    addUri(model.openAccount, top);
    const storeIncluded = !model.storeIgnored && included(model.store), backIncluded = included(model.back);
    const rowWidth = (storeIncluded ? 128 : 0) + 5 + (backIncluded ? 128 : 0);
    let cursor = layout.rowAlignment === 'center' ? (width - rowWidth) / 2 : 0;
    if (storeIncluded) { add('store', model.store, cursor, top + uriHeight, 128, 26); cursor += 128; }
    cursor += 5;
    if (backIncluded) add('back', model.back, cursor, top + uriHeight, 128, 26);
  } else {
    const top = height / 2 + 30 - 57 / 2;
    const storeIncluded = !model.storeIgnored && included(model.store), continueIncluded = included(model.continue);
    const rowWidth = (storeIncluded ? 128 : 0) + 5 + (continueIncluded ? 128 : 0);
    let cursor = layout.rowAlignment === 'center' ? (width - rowWidth) / 2 : 0;
    if (storeIncluded) { add('store', model.store, cursor, top, 128, 26); cursor += 128; }
    cursor += 5;
    if (continueIncluded) add('continue', model.continue, cursor, top, 128, 26);
    // The source cancel template retains width256, top-middle anchoring and26
    // holder height, after an unconditional vertical gap5.
    add('cancel', model.cancel, (width - 256) / 2, top + 31, 256, 26);
  }
  const frameSize = Object.freeze([width * layout.scale, height * layout.scale] as const);
  return Object.freeze({ layout, model, buttons: Object.freeze(buttons), frameSize,
    style: Object.freeze({ width: frameSize[0], height: frameSize[1], '--mc-disconnect-scale': layout.scale,
      '--mc-disconnect-font-size': `${layout.font.size * layout.scale}px`, '--mc-disconnect-line-height': `${layout.font.lineHeight * layout.scale}px`,
      fontFamily: layout.font.family, fontSize: layout.font.size * layout.scale, lineHeight: `${layout.font.lineHeight * layout.scale}px` }),
  });
}
export function disconnectIntent(variant: DisconnectVariant, buttonKind: DisconnectButtonKind | null, source: 'button' | 'menu-cancel'): DisconnectActionDetail {
  option(variant, ['disconnect', 'realms-disconnect', 'realms-warning'], 'variant'); option(source, ['button', 'menu-cancel'], 'source');
  if (source === 'menu-cancel') {
    if (buttonKind !== null) throw new TypeError('menu-cancel is a global source mapping without a button owner.');
    return Object.freeze({ action: 'leave', buttonId: 'button.menu_leave_screen', variant, source, button: null });
  }
  const allowed: readonly DisconnectButtonKind[] = variant === 'disconnect' ? ['ok', 'open-account'] : variant === 'realms-disconnect' ? ['back', 'store', 'open-account'] : ['continue', 'store', 'cancel'];
  const kind = option(buttonKind, allowed, 'buttonKind');
  if (kind === 'open-account') return Object.freeze({ action: 'open-account-help', buttonId: 'button.menu_open_uri', variant, source, button: kind, uri: 'https://aka.ms/MCMultiplayerHelp' });
  if (kind === 'store') return Object.freeze({ action: 'check-store', buttonId: 'button.menu_check_store', variant, source, button: kind });
  if (kind === 'continue') return Object.freeze({ action: 'continue', buttonId: 'button.menu_continue', variant, source, button: kind });
  if (kind === 'cancel') return Object.freeze({ action: 'cancel-realm-join', buttonId: 'button.cancel_join_realm', variant, source, button: kind });
  return Object.freeze({ action: 'leave', buttonId: 'button.menu_leave_screen', variant, source, button: kind });
}
