# ImmersiveReader：独立状态、宿主WebView与入口按钮

`ImmersiveReader`保留源loading/error弹窗与独立running渲染槽；`ImmersiveReaderButton`是可单独复用的原图入口按钮。组件只表达UI和请求，不实现阅读服务、SDK、登录、语音、网络或原版WebView。源映射见 [immersive-reader-source.json](immersive-reader-source.json)，原图身份见 [ugc-reader-assets.json](ugc-reader-assets.json)。

## 最小用法

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, ImmersiveReader, ImmersiveReaderButton } from 'mcbeui';
import type { ImmersiveReaderBindings } from 'mcbeui';
import 'mcbeui/styles.css';

export function ReaderHost({ webView, loadingVisual }: {
  webView: ReactNode;
  loadingVisual: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [bindings, setBindings] = useState<ImmersiveReaderBindings>({
    running: false, loading: true, error: false, canRetry: true,
  });
  return <>
    <ImmersiveReaderButton scale={1} label="Open reader"
      onActivate={() => setVisible(true)}/>
    <Button onClick={() => setBindings(value => ({ ...value, running: true }))}>
      Host marks renderer ready
    </Button>
    <ImmersiveReader size={[300, 190]} scale={1} visible={visible}
      popupLayout={{ kind: 'child-sum', titleWidth: 180 }}
      bindings={bindings} webView={webView} loadingVisual={loadingVisual}
      errorText="The application supplies this error." modal={false}
      onAction={detail => {
        if (detail.action === 'retry') {
          // 此处是应用选择的状态转换，不是组件/原版服务自动执行。
          setBindings(value => ({ ...value, loading: true, error: false }));
        } else setVisible(false);
      }}/>
  </>;
}
```

`styles.css`包含组合与基础样式；独立子路径为`mcbeui/immersive-reader.css`。字体按项目需要另引入公开`fonts.css`或自己的合法字体。`webView`和`loadingVisual`必填，可显式给null，但不从缺值偷偷创建服务或替代动画。源码保留WebView wrapper与children，在非running时仅隐藏；宿主仍拥有其内容、网络、跨document焦点桥和内部状态。

## 四个独立binding

|输入|源可见性|
|---|---|
|`running`|true显示填满contentRect的WebView槽，隐藏整个popup。|
|`loading`|控制popup内loading stack，不改变error/running。|
|`error`|控制popup内error stack，不改变loading/running。|
|`canRetry`|error内true显示Retry＋Cancel，false仅OK。|

loading与error可以同时true；都false时也可以保留空popup。running只隐藏popup祖先，不清空另外三个输入。库不使用单互斥enum推断服务状态。`errorText`与`labels`由应用给出；默认五个英文label对应固定源localization keys，不自动获取游戏locale。

源`#webview_update`为global、condition=visible的property-bag填充回调入口，源注释明确binding自身不执行功能。当前`webView: ReactNode`是显式host seam，没有伪造该bag结构、URL或执行引擎controller。普通段落/静态host内容不能被宣称已实现原版阅读renderer。

## 布局、原图与字体角色

源`immersive_reader.json`为6,543字节、12个定义。loading/error内容是236×108，旁边另有8×8 padding child；不是每边8的margin。祖先popup的`%c/%cm`与标题自然宽度未恢复，因此`popupLayout`强制显式选择：

- `{kind:'child-sum',titleWidth}`：声明Web child-sum解析，contents244×116、panel高147、宽`max(244,titleWidth+15)+16`；短title结果260×147只是该解析的结果。
- `{kind:'resolved',size:[width,height]}`：由宿主直接给解析后的popup尺寸。

`size`是完整逻辑host frame，正整数`scale`独立；`contentRect`可显式给内部安全区域，background仍填整个frame。库不auto-fit。窄屏应由宿主选择1×或足够大的局部容器，避免自行裁掉260单位popup。

screen background原图默认alpha .75，hollow3内control原图alpha .8；标题top13，关闭panel在源被ignored，故没有X。loading依次64² visual、loading text、fill空白、18高Cancel。error是独立smooth角色、font scale1.2、白字，下方18高按钮行，Retry/Cancel中间2单位gap。text button无阴影、pressed Y+1；native默认font/标题行盒/AA仍未知。smooth host字体可通过`--mc-reader-smooth-font`显式提供，默认Web fallback不冒充原版字体。

原loading书本声明36帧、step64、UVsize64²、12fps，但固定公开ZIP没有`book_animation`材质。`loadingVisual`必须由宿主明确提供；已有reader图的静态展示不是这张书本atlas，也不证明其动画时钟。组件不自绘原图替身。

入口button逻辑默认16²，完整原图19²；light backing为14²，内容10²，focus边全16²。图不裁切、不套glyph .3 tint，pressed局部偏移1；`size`可供具体宿主实例覆写。完整纹理与原metadata保持源字节，许可仍归Mojang。两族共用21个语义PNG key、16份raw metadata，19份既有物理PNG＋2份既有inline体，本轮不新增物理素材；Reader使用其中9项。

## 请求、禁用与生命周期

`onActivate`/`onAction`收到稳定`control`、延迟event快照、复制并冻结的accepted bindings；独立按钮的bindings为null。activate目标`button.immersive_reader`，retry为`button.error.try_again`，Cancel/OK/Escape都是`button.menu_exit`。只发请求，应用决定是否接受、改状态或隐藏；不自动screen-close。没有默认outside-click退出。

`readOnly`禁retry和独立activate，保留Cancel/OK/Escape；`disabled`挡所有源动作请求。叶handler、自身与外层/native的preventDefault可否决。ref为真实div/button；`webViewRef`、按action的`buttonRefs`/`buttonProps`独立，原native回调先处理。shared adapter对React18/19返回void，并内部执行caller cleanup，普通callback/object ref也按各自协议清理。

`modal=false`默认允许局部嵌入；显式true才适配Web焦点包含、Tab/ShiftTab、祖先inert、scroll lock与return focus。当前Tab通过共享defer helper等待祖先否决；这不是原版modal flag或native默认Tab时序已认证。原版screen入口/退出动画与结束事件、加载clock、GUI-scale/safezone/provider及WebView服务都仍由引擎或宿主拥有。

## UGC／Reader 初次接入的历史验证

UGC／Reader 初次接入新增UGCViewer /UGCItemCard与ImmersiveReader /ImmersiveReaderButton，当时177组件 /194运行时值。正式首74项67通过 /7方法失败保留，修正后14项12通过 /2只读断言失败，再修后2项通过；74个不同用例按各自最新方法均已验证，其中68项新增、6项相关导航，不合称单轮74全绿。42个完整源材质平面共1,986,950像素RGBA零差。React18.3.1 /19.3.1实际包的类型 /SSR /资源和默认Vite开发 /生产四组合通过，公开页12项通过。宿主White候选、静态reader图标、字体 /默认锚点 /provider /原生整页仍未认证。

首次七项失败分别来自独立激活按钮不在Reader根祖先链、Playwright拒绝点击aria-disabled只读控件，以及隔离输入分支使用visibility:hidden使真实input失焦。隔离改为opacity:0，并检查截图前后activeElement及状态owner的focus-within /hover不变；仍使用完整原图、原POINT期望和RGBA零容差。后续Reader只读断言再区分原生disabled的retry与aria-disabled的独立激活按钮。产品源在三次正式阶段保持不变，历史报告未被覆盖。

实际安装浏览器初轮两开发组合通过、两生产组合因测试应用宿主PNG路径失败；新隔离应用修正Vite public路径，同时保留Screenshot的模块相对输入后，两生产组合通过。原包字节不变，21个原始材质语义key、旧兼容族、TGA与合法公开字体均有实际加载证据。公开首轮五项通过后发现readonly断言指向wrapper，修正为真实button后完整12项通过；1440与390截图已检查，页面无横向溢出。

源码 /SSR /CPU独立复核、早期late-validity与modal反例保留在配套JSON证据索引；当时共享helper另有真实浏览器16次生命周期执行通过，包括嵌套、真实Tab /ShiftTab、替换、外层否决与ref清理。这只覆盖两个新族的Web适配，不推广到所有旧组件或原生引擎。

源book_animation缺失，示例静态19像素图标是宿主视觉；WebView /property bag /SDK /speech、native字体 /动画 /整页RGBA均未认证。


## 共享请求时序修订：当前实际验收

共享请求时序修订保持183组件／200运行时值及206行覆盖表不变。新的132项正式合同单轮全部通过（114行为＋18材质，8次新增可信输入回归＋124次原有执行；无跳过、flaky或源码漂移，未加算导航），138个完整源／Web材质平面共3,969,420像素RGBA零差。全新0907bc04包／f38bb1索引通过React18.3.1／19.3.1类型、SSR、资源及实际开发／生产四组合；公开30个不同检查来自Portfolio首阶段16项和UGC／Reader第二阶段14项，不能称单轮30全绿。UGC／Reader晚期document否决缺陷已在当前受检请求通道与实际包中修复；原生整页、字体、provider和真实服务仍未认证。

宿主请求现在经owner window的task等待native传播结束，再检查否决与当前受支持的有效性；UGC query和Portfolio caption先排请求、后排草稿结算，Portfolio中的Reader入口沿已经延迟的受保护通道直接递送。Modal Tab及UGC Arrow／Home／End仍用早期microtask处理默认行为敏感的焦点移动，不能从请求task推导这些键的晚期document否决保证。native onClick仍同步先执行，需要手势的宿主API可放在该原生回调中；延迟请求回调不保证SDK所需的瞬时用户激活。守卫针对实现支持的React状态、身份、连接和只读／禁用等条件；任意直接DOM修改或原生属性改写不属于保证可取消待递送请求的合同。

旧e0f11实际包的五通道可信点击缺陷保留：UGC item／close／card和Reader activate／retry都在document晚期preventDefault前泄漏一次请求；各脚本否决控制组为零、正常可信点击各一次，错误为零。脚本点击不能替代可信输入。当前正式与实际安装合同验证请求递送／有效性，公开页额外验证三个真实DOCUMENT否决和三个正常可信点击的宿主状态DOM变化；公开MutationObserver证据不等于回调入口次数证明。安装首阶段四失败因观察器漏序列化event方法结果，修正方法后四组合通过，产品和断言未变；这段方法失败不能用于重分类旧包真实缺陷。公开首阶段29通过／1失败来自Reader状态定位同时匹配loading div与宿主p，最后Reader可信步骤尚未执行；只收窄两个宿主状态选择器后，完整重跑UGC／Reader14项并保留Portfolio16项。

实际证据：`.cache/classic-dispatch-tests-01/run-01/RESULT.json`（SHA256 `377bccaf2ed9b282d963b6170860506f72330330c2e6f93f20cd5fa4d6722f3f`）；`.cache/classic-dispatch-qualified-01/QUALIFICATION.json`（SHA256 `ade2d934f9daaf943e1fbb49a63aa5c6c468bb3e4d112d9919ed2011c725c21d`）；`.cache/classic-dispatch-package-01/RESULT.json`（SHA256 `e7ff771c3d490ad45f9107c786902b831c38574a96d75681fd2a1ac268f4ae5d`）；`.cache/classic-dispatch-installed-02/FINAL.json`（SHA256 `f93625d86c6c085da1e5dd0b6d8af2056761169c0fa78c3840030699edbbf9db`）；`.cache/classic-dispatch-installed-browser-02/INPUTS.json`（SHA256 `7326d89fd910dc7cfdd14a342b198acf169c66b0a3bde5622282ee1b2d9de9d2`）；`.cache/classic-dispatch-public-02/FINAL.json`（SHA256 `5ccd6eac8b0d669f14a15b2f945960e26677e7abca248d7c68068597ba1af7ea`）；`.cache/classic-dispatch-baseline-01/RESULT.json`（SHA256 `ff1410f72fde21a48cdc485b5766f8902ebf73487b3a407a18e9b8c91a199fe8`）；`.cache/classic-dispatch-installed-01/FINAL.json`（SHA256 `cfb288f744f93a3e182600990eee83a65bdb70eec2eff134b642d20efaa8812e`）；`.cache/classic-dispatch-public-01/FINAL.json`（SHA256 `16cdd2a2dc3f52142d25babe52516e452c83c1ec9df2c7afbd12701f07859e93`）；`.cache/classic-dispatch-public-02/PRECONDITIONS.json`（SHA256 `d2667a4f60cae2953eb4559da792297bfee0243f1e91a39bd877666465ebaf91`）。现有14d及更早阶段的结果保持各自历史身份。138个平面的RGBA零差仅认证有限源／Web材质合同，不新增native字体、默认锚点、provider／controller、真实截图或Reader SDK、OS IME和完整原生GUI资格。最终文档应用后须生成doc-only包，逐项比较所有产品代码／资源字节与已测0907bc04包一致。
