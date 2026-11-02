import {useEffect, useRef, useState} from 'react';
import {Button, Combobox, Switch} from '../src';
import {OreExternalServerForm} from '../src/ore-external-server-form';
import type {OreExternalServerFormProps} from '../src/ore-external-server-form';
import {OreButton} from '../src/ore-button';
import {OreActionBar} from '../src/ore-action-bar';
import {hasHBUITenFont, hasHBUISevenFont, hasHBUIChineseFont, oreTextFieldSkins, oreExternalServerIcons, orePermissionAssets} from 'virtual:mcbeui-game-font';
import '../src/ore-external-server-form.css';
import '../src/ore-action-bar.css';

type Values = NonNullable<OreExternalServerFormProps['value']>;
type Request = Parameters<NonNullable<OreExternalServerFormProps['onAction']>>[0];
const initial: Values = {name: '示例服务器', address: 'play.example.invalid', port: '19132'};
const labels = {name: '服务器名称', address: '服务器地址', port: '端口', add: '添加服务器', addAndPlay: '添加并游玩', delete: '删除服务器', save: '保存服务器'};
const image = (src: string) => <img src={src} alt="" draggable={false} style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated'}}/>;
const usage = `<OreExternalServerForm mode="add" title="添加服务器" backLabel="返回"
  labels={labels} skins={wholeTextFieldSkins} size={[width, height]}
  viewportSize={[width, height]} safeArea={{top: 0, left: 0, right: 0}}
  value={values} onValueChange={setValues} onAction={handleRequest}/>`;

export function OreExternalServerExamples() {
  const host = useRef<HTMLDivElement>(null), form = useRef<HTMLFormElement>(null), reopen = useRef<HTMLButtonElement>(null), confirmationCancel = useRef<HTMLButtonElement>(null), hadPending = useRef(false);
  const [width, setWidth] = useState(320), [height, setHeight] = useState(560);
  const [mode, setMode] = useState<'add' | 'edit'>('add'), [values, setValues] = useState<Values>({...initial});
  const [record, setRecord] = useState<Values | null>(null), [pending, setPending] = useState<Request | null>(null);
  const [disabled, setDisabled] = useState(false), [readOnly, setReadOnly] = useState(false), [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false), [fontFailure, setFontFailure] = useState(false);
  const [portFeedback, setPortFeedback] = useState(''), [status, setStatus] = useState('编辑服务器信息，添加或保存一份本地预览记录。');
  const resourcesReady = !!oreTextFieldSkins && !!oreExternalServerIcons && !!orePermissionAssets?.back;
  const guiScale = width >= 700 ? 2 : 1;
  const modeProps = mode === 'add' ? {mode: 'add' as const} : {mode: 'edit' as const};
  useEffect(() => {
    const node = host.current, view = node?.ownerDocument.defaultView;
    if (!node || !view) return;
    const measure = () => setWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = new view.ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    const fonts = document.fonts;
    const requests = [
      ...(hasHBUITenFont ? [fonts.load('20px "Minecraft Ten v2"', 'Server')] : []),
      ...(hasHBUISevenFont ? [fonts.load('16px "Minecraft Seven v2"', 'Server name')] : []),
      ...(hasHBUIChineseFont ? [fonts.load('16px "Noto Sans SC"', '服务器名称')] : []),
    ];
    Promise.all(requests).then(() => fonts.ready).then(() => {if (active) setReady(true);})
      .catch(() => {if (active) {setFontFailure(true); setReady(true);}});
    return () => {active = false;};
  }, []);
  useEffect(() => {if (!open) reopen.current?.focus({preventScroll: true});}, [open]);
  useEffect(() => {
    if (pending) confirmationCancel.current?.focus();
    else if (hadPending.current && open) form.current?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();
    hadPending.current = !!pending;
  }, [pending, open]);
  const request = (detail: Request) => {
    if (detail.action === 'back') {
      if (detail.dirty) {setPending(detail); setStatus('返回前，请确认是否放弃本次编辑。');}
      else {setOpen(false); setStatus('预览已关闭。');}
    } else if (detail.action === 'delete-confirmation') {
      setPending(detail); setStatus('删除前，请确认是否移除本地预览记录。');
    } else {
      setRecord({...detail.value});
      setStatus(detail.action === 'add-and-play'
        ? `已保留预览记录并收到连接意图：${detail.value.address}:${detail.value.port}。本示例不会连接网络。`
        : `已保留本地预览记录：${detail.value.name} · ${detail.value.address}:${detail.value.port}`);
    }
  };
  const confirm = () => {
    if (!pending) return;
    if (pending.action === 'back') {setOpen(false); setStatus('已确认返回，预览已关闭。');}
    else {setRecord(null); setStatus(`已确认删除本地预览记录：${pending.value.name}`);}
    setPending(null);
  };

  return <section data-testid="ore-external-server-demo" aria-label="OreUI 外部服务器示例" style={{display: 'grid', gap: 16, minWidth: 0, maxWidth: '100%'}}>
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, minWidth: 0}}>
      <div style={{width: 220, maxWidth: '100%'}}><Combobox label="OreUI 表单模式" value={mode} disabled={pending !== null}
        options={[{value: 'add', label: '添加服务器'}, {value: 'edit', label: '编辑服务器'}]} onValueChange={next => setMode(next as 'add' | 'edit')}/></div>
      <div style={{width: 180, maxWidth: '100%'}}><Combobox label="预览高度" value={String(height)} onValueChange={next => setHeight(Number(next))}
        options={[420, 560, 720].map(value => ({value: String(value), label: `${value} px`}))}/></div>
      <Switch label="只读 OreUI 表单" checked={readOnly} onChange={event => setReadOnly(event.currentTarget.checked)}/>
      <Switch label="禁用 OreUI 表单" checked={disabled} onChange={event => setDisabled(event.currentTarget.checked)}/>
      <Button ref={reopen} disabled={open} onClick={() => {setOpen(true); setStatus('预览已打开，继续编辑。');}}>打开预览</Button>
      <Button disabled={!open || disabled || readOnly || pending !== null || !resourcesReady || !ready} onClick={() => form.current?.reset()}>重置表单</Button>
    </div>
    <div ref={host} data-testid="ore-external-server-demo-stage" style={{width: '100%', maxWidth: '100%', minWidth: 0, background: '#203040'}}>
      {!resourcesReady ? <div style={{padding: 16}}>
        <p>尚未准备完整的本地 OreUI 材质。运行输入框、服务器图标和权限图标准备脚本后，重启预览即可查看。</p>
        <details><summary>准备命令与使用方式</summary><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{`python scripts/use-local-ore-text-field-assets.py\npython scripts/use-local-ore-external-server-assets.py\npython scripts/use-local-ore-permissions-assets.py\n\n${usage}`}</pre></details>
      </div> : !ready ? <p style={{padding: 16}}>正在加载预览字体…</p> : <>
        <div hidden={!open}>
          <OreExternalServerForm ref={form} {...modeProps} title={mode === 'add' ? '添加服务器' : '编辑服务器'} backLabel="返回服务器列表"
            formProps={{id: 'ore-external-server-demo-form', ...{'data-testid': 'ore-external-server-demo-form'}}}
            labels={labels} skins={oreTextFieldSkins!} size={[width, height]} viewportSize={[width, height]} safeArea={{top: 0, left: 0, right: 0}}
            guiScale={guiScale} locale="zh_CN" inputMode="mouse" value={values} disabled={disabled || pending !== null} readOnly={readOnly}
            placeholders={{name: '输入服务器名称', address: '输入服务器地址'}}
            descriptions={{name: '给服务器起一个容易识别的名称。', address: '例如 play.example.invalid', port: portFeedback || '默认端口为 19132。'}}
            editIcons={{delete: image(oreExternalServerIcons!.delete), save: image(oreExternalServerIcons!.save)}} backIcon={image(orePermissionAssets!.back)}
            onValueChange={(next, detail) => {setValues(next); if (detail.origin === 'reset') {setPortFeedback(''); setStatus('表单已重置。');} else if (detail.field === 'port' && detail.origin === 'input') setPortFeedback('');}}
            onPortInvalid={detail => {const text = detail.reason === 'above-max' ? '端口超过上限，已改为 65535。' : '请输入数字端口，已恢复为 19132。'; setPortFeedback(text); setStatus(text);}}
            onAction={request}/>
        </div>
        {!open && <p style={{padding: 16, margin: 0}}>预览已关闭，可以使用“打开预览”继续。</p>}
      </>}
    </div>
    {pending && <aside data-testid="ore-external-server-demo-confirmation" aria-label="预览宿主确认" style={{padding: 16, border: '1px solid currentColor', display: 'grid', gap: 12}}>
      <p style={{margin: 0}}>{pending.action === 'back' ? '放弃本次编辑并返回？' : '删除这份本地预览记录？'}</p>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
        <Button ref={confirmationCancel} onClick={() => {setPending(null); setStatus('已取消，继续编辑服务器。');}}>取消</Button><Button onClick={confirm}>确认{pending.action === 'back' ? '返回' : '删除'}</Button>
      </div>
    </aside>}
    <p data-testid="ore-external-server-demo-status" role="status" style={{margin: 0, overflowWrap: 'anywhere'}}>{status}</p>
    <output data-testid="ore-external-server-demo-record" aria-label="本地预览记录" style={{overflowWrap: 'anywhere'}}>{record ? `${record.name} · ${record.address}:${record.port}` : '尚无本地预览记录'}</output>
    <section aria-label="独立 OreUI 操作栏" style={{minWidth: 0}}>
      <h3 style={{fontSize: '1em'}}>独立操作栏</h3>
      <OreActionBar label="可复用操作栏" guiScale={guiScale} locale="zh_CN">
        <OreButton horizontal variant="secondary" onClick={() => setStatus('已请求取消独立示例操作。')}>取消</OreButton>
        <OreButton horizontal variant="primary" onClick={() => setStatus('已请求继续独立示例操作。')}>继续</OreButton>
      </OreActionBar>
    </section>
    <details><summary>关于这个示例</summary>
      <p>添加与保存只更新本地预览记录；连接仅记录意图。删除和有改动时返回使用页面上的宿主确认区域，它不是已复刻的游戏弹窗。切换添加与编辑模式保留原生输入框和字符串内容。</p>
      <p>端口失焦按当前来源规则处理：允许 0，保留有效前导零；空值或非数字恢复为 19132，大于 65535 改为 65535。字段本身不运行保存、连接或过滤服务。</p>
      <p>当前宿主画布 {width} × {height} CSS px，GUI scale {guiScale}，安全区为显式 0。字体：{hasHBUITenFont && hasHBUISevenFont ? '本地 Ten v2 / Seven v2' : '宿主后备字体'}；中文：{hasHBUIChineseFont ? '本地中文字体' : '宿主后备字体'}{fontFailure ? '（本次加载失败，使用后备字体）' : ''}。布局按画布宽度重排，没有 CSS 缩放；本示例不声明原生整屏像素一致。</p>
      <pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{usage}</pre>
    </details>
  </section>;
}
