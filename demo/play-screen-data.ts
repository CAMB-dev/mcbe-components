import type {PlayScreenProps} from '../src/play-screen';
import type {PlayWorldRecord, PlayNetworkWorldRecord} from '../src/play-worlds';
import type {PlayServerItem, PlayFeaturedServerDetail, PlayServerDetailData} from '../src/play-servers';

/** Host-owned local examples, not discovered worlds/accounts/server responses.
 * No invented thumbnails, Minecraft logos or external network requests. */
export function playDemoWorld(id = 'local-1', name = 'Local meadow'): PlayWorldRecord {
  return {id, name, date: '2026-11-02', gameMode: 'Survival', fileSize: '4.2 MB', thumbnail: null, enabled: true};
}
export function playDemoNetwork(id = 'friend-1', name = 'A friend’s world'): PlayNetworkWorldRecord {
  return {id, name, details: 'Host snapshot · Survival', playerCount: '2/8', enabled: true,
    gameOnline: true, gameUnavailable: false, gameOffline: false, statusLabel: 'Online',
    hardcoreVisible: false, hardcoreLabel: 'Hardcore', headerIconVisible: false, headerIcon: null,
    hideNetworkIcon: true, networkIcon: null};
}
export function playDemoServer(id = 'featured-1', index = 0, selected = false): PlayServerItem {
  return {id, index, name: id === 'featured-1' ? 'Featured example' : id === 'featured-2' ? 'Second example' : 'Local address example',
    selected, enabled: true, infoAvailable: true, screenshotVisible: false, messageVisible: true,
    message: 'Local preview data', concurrencyVisible: false, playerCount: '12/100',
    editVisible: id.startsWith('additional'), editEnabled: true, editLabel: 'Edit server', payload: {id}};
}
export function playDemoServerDetail(name = 'Featured example'): PlayServerDetailData {
  return {name, online: {label: 'Players', value: '12/100', iconVisible: false, valueVisible: true, progressVisible: false},
    ping: {label: 'Ping', value: '48 ms', iconVisible: false, valueVisible: true, progressVisible: false},
    joinLabel: 'Join server', joinEnabled: true, payload: {name}};
}
export function playDemoFeaturedDetail(): PlayFeaturedServerDetail {
  return {...playDemoServerDetail(), infoAvailable: true, screenshotVisible: false, offersVisible: false, offersEnabled: false, offersLabel: 'View offers',
    screenshots: {visible: false, label: 'Screenshots', previousLabel: 'Previous screenshot', nextLabel: 'Next screenshot', previousEnabled: false, nextEnabled: false, selected: []},
    description: {visible: true, label: 'Description', text: 'This is a local controlled example. Selecting a row changes details; joining only records a request.',
      collapsedVisible: true, expandedVisible: false, readMoreVisible: true, readLessVisible: false, readButtonHeight: 12, readMoreLabel: 'Read more', readLessLabel: 'Read less'},
    gamesVisible: false, gamesLabel: 'Games', games: [],
    news: {visible: false, label: 'News', title: 'Local news', text: '', collapsedVisible: false, expandedVisible: false, readMoreVisible: false, readLessVisible: false, readMoreLabel: 'Read more news', readLessLabel: 'Read less news'}};
}

/** Complete finite default-Classic input. Safe to use directly for SSR/type
 * consumer verification. Every raw flag, label and collection is explicit. */
export function createPlayDemoProps(): PlayScreenProps {
  return {
    viewportSize: [360, 300], scale: 2, inputMode: 'mouse', exitButtonVisible: false, closeLabel: 'Close Play',
    navigation: {value: 'worlds', label: 'Play tabs', labels: {worlds: 'Worlds', friends: 'Friends', servers: 'Servers'},
      counts: {worlds: '27', friends: '9', servers: '4'},
      friends: {showBouncing: false, showNotBouncing: true, showInvites: false, inboxEnabled: false}},
    worlds: {
      provider: {isRealmsEnabled: false, crossPlatformEnabled: true, educationEdition: false, worldPickerScreen: false,
        localWorldUpload: false, worldArchiveSupport: true, supportsLegacyWorlds: true, autoFetchLegacyWorlds: false,
        legacyWorldsShareStorage: false, legacyWorldsSupportsMigration: false},
      flags: {deviceSunsetting: false, showNewPlayScreenOptIn: false, personalRealmsGridVisible: false, realmLabelVisible: false,
        realmsSignInVisible: false, freePreviewVisible: false, freePreviewNewOfferVisible: false, createOnRealmsVisible: false,
        loadingPersonalRealmsVisible: false, realmTrialVisible: false, nintendoFirstPurchaseVisible: false, multiplayerBlockedVisible: false,
        openAccountUriVisible: false, openAccountGamecoreVisible: false, localWorldsVisible: true, noLocalWorlds: false,
        noLocalSwitchSettingVisible: false, noLocalSwitchVisible: false, noLocalHelpVisible: false,
        betaRetailLocalWorldsVisible: false, syncLegacyWorldsButtonVisible: false, loadingLegacyWorldsVisible: false,
        legacyWorldsVisible: false, betaRetailLegacyWorldsVisible: false},
      labels: {worlds: 'Local worlds', legacyWorlds: 'Legacy worlds', betaLocal: 'Beta local worlds', betaLegacy: 'Beta legacy worlds', realms: 'Realms',
        create: 'Create New', quickPlay: 'Quick Play', optIn: 'Try new Play', import: 'Import world', signIn: 'Sign in to Realms',
        freePreview: 'Free preview', createOnRealms: 'Create on Realms', trial: 'Start trial', nintendoPurchase: 'Create first Realm',
        noLocal: 'No local worlds', noLocalSwitch: 'Choose a storage location', storageType: 'Storage location', storageExternal: 'External', storagePackage: 'Application',
        help: 'Storage help', noLocalHelp: 'Worlds are stored on this device.', syncLegacy: 'Sync legacy worlds', dontSeeLegacy: 'Missing legacy worlds?',
        crossPlatformDisabled: 'Cross-platform play is unavailable', blocked: 'Multiplayer is blocked', accountSettings: 'Account settings', accountGamecore: 'Open account settings',
        warningMoreInfo: 'More info', editWorld: 'Edit', deleteWorld: 'Delete', migrateWorld: 'Migrate', storageUsage: 'Storage usage'},
      localWorlds: {items: [playDemoWorld(), playDemoWorld('local-2', 'Local workshop')], rowCount: 2},
      legacyWorlds: {items: [], rowCount: 0}, betaRetailLocalWorlds: {items: [], rowCount: 0}, betaRetailLegacyWorlds: {items: [], rowCount: 0},
      loadingPersonalRealms: {message: 'Loading Realms', height: 39, frame: 0, barsVisible: true, placeholderRows: 0},
      loadingLegacyWorlds: {message: 'Loading legacy worlds', height: 39, frame: 0, barsVisible: true, placeholderRows: 0},
      storage: {enabled: true, value: 'external', toggleLabel: 'Storage location'},
      storageUsage: {contentHeight: 30, localClipRatio: .25, legacyClipRatio: .5, clipPolicy: 'visible-fraction-web'},
    },
    friends: {
      provider: {isRealmsEnabled: false, crossPlatformEnabled: true, supportsAddFriend: true, nxOs: false, isPs4: false,
        editorMode: false, educationEdition: false, addFriendNotVisible: false, inboxEnabled: false},
      flags: {deviceSunsetting: false, addFriendButtonVisible: true, joinByCodeVisible: true, notificationVisible: false,
        joinableRealmsPanelVisible: false, friendsRealmsVisible: false, realmsSignInVisible: false, loadingFriendsRealmsVisible: false,
        offlineAuthCodeVisible: false, noFriendsRealmsVisible: false, friendsGridVisible: true, noFriendsMessageVisible: false,
        crossPlatformFriendsGridVisible: false, noCrossPlatformFriendsMessageVisible: false, generalNoMultiplayerVisible: false,
        lanGridVisible: true, openAccountGamecoreVisible: false},
      labels: {addFriend: 'Add friend', joinByCode: 'Join by code', notification: 'Invitations', joinableRealms: 'Joinable Realms',
        signIn: 'Sign in to Realms', offlineAuthCode: 'Authorize this app', noFriendsRealms: 'No joinable Realms', friends: 'Joinable friends',
        noFriends: 'No friends available', findCrossPlatformFriend: 'Find cross-platform friends', crossPlatformFriends: 'Cross-platform friends',
        noCrossPlatformFriends: 'No cross-platform friends', generalNoMultiplayer: 'Multiplayer unavailable', lan: 'LAN games',
        accountGamecore: 'Open account settings', crossPlatformDisabled: 'Cross-platform play unavailable', warningMoreInfo: 'More info'},
      friends: {items: [playDemoNetwork()], rowCount: 1}, crossPlatformFriends: {items: [], rowCount: 0},
      lan: {items: [playDemoNetwork('lan-1', 'LAN example')], rowCount: 1},
      loadingFriendsRealms: {message: 'Loading friends Realms', height: 39, frame: 0, barsVisible: true, placeholderRows: 0}, notificationCount: '3',
    },
    servers: {
      label: 'Server browser', featuredLabel: 'Featured servers', additionalLabel: 'Additional servers', addLabel: 'Add server', loadingLabel: 'Loading server data', loadingFrame: 0,
      featured: [playDemoServer('featured-1', 0, true), playDemoServer('featured-2', 1)], additional: [playDemoServer('additional-1', 0)],
      visibility: {featureServerMessageVisible: false, rightVisible: true, featuredServersVisibleAndAvailable: true, featuredServersVisible: true,
        loadingServersProgressVisible: false, additionalServersVisible: true, additionalLabelVisible: true, serversGridVisible: true,
        ignoreAddServers: false, ignoreThirdPartyServers: false, addServerEnabled: true, addServerSelected: false,
        crossPlatformDisabledVisible: false, internetConnectionVisible: false, multiplayerBlockedVisible: false, deviceSunsettingVisible: false, newUiSwitchVisible: false},
      details: {label: 'Server details', featuredVisible: true, additionalVisible: false, addVisible: false,
        featured: playDemoFeaturedDetail(), additional: playDemoServerDetail('Local address example'),
        add: {title: 'Add server', description: 'Manage a host-owned server address.', isConsole: false}},
      notices: {crossPlatform: {text: 'Cross-platform play unavailable'}, internet: {text: 'No internet connection'}, blocked: {text: 'Multiplayer is blocked'}, featureMessage: {text: 'Featured servers are unavailable'}},
    },
    popups: {
      joinByCode: {open: false, value: '', bindings: {inputEnabled: true}, labels: {title: 'Join by code', close: 'Close code dialog', code: 'Realm code', placeholder: 'Enter code', join: 'Join code', help: 'Use a code supplied by your host.'}},
      highPing: {open: false, bindings: {closeVisible: true}, labels: {title: 'Connection warning', close: 'Close warning', join: 'Join anyway', cancel: 'Cancel connection', line1: 'This server has a high ping.', line2: 'Do you want to continue?'}},
    },
  };
}
