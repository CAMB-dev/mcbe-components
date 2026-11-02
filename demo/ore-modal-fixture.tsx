import {StrictMode, useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {OreModal, OreModalHeader, OreModalContent, OreModalText, OreModalActions} from '../src/ore-modal';
import {OreButton} from '../src/ore-button';
import {hasHBUISevenFont, hasHBUIChineseFont, orePermissionAssets} from 'virtual:mcbeui-game-font';
import '../src/ore-modal.css';
import '../src/ore-button.css';

export interface OreModalConfiguration {
  mounted: boolean; acceptDismiss: boolean; preventKey: boolean; preventCancel: boolean;
  preventBackdrop: boolean; closeOnBackdrop: boolean; readOnly: boolean; scrollable: boolean;
  longText: boolean; width: number; height: number; revision: number;
  lastInputGamepad: boolean; touchScroll: boolean;
}
interface Request {owner: 'primary' | 'child'; reason: string; nativeType: string; ownerTag: string}
interface API {
  configure: (value: Partial<OreModalConfiguration>) => void; clear: () => void;
  setOpen: (value: boolean) => void;
  dialog: HTMLDialogElement | null; child: HTMLDialogElement | null; ready: boolean; assetsAvailable: boolean;
  requests: Request[]; actions: string[]; native: string[]; refs: string[];
}
declare global {interface Window {oreModalFixture: API}}
const api: API = {configure: () => {}, setOpen: () => {}, clear: () => {api.requests.length = 0; api.actions.length = 0; api.native.length = 0;}, dialog: null, child: null, ready: false, assetsAvailable: !!orePermissionAssets?.close, requests: [], actions: [], native: [], refs: []};
window.oreModalFixture = api;
const closeIcon = orePermissionAssets?.close ? <img src={orePermissionAssets.close} alt="" draggable={false} style={{display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated'}}/> : undefined;
const defaults: OreModalConfiguration = {mounted: true, acceptDismiss: true, preventKey: false, preventCancel: false, preventBackdrop: false, closeOnBackdrop: false, readOnly: false, scrollable: false, longText: false, width: 340, height: 360, revision: 0, lastInputGamepad: false, touchScroll: false};

function Fixture() {
  const [config, setConfig] = useState(defaults), [open, setOpen] = useState(false), [nested, setNested] = useState(false);
  const first = useRef<HTMLButtonElement>(null), childFirst = useRef<HTMLButtonElement>(null);
  api.configure = patch => setConfig(old => ({...old, ...patch}));
  api.setOpen = setOpen;
  const attach = useCallback((node: HTMLDialogElement | null) => {api.dialog = node; api.refs.push(node ? 'primary:attach' : 'primary:detach');}, []);
  const attachChild = useCallback((node: HTMLDialogElement | null) => {api.child = node; api.refs.push(node ? 'child:attach' : 'child:detach');}, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      ...(hasHBUISevenFont ? [document.fonts.load('16px "Minecraft Seven v2"', 'Modal')] : []),
      ...(hasHBUIChineseFont ? [document.fonts.load('14px "Noto Sans SC"', '弹窗')] : []),
    ]).then(() => document.fonts.ready).then(() => {if (active) api.ready = true;});
    return () => {active = false;};
  }, []);
  return <div>
    <button id="ore-modal-open" disabled={!closeIcon} onClick={() => setOpen(true)}>打开主弹窗</button>
    {!closeIcon && <p>需要本地 OreUI 关闭图标。请运行 scripts/use-local-ore-permissions-assets.py 后重启预览。</p>}
    {config.mounted && closeIcon && <OreModal id="ore-modal-primary" ref={attach} open={open} label="主弹窗" width={config.width} height={config.height} guiScale={2} locale="zh_CN" initialFocusRef={first}
      panelProps={{id: 'ore-modal-primary-panel'}} closeOnBackdrop={config.closeOnBackdrop} lastInputGamepad={config.lastInputGamepad}
      onKeyDown={event => {api.native.push(`key:${event.key}`); if (config.preventKey) event.preventDefault();}}
      onCancel={event => {api.native.push('cancel'); if (config.preventCancel) event.preventDefault();}}
      onClick={event => {api.native.push('click'); if (config.preventBackdrop) event.preventDefault();}}
      onDismissRequest={detail => {api.requests.push({owner: 'primary', reason: detail.reason, nativeType: detail.event.type, ownerTag: detail.event.currentTarget.tagName}); if (config.acceptDismiss) setOpen(false);}}>
      <OreModalHeader closeIcon={closeIcon} closeLabel="关闭主弹窗" onClose={() => {}}>主弹窗</OreModalHeader>
      <OreModalContent scrollable={config.scrollable} scrollLabel={config.scrollable ? '主弹窗内容' : undefined} scrollInputMode={config.touchScroll ? 'touch' : 'mouse'}>
        <OreModalText>宿主内容 {config.revision}{config.longText && ' 可滚动的长内容。'.repeat(180)}</OreModalText>
        <label>预览草稿<input id="ore-modal-draft" defaultValue="保留输入内容"/></label>
        <button id="ore-modal-nested-open" onClick={() => setNested(true)}>打开子弹窗</button>
      </OreModalContent>
      <OreModalActions>
        <OreButton id="ore-modal-cancel" ref={first} variant="secondary" onClick={() => setOpen(false)}>取消</OreButton>
        <OreButton id="ore-modal-continue" variant="primary" disabled={config.readOnly} onClick={() => api.actions.push('continue')}>继续</OreButton>
      </OreModalActions>
      <OreModal id="ore-modal-child" ref={attachChild} open={nested && open} label="子弹窗" width={Math.min(config.width, 300)} height={240} guiScale={2} locale="zh_CN" initialFocusRef={childFirst}
        onDismissRequest={detail => {api.requests.push({owner: 'child', reason: detail.reason, nativeType: detail.event.type, ownerTag: detail.event.currentTarget.tagName}); setNested(false);}}>
        <OreModalHeader closeIcon={closeIcon} closeLabel="关闭子弹窗" onClose={() => {}}>子弹窗</OreModalHeader>
        <OreModalContent><OreModalText>独立的上层提示。</OreModalText></OreModalContent>
        <OreModalActions><OreButton ref={childFirst} onClick={() => setNested(false)}>返回主弹窗</OreButton></OreModalActions>
      </OreModal>
    </OreModal>}
  </div>;
}
createRoot(document.getElementById('ore-modal-root')!).render(location.search.includes('strict') ? <StrictMode><Fixture/></StrictMode> : <Fixture/>);
