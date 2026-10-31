import { useLayoutEffect, useRef, useState } from 'react';
import { StartMenu, StartMenuActionStack, StartMenuFooter } from '../src/start-menu';
import type { StartMenuActionId, StartMenuButton, StartMenuControlState, StartMenuNormalRows, StartMenuTitleProfile } from '../src/start-menu';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';

const state = (visible = true): StartMenuControlState => ({ included: true, visible, enabled: true });
const button = (action: StartMenuActionId, label: string, target = `button.menu_${action.replaceAll('-', '_')}`): StartMenuButton => ({ action, label, target, state: state() });

export function StartMenuExamples() {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800), [scale, setScale] = useState(2);
  const [newPlayer, setNewPlayer] = useState(false), [trial, setTrial] = useState(false), [signIn, setSignIn] = useState(false);
  const [unread, setUnread] = useState(true), [inboxState, setInboxState] = useState<1 | 2>(1);
  const [profileAction, setProfileAction] = useState(false);
  const [disabled, setDisabled] = useState(false), [accept, setAccept] = useState(true), [popup, setPopup] = useState(false);
  const [titleProfile, setTitleProfile] = useState<StartMenuTitleProfile>('win10');
  const [status, setStatus] = useState('Choose an action. Navigation and services belong to the application.');
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  const size = [Math.max(151, Math.floor(width / scale)), 260] as const;
  const normalRows: StartMenuNormalRows = {
    play: { state: state(), button: button('play', 'Play', 'button.host_play_request') },
    ...(trial ? {
      trialSettingsStore: { state: state(), settings: button('settings', 'Settings'), store: { state: state(), button: button('store', 'Marketplace') } },
      buyGame: { state: state(), button: button('buy-game', 'Unlock Full Game') },
    } : {
      settings: { state: state(), button: button('settings', 'Settings') },
      realms: { state: state(), button: button('realms', 'Realms') },
      store: { state: state(), button: button('store', 'Marketplace') },
    }),
  };
  const actions = {
    normal: { state: state(!newPlayer), rows: normalRows },
    newPlayer: { state: state(newPlayer), rows: {
      trialInfo: trial ? { state: state(), content: 'Application trial information' } : undefined,
      trialSpacerIncluded: trial,
      getStarted: { state: state(), button: button('get-started', 'Get Started') },
      mainMenu: { state: state(), button: button('main-menu', 'Main Menu') },
    } },
  };
  const footer = { copyright: '©Mojang AB', version: 'Host preview', development: { state: state(false), text: 'Application development text' } };
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
      <Combobox label="Start menu GUI scale" value={String(scale)} onValueChange={v => setScale(Number(v))} options={[1, 2, 3].map(n => ({ value: String(n), label: `${n}×` }))}/>
      <Combobox label="Start menu title profile" value={titleProfile} onValueChange={v => setTitleProfile(v as StartMenuTitleProfile)} options={[{ value: 'win10', label: 'Windows Classic' }, { value: 'osx', label: 'OS X Classic' }, { value: 'pocket-console', label: 'Pocket / console Classic' }]}/>
      <Combobox label="Inbox icon" value={String(inboxState)} onValueChange={v => setInboxState(Number(v) as 1 | 2)} options={[{ value: '1', label: 'Bell' }, { value: '2', label: 'Mail' }]}/>
      <Switch label="New player flow" checked={newPlayer} onChange={e => setNewPlayer(e.target.checked)}/>
      <Switch label="Trial rows" checked={trial} onChange={e => setTrial(e.target.checked)}/>
      <Switch label="Show sign-in" checked={signIn} onChange={e => setSignIn(e.target.checked)}/>
      <Switch label="Unread inbox" checked={unread} onChange={e => setUnread(e.target.checked)}/>
      <Switch label="Show profile action" checked={profileAction} onChange={e => setProfileAction(e.target.checked)}/>
      <Switch label="Disable start menu" checked={disabled} onChange={e => setDisabled(e.target.checked)}/>
      <Switch label="Accept start requests" checked={accept} onChange={e => setAccept(e.target.checked)}/>
      <Button disabled={disabled} onClick={() => setPopup(true)}>External-link confirmation</Button>
    </div>
    <div ref={host} data-testid="start-menu-preview-host" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', background: '#46616c' }}>
      <StartMenu label="Classic start menu example" size={size} scale={scale} visible title={{ profile: titleProfile }} actions={actions}
        auxiliary={{ state: state(), upper: { state: state(signIn), signInProfile: 'standard', signIn: button('sign-in', 'Sign In'), gamertag: { state: state(false), text: 'Host player' } }, lower: {
          state: state(), achievements: button('achievements', 'Achievements'),
          inbox: { button: button('inbox', 'Inbox'), iconState: inboxState, unread: { state: state(unread) } },
          profileA: { button: { ...button('profile', 'Profile'), state: state(profileAction) }, showGamerpic: false },
        } }}
        profile={{ viewer: { state: state(), portrait: { state: state(false), content: null } }, controls: { state: state(), dressingRoom: { button: button('dressing-room', 'Dressing Room'), profile: 'text' } } }}
        footer={footer} disabled={disabled} canQuit
        friends={{ state: state(), button: button('friends', 'Friends'), content: 'Friends (0)' }}
        externalPopup={popup ? { state: state(), title: 'External link', body: 'Your application decides whether to open an external page. This demonstration only records the request.', close: { state: state(), label: 'Close external-link confirmation' },
          externalButton: button('external-browser', 'Continue', 'button.host_external_request'), backButton: button('external-popup-close', 'Go Back', 'button.host_popup_back'), onCloseRequest: () => setPopup(false) } : undefined}
        onAction={detail => {
          if (detail.action === 'external-popup-close') { setPopup(false); return; }
          if (detail.action === 'main-menu' && accept) setNewPlayer(false);
          setStatus(`${detail.action}: ${accept ? 'accepted' : 'declined'} by the application. No game service or external page was opened.`);
        }} onExitRequest={() => setStatus('Exit requested. The application owns navigation and lifetime.')}/>
    </div>
    <p role="status" style={{ margin: 0, fontSize: 12 }}>{status}</p>
    <p style={{ margin: 0, fontSize: 12 }}>Source-sized Classic frame: {size.join(' × ')} units at {scale}×. Use 1× for a complete narrow preview. The background and player portrait are application renderer slots; this example leaves the portrait empty. Education titles require application-supplied artwork.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
      <div><p style={{ fontSize: 12 }}>Reusable action stack</p><StartMenuActionStack {...actions} scale={1} onAction={detail => setStatus(`Standalone ${detail.action} requested.`)}/></div>
      <div style={{ width: 300, maxWidth: '100%', minWidth: 0, overflowX: 'auto' }}><p style={{ fontSize: 12 }}>Reusable footer</p><StartMenuFooter {...footer} width={300} scale={1}/></div>
    </div>
  </div>;
}
