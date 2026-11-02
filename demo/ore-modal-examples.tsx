import {useEffect, useRef, useState} from 'react';
import {Button, Combobox, Switch} from '../src';
import {OreModal, OreModalHeader, OreModalContent, OreModalText, OreModalActions} from '../src/ore-modal';
import {OreButton} from '../src/ore-button';
import {hasHBUISevenFont, hasHBUIChineseFont, orePermissionAssets} from 'virtual:mcbeui-game-font';
import '../src/ore-modal.css';
import '../src/ore-button.css';

type Route = 'unsaved' | 'delete' | 'error';
const closeImage = orePermissionAssets?.close ? <img src={orePermissionAssets.close} alt="" draggable={false} style={{display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated'}}/> : undefined;
const titles = {unsaved: '放弃更改？', delete: '删除服务器？', error: '无法添加服务器'};
const messages = {unsaved: '服务器信息尚未保存。可以放弃更改，或返回继续编辑。', delete: '要删除这份本地服务器预览记录吗？', error: '本地预览未能添加这份记录。请检查服务器信息后重试。'};

export function OreModalExamples() {
  const [route, setRoute] = useState<Route>('unsaved'), [open, setOpen] = useState(false);
  const [width, setWidth] = useState(476), [height, setHeight] = useState(360), [available, setAvailable] = useState(320);
  const [accept, setAccept] = useState(true), [backdrop, setBackdrop] = useState(false), [scrollable, setScrollable] = useState(false);
  const [lastInputGamepad, setLastInputGamepad] = useState(false), [touchScroll, setTouchScroll] = useState(false);
  const [longText, setLongText] = useState(false), [ready, setReady] = useState(false), [fontFailed, setFontFailed] = useState(false);
  const [status, setStatus] = useState('打开一种提示，查看本地预览。');
  const host = useRef<HTMLDivElement>(null), first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = host.current, view = node?.ownerDocument.defaultView; if (!node || !view) return;
    const measure = () => setAvailable(Math.max(1, node.clientWidth)); measure();
    const observer = new view.ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      ...(hasHBUISevenFont ? [document.fonts.load('16px "Minecraft Seven v2"', 'Modal')] : []),
      ...(hasHBUIChineseFont ? [document.fonts.load('14px "Noto Sans SC"', '服务器提示')] : []),
    ]).then(() => document.fonts.ready).then(() => {if (active) setReady(true);})
      .catch(() => {if (active) {setReady(true); setFontFailed(true);}});
    return () => {active = false;};
  }, []);
  const request = (message: string) => {setStatus(accept ? message : `本次请求未被接受。${message}`); if (accept) setOpen(false);};
  const primary = () => request(route === 'delete' ? '已收到删除请求；此预览未执行删除。' : '已收到继续编辑请求，未保存或连接服务器。');
  return <div ref={host} data-testid="ore-modal-demo" style={{display: 'grid', gap: 16, minWidth: 0}}>
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12}}>
      <Combobox label="弹窗宽度" value={String(width)} options={[320, 400, 476].map(value => ({value: String(value), label: `${value} px`}))} onValueChange={value => setWidth(Number(value))}/>
      <Combobox label="弹窗高度" value={String(height)} options={[240, 360, 480].map(value => ({value: String(value), label: `${value} px`}))} onValueChange={value => setHeight(Number(value))}/>
      <Switch label="接受关闭与操作请求" checked={accept} onChange={event => setAccept(event.currentTarget.checked)}/>
      <Switch label="点击遮罩关闭" checked={backdrop} onChange={event => setBackdrop(event.currentTarget.checked)}/>
      <Switch label="自定义内容滚动" checked={scrollable} onChange={event => setScrollable(event.currentTarget.checked)}/>
      <Switch label="长内容" checked={longText} onChange={event => setLongText(event.currentTarget.checked)}/>
      <Switch label="最近使用手柄" checked={lastInputGamepad} onChange={event => setLastInputGamepad(event.currentTarget.checked)}/>
      <Switch label="触控滚动" checked={touchScroll} onChange={event => setTouchScroll(event.currentTarget.checked)}/>
    </div>
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
      {(['unsaved', 'delete', 'error'] as const).map(value => <Button key={value} disabled={!ready} onClick={() => {setRoute(value); setOpen(true);}}>{value === 'unsaved' ? '打开未保存提示' : value === 'delete' ? '打开删除提示' : '打开错误提示'}</Button>)}
    </div>
    <OreModal open={open} label={titles[route]} width={Math.min(width, available)} height={height} guiScale={2} locale="zh_CN" initialFocusRef={first} closeOnBackdrop={backdrop} lastInputGamepad={lastInputGamepad} panelProps={{id: 'ore-modal-demo-panel'}}
      onDismissRequest={detail => {
        if (detail.reason === 'native-close') {setOpen(false); setStatus('提示已由浏览器关闭。'); return;}
        request(detail.reason === 'escape' ? '已请求返回编辑。' : '已请求关闭提示。');
      }}>
      <OreModalHeader closeIcon={closeImage} closeLabel="关闭提示" hideCloseButton={!closeImage} onClose={() => {}}>{titles[route]}</OreModalHeader>
      <OreModalContent id="ore-modal-demo-content" scrollable={scrollable} scrollLabel={scrollable ? '提示内容' : undefined} scrollInputMode={touchScroll ? 'touch' : 'mouse'}>
        <OreModalText center>{messages[route]}{longText && ` ${'这是一段用于查看内容裁切和滚动的本地说明，不会执行服务器服务。'.repeat(18)}`}</OreModalText>
      </OreModalContent>
      <OreModalActions>
        {route === 'error' ? <OreButton ref={first} variant="secondary" onClick={() => request('错误提示已关闭。')}>关闭</OreButton> : <>
          <OreButton ref={first} variant="secondary" onClick={() => request(route === 'delete' ? '已收到取消删除请求。' : '已收到放弃更改请求；此预览未修改记录。')}>{route === 'delete' ? '取消' : '放弃更改'}</OreButton>
          <OreButton variant={route === 'delete' ? 'destructive' : 'primary'} onClick={primary}>{route === 'delete' ? '删除' : '继续编辑'}</OreButton>
        </>}
        {!accept && <OreButton variant="secondary" onClick={() => {setAccept(true); setOpen(false); setStatus('已退出预览，并恢复接受操作请求。');}}>退出预览</OreButton>}
      </OreModalActions>
    </OreModal>
    <p data-testid="ore-modal-demo-status" role="status" style={{margin: 0}}>{status}</p>
    <details><summary>关于这个预览</summary>
      <p>三个提示使用宿主编写的中文文案，只演示本地意图，不执行网络、持久保存或删除服务。未保存提示的“继续编辑”只关闭提示。默认遮罩不关闭，内容按设置尺寸裁切；内容滚动和遮罩关闭是显式可选的 Web 行为。最近使用手柄控制关闭图标，触控滚动是独立选项。拒绝请求时额外提供宿主“退出预览”按钮，以便离开演示。</p>
      <p>关闭图标：{closeImage ? '本地完整原图' : '未准备，使用操作按钮或 Escape 关闭'}。字体：{hasHBUISevenFont ? '本地 Seven v2' : '宿主后备字体'}，{hasHBUIChineseFont ? '本地中文字体' : '宿主后备字体'}{fontFailed ? '（加载失败，使用后备字体）' : ''}。这些预览尚未取得原生整屏像素一致性验证。</p>
    </details>
  </div>;
}
