import type {ResourcePackKind} from '../src/resource-pack-items';
import type {ResourcePackManagerProps, ResourcePackManagerRecord, ResourcePackProfile} from '../src/resource-packs';

const selectedCollections = {global: '#selected_pack_items_global', level: '#selected_pack_items_level', addon: '#selected_pack_items_addon'} as const;
const collectionNames = {
  global: {selected: '#selected_pack_items_global', available: '#available_pack_items_global', realms: '#realms_pack_items_global', unowned: '#unowned_pack_items_global', invalid: '#invalid_pack_items_global'},
  level: {selected: '#selected_pack_items_level', available: '#available_pack_items_level', realms: '#realms_pack_items_level', unowned: '#unowned_pack_items_level', invalid: '#invalid_pack_items_level'},
  addon: {selected: '#selected_pack_items_addon', available: '#available_pack_items_addon', realms: '#realms_pack_items_addon', unowned: '#unowned_pack_items_addon', invalid: '#invalid_pack_items_addon'},
} as const;

/** Plain, serializable local host data. No code executes a filesystem, store,
 * account or pack service; absent dynamic artwork is explicitly null. */
export function createResourcePackDemoRecord(kind: ResourcePackKind, profile: ResourcePackProfile = 'global', index = 0): ResourcePackManagerRecord {
  const diagnostic = {collection: collectionNames[profile][kind], hasErrors: kind === 'invalid', hasWarnings: kind === 'selected', hasExpired: false,
    errorFree: kind !== 'invalid', reportGenerating: false, errorCount: kind === 'invalid' ? '2' : '0', warningCount: kind === 'selected' ? '1' : '0',
    errorsText: 'Errors', warningsText: 'Warnings', expiredText: 'Expired', loadingFrame: 0};
  const directionVisible = kind === 'selected';
  return {id: kind + '-example-' + index, index, icon: null,
    text: {name: kind[0]!.toUpperCase() + kind.slice(1) + ' example', size: '2.4 MB', description: 'A local host snapshot. No pack is installed or modified by this preview.'},
    bindings: {isSelected: kind === 'selected', isReadMore: true, isReadLess: false, usingEllipses: true, directionVisible},
    // Deliberate finite Web intrinsic boxes, not certified native font metrics.
    layout: {mainHeight: 44, contentHeight: 42, expandedTextHeight: 32, fileSizeWidth: 38, readButtonHeight: 12, invalidErrorHeight: 10},
    diagnostics: diagnostic, lowMemoryDevice: false,
    labels: {select: 'Select ' + kind + ' example', readMore: 'Read more', readLess: 'Read less', remove: 'Deactivate', add: 'Activate', store: 'View in store', options: 'Pack settings', up: 'Move up', down: 'Move down', report: 'View report', loading: 'Generating report', actions: 'Pack actions'},
    actions: {bindings: {directionVisible, isUsingGamepad: false, isSelected: kind === 'selected', platformLocked: false,
      canMove: kind === 'selected' || kind === 'available' || kind === 'realms', canGoToStore: kind === 'unowned', canSortUp: false, canSortDown: false,
      hasPackSettings: kind === 'selected', reportButtonVisible: kind === 'selected', reportGenerating: false},
      // The authored warning wrapper uses selected-pack bindings even in an
      // available/realms tray; do not silently substitute the current kind.
      diagnostics: {...diagnostic, collection: selectedCollections[profile]}},
    payload: {example: true, kind},
  };
}

/** Complete finite Manager snapshot, reusable by source/gallery/installed SSR
 * consumers. Profile action targets are owned by Manager's exact source map. */
export function createResourcePackDemoProps(profile: ResourcePackProfile = 'global'): ResourcePackManagerProps {
  return {profile, width: 330, scale: 2,
    provider: {educationEdition: false, isWorldCreate: false, isTemplateCreate: false, isWorldEdit: profile !== 'global'},
    bindings: {worldTemplateLocked: false, forcePackDownloadEnabled: true, forcePackDownloadLocked: true,
      forceUserAgreement: true, forceUserAgreementEnabled: true, addonStackingWarningVisible: false,
      selectedGridVisible: true, availableGridVisible: true, realmsVisible: true, realmsGridVisible: true, unownedVisible: true, unownedGridVisible: true,
      noAvailablePacks: false, noRealmsPacks: false, noUnownedPacks: false,
      selectedAnyExceptions: true, selectedAnyErrors: false, selectedAnyWarnings: true,
      invalidHasErrors: true, availableAnyErrors: true, availableAnyWarnings: false},
    labels: {selected: 'Active packs', available: 'Available packs', realms: 'Realms Plus', unowned: 'Suggested packs',
      templateWarning: 'This world template locks pack settings.', forceDownload: 'Require players to accept resource packs',
      addonWarning: 'Multiple add-ons may affect each other.', addonLink: 'Learn more', noPacks: 'No available packs', toStore: 'Open store', viewMore: 'View more',
      selectedDiagnostics: 'Active pack diagnostics', availableDiagnostics: 'Available pack diagnostics'},
    collections: {
      selected: {capacity: 1, count: '17', items: [createResourcePackDemoRecord('selected', profile)]},
      available: {capacity: 1, count: '005', items: [createResourcePackDemoRecord('available', profile)]},
      realms: {capacity: 1, count: '8', items: [createResourcePackDemoRecord('realms', profile)]},
      unowned: {capacity: 1, count: '21', items: [createResourcePackDemoRecord('unowned', profile)]},
      invalid: {capacity: 1, count: '3', items: [createResourcePackDemoRecord('invalid', profile)]},
    },
    defaultItem: {icon: null, title: 'Default', description: 'Host-supplied default pack description.', bottomDescription: 'Packs are applied by the host after accepting a request.', fillerTextHeight: 20},
    layout: {templateWarningHeight: 24, addonTextWidth: 185, addonLinkSize: [70, 14]},
  };
}
