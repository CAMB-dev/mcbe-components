import {useEffect, useRef, useState} from 'react';
import {Button, Switch} from '../src';
import {OreFieldSection, OreTextField} from '../src/ore-text-field';
import {hasHBUIChineseFont, hasHBUISevenFont, oreTextFieldSkins} from 'virtual:mcbeui-game-font';
import '../src/ore-text-field.css';

const sample = '我的服务器';
const usage = `<OreFieldSection label="服务器名称" description="为服务器选择一个名称。">
  <OreTextField skins={{normal: normalWholeUrl, disabled: disabledWholeUrl}}
    value={name} onChange={event => setName(event.currentTarget.value)}/>
</OreFieldSection>`;

/** Local gallery host: private images are optional and never imported by the library. */
export function OreTextFieldExamples() {
  const focusInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(sample), [accept, setAccept] = useState(true);
  const [invalid, setInvalid] = useState(false), [fontsReady, setFontsReady] = useState(false);
  const [status, setStatus] = useState('可以编辑名称，或用 Tab 在字段之间移动。');
  useEffect(() => {
    let active = true;
    const fonts = document.fonts;
    Promise.all([
      ...(hasHBUISevenFont ? [fonts.load('16px "Minecraft Seven v2"', 'Server name')] : []),
      ...(hasHBUIChineseFont ? [fonts.load('16px "Noto Sans SC"', '服务器名称')] : []),
    ]).then(() => fonts.ready).then(() => {if (active) setFontsReady(true);});
    return () => {active = false;};
  }, []);

  return <div data-testid="ore-text-field-demo" style={{display: 'grid', gap: 16, minWidth: 0}}>
    {!oreTextFieldSkins ? <div>
      <p>尚未准备本地 OreUI 输入框材质。请先运行 <code>python scripts/use-local-ore-text-field-assets.py</code>，再重启预览。</p>
      <details><summary>查看使用方式</summary><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{usage}</pre></details>
    </div> : <>
      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16}}>
        <Switch label="接受名称修改" checked={accept} onChange={event => setAccept(event.currentTarget.checked)}/>
        <Switch label="显示地址反馈" checked={invalid} onChange={event => setInvalid(event.currentTarget.checked)}/>
        <Button onClick={() => focusInput.current?.focus()}>聚焦空字段</Button>
      </div>
      <div data-testid="ore-text-field-demo-fields" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, minWidth: 0}}>
        <OreFieldSection label="服务器名称" description="为服务器选择一个容易识别的名称。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} name="ore-server-name" value={name}
            onChange={event => {const next = event.currentTarget.value; if (accept) setName(next); setStatus(accept ? `名称已更新为：${next || '（空）'}` : `本次修改未被接受；当前名称：${name}`);}}/>
        </OreFieldSection>
        <OreFieldSection label="空字段" description="点击字段或使用上方按钮聚焦。" locale="zh_CN" guiScale={2}>
          <OreTextField ref={focusInput} skins={oreTextFieldSkins} placeholder="输入服务器名称"/>
        </OreFieldSection>
        <OreFieldSection label="不可用字段" description="此字段暂时不能编辑。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} defaultValue="当前不可用" disabled/>
        </OreFieldSection>
        <OreFieldSection label="只读字段" description="可以聚焦和选择文字。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} value="play.example.invalid" readOnly/>
        </OreFieldSection>
        <OreFieldSection label="服务器地址" description="填写要连接的服务器地址。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} defaultValue="play.example.invalid" invalid={invalid}
            invalidMessage={invalid ? '此地址暂不可连接，请检查后重试。' : undefined}/>
        </OreFieldSection>
        <OreFieldSection label="中文与长文本" description="文字超出可见宽度时，可以在输入框内移动光标。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} defaultValue="欢迎来到我们的方块世界，和朋友一起建造、探索与冒险。A long server name without an inherited Classic length limit."/>
        </OreFieldSection>
      </div>
      <form data-testid="ore-text-field-demo-native-form" style={{display: 'grid', gap: 12, minWidth: 0}}
        onSubmit={event => {event.preventDefault(); const data = new FormData(event.currentTarget); setStatus(`已读取表单：${String(data.get('nativeName'))} / ${String(data.get('nativePort'))}`);}}
        onReset={() => setStatus('字段已恢复为表单初始值。')}>
        <OreFieldSection label="独立字段组" description="这里使用原生表单提交与重置。端口保留为文字。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} name="nativeName" defaultValue="原始名称"/>
        </OreFieldSection>
        <OreFieldSection label="端口文字" description="这个可复用字段不限制业务格式。" locale="zh_CN" guiScale={2}>
          <OreTextField skins={oreTextFieldSkins} name="nativePort" inputMode="numeric" defaultValue="019132"/>
        </OreFieldSection>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}><Button type="submit">读取表单</Button><Button type="reset">重置字段</Button></div>
      </form>
      <p role="status" data-testid="ore-text-field-demo-status" style={{margin: 0}}>{status}</p>
      <details><summary>示例范围与使用方式</summary>
        <p>此处展示 OreUI 菜单输入框和可复用字段组，不包含服务器保存或连接服务。名称修改是否接受、地址反馈都由这个示例的宿主决定；字段本身不校验端口、截断文字或执行业务服务。</p>
        <p>材质为本机安装中的两个完整原图，仅供本地预览。字体：{hasHBUISevenFont ? '本地 Seven v2' : '宿主后备字体'}；中文：{hasHBUIChineseFont ? '本地中文字体' : '宿主后备字体'}；{fontsReady ? '字体加载已就绪' : '正在等待字体加载'}。此示例未声明与原生整屏像素一致。</p>
        <pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{usage}</pre>
      </details>
    </>}
  </div>;
}
