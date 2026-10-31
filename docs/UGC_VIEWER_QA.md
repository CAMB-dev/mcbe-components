# UGCViewer：源搜索网格与可复用条目

`UGCViewer`组合原版UGC的有界窗口、真实搜索input、鼠标/触控滚动区和三列条目；`UGCItemCard`独立复用同一条目的按钮、标题、图片框与状态。它们不枚举文件、不执行原版搜索服务，也不自动打开世界。源数值和身份见 [ugc-viewer-source.json](ugc-viewer-source.json)，完整素材出处见 [ugc-reader-assets.json](ugc-reader-assets.json)。

## 最小用法

从公共入口导入；`styles.css`包含共享基础与组合样式，独立样式子路径为`mcbeui/ugc-viewer.css`。字体按项目需要另引入`mcbeui/fonts.css`或自己的合法字体。

```tsx
import { useRef, useState } from 'react';
import { Button, UGCItemCard, UGCViewer } from 'mcbeui';
import type { UGCImageFrameMaterial, UGCItem } from 'mcbeui';
import 'mcbeui/styles.css';

export function WorldPicker({ items, frameMaterial, accept = true }: {
  items: readonly UGCItem[];
  frameMaterial: UGCImageFrameMaterial;
  accept?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState('');
  const input = useRef<HTMLInputElement>(null);
  // 此例把已经接收的集合原样提供；过滤规则属于调用方。
  return <>
    <Button onClick={() => setOpen(true)}>Open picker</Button>
    <UGCViewer title="Worlds" searchLabel="World query"
      searchPlaceholder="Search worlds" size={[320, 210]} scale={1}
      items={items} imageFrameMaterial={frameMaterial} maxGridItems={12}
      query={query} searchRef={input} modal={false}
      onQueryChange={next => { if (accept) setQuery(next); }}
      hidden={!open} onAction={detail => {
        setLast(detail.item?.id ?? detail.target);
        if (accept && detail.action === 'close') setOpen(false);
      }}/>
    <UGCItemCard width={100} scale={1}
      item={{ id: 'independent', label: 'Host item' }}
      imageFrameMaterial={frameMaterial}
      onAction={detail => setLast(detail.item?.id ?? detail.target)}/>
    <output>{last}</output>
  </>;
}
```

`frameMaterial`必须由宿主给出完整图URL和物理`sourceSize`。源引用精确大写`textures/ui/White`，固定公开包没有该条目。已有小写whole候选为15²、含104个黑texel和121个白texel；不是纯白图，也没有认证为native alias。组件不默认选候选、不裁取白区、不生成白图。`item.image`同样使用宿主URL、物理尺寸与可选native图片事件；`imageContent`优先，供宿主真实动态渲染，库不读取原版texture filesystem。

## 数据、状态与引用

|接口|调用方控制|
|---|---|
|`items` /`maxGridItems`|唯一非空ID的有限集合；容量为显式非负整数，当前Web策略只取前N项，不过滤或改写集合。|
|`query` /`defaultQuery`|受控接受或拒绝，或内部初值；`onQueryChange(next,{event,input})`只请求变更。|
|`onAction`|item→`button.ugc_item`，close→`button.menu_exit`；携带已接收条目/查询快照和稳定owner事件，index只是Web集合位置。|
|`disabled` /`readOnly`|disabled阻止源动作；readOnly阻止查询和条目请求，仍可退出。`closeVisible`只控制X，`closeEnabled`也控制Escape退出。|
|`inputMode`|显式mouse或touch；`touchThumbVisible`默认false，`minThumbSize`是Web设置，不自动猜设备/controller。|
|refs|Viewer ref是真实section；`searchRef` /`closeRef` /`scrollViewportRef`及按ID的`itemRefs` /`itemContainerRefs`分别指向真实节点。Card ref是真实button，`containerRef`是独立cell wrapper。|

title、搜索无障碍名称与placeholder由宿主提供。`item.hidden`保留keyed节点但退出布局；`item.disabled`独立。`labelHeight`可显式解析源`default`高度，省略用当前Web字体的自然行盒，不能宣称原版固定10单位。

搜索源继承`max_length=14`、`text_type=ExtendedASCII`，当前真实DOM用`maxLength=14`（UTF-16 Web映射）。这些静态字段不授权剥除Unicode、猜原版长度单位或破坏IME。`fontMode=auto|latin|unicode`是已有Classic有限Han角色选择，不是恢复原版字符接受算法；真实input与composition/selection交给Web合同。

叶节点native handler与组件/祖先的`preventDefault`可否决请求。延迟递送前会重查当前节点、ID、可见/禁用、容量和root活动状态；已移除或重识别条目不能递送旧请求，仍允许的请求保留最初已接收快照。Opaque renderer和函数引用不被伪深拷贝，公共detail不暴露内部valid闭包。

## 原层级与明确Web解析

固定源`ugc_viewer_screen.json`为6,670字节、12个定义。主panel为available frame双轴−4，上限380×230；默认`size=[384,234]`、`scale=2`。`size`是宿主逻辑frame，库不自动读安全区、GUI scale或缩放以适应页面。

窗口hollow3内另有control原图alpha .8；标题top9、高10、无阴影。body宽W−16、高H−31、top23，依次padding2、search20、gap1、fill scroll、bottom1。search宽再−4，真实input centering宽−6/高−4；placeholder原16²搜索图与文本偏移18只在空输入时出现。

mouse轨列6＋右2＝8单位预留，rail显示宽3、thumb宽5、上下各2；touch为contained4、无轨、默认隐藏thumb，不套通用mouse余量。scroll content宽viewport−2。grid使用源33.33%与`56.25%x+15`：三列与own-cell-X高度解析是有限Web策略，不等于已恢复native horizontal rescale。

cell→button双轴−2→通用button content再−6→UGC content再−2，最终是cell−10；不能合成近似Card padding。label自然高度后剩余world frame为177.78%y×100%，图片再−2；保源小数，不替换为精确16:9。pressed内容Y+1，完整dark四态与focus边独立，无伪物品绘制。

`modal`默认false。显式true才启用共享Web focus containment、Tab/ShiftTab、祖先inert、scroll lock及关闭后焦点恢复；不是源modal flag或原生screen-stack恢复。可见性、嵌套modal与ref清理使用共享helper，真实浏览器默认Tab和跨document renderer仍需分别验收。

## UGC／Reader 初次接入的历史验证

UGC／Reader 初次接入新增UGCViewer /UGCItemCard与ImmersiveReader /ImmersiveReaderButton，当时177组件 /194运行时值。正式首74项67通过 /7方法失败保留，修正后14项12通过 /2只读断言失败，再修后2项通过；74个不同用例按各自最新方法均已验证，其中68项新增、6项相关导航，不合称单轮74全绿。42个完整源材质平面共1,986,950像素RGBA零差。React18.3.1 /19.3.1实际包的类型 /SSR /资源和默认Vite开发 /生产四组合通过，公开页12项通过。宿主White候选、静态reader图标、字体 /默认锚点 /provider /原生整页仍未认证。

首次七项失败分别来自独立激活按钮不在Reader根祖先链、Playwright拒绝点击aria-disabled只读控件，以及隔离输入分支使用visibility:hidden使真实input失焦。隔离改为opacity:0，并检查截图前后activeElement及状态owner的focus-within /hover不变；仍使用完整原图、原POINT期望和RGBA零容差。后续Reader只读断言再区分原生disabled的retry与aria-disabled的独立激活按钮。产品源在三次正式阶段保持不变，历史报告未被覆盖。

实际安装浏览器初轮两开发组合通过、两生产组合因测试应用宿主PNG路径失败；新隔离应用修正Vite public路径，同时保留Screenshot的模块相对输入后，两生产组合通过。原包字节不变，21个原始材质语义key、旧兼容族、TGA与合法公开字体均有实际加载证据。公开首轮五项通过后发现readonly断言指向wrapper，修正为真实button后完整12项通过；1440与390截图已检查，页面无横向溢出。

源码 /SSR /CPU独立复核、早期late-validity与modal反例保留在配套JSON证据索引；当时共享helper另有真实浏览器16次生命周期执行通过，包括嵌套、真实Tab /ShiftTab、替换、外层否决与ref清理。这只覆盖两个新族的Web适配，不推广到所有旧组件或原生引擎。

原版默认anchor、字体AA /行高、grid /provider /controller、White解析与整页RGBA均未认证。


## 共享请求时序修订：当前实际验收

共享请求时序修订保持183组件／200运行时值及206行覆盖表不变。新的132项正式合同单轮全部通过（114行为＋18材质，8次新增可信输入回归＋124次原有执行；无跳过、flaky或源码漂移，未加算导航），138个完整源／Web材质平面共3,969,420像素RGBA零差。全新0907bc04包／f38bb1索引通过React18.3.1／19.3.1类型、SSR、资源及实际开发／生产四组合；公开30个不同检查来自Portfolio首阶段16项和UGC／Reader第二阶段14项，不能称单轮30全绿。UGC／Reader晚期document否决缺陷已在当前受检请求通道与实际包中修复；原生整页、字体、provider和真实服务仍未认证。

宿主请求现在经owner window的task等待native传播结束，再检查否决与当前受支持的有效性；UGC query和Portfolio caption先排请求、后排草稿结算，Portfolio中的Reader入口沿已经延迟的受保护通道直接递送。Modal Tab及UGC Arrow／Home／End仍用早期microtask处理默认行为敏感的焦点移动，不能从请求task推导这些键的晚期document否决保证。native onClick仍同步先执行，需要手势的宿主API可放在该原生回调中；延迟请求回调不保证SDK所需的瞬时用户激活。守卫针对实现支持的React状态、身份、连接和只读／禁用等条件；任意直接DOM修改或原生属性改写不属于保证可取消待递送请求的合同。

旧e0f11实际包的五通道可信点击缺陷保留：UGC item／close／card和Reader activate／retry都在document晚期preventDefault前泄漏一次请求；各脚本否决控制组为零、正常可信点击各一次，错误为零。脚本点击不能替代可信输入。当前正式与实际安装合同验证请求递送／有效性，公开页额外验证三个真实DOCUMENT否决和三个正常可信点击的宿主状态DOM变化；公开MutationObserver证据不等于回调入口次数证明。安装首阶段四失败因观察器漏序列化event方法结果，修正方法后四组合通过，产品和断言未变；这段方法失败不能用于重分类旧包真实缺陷。公开首阶段29通过／1失败来自Reader状态定位同时匹配loading div与宿主p，最后Reader可信步骤尚未执行；只收窄两个宿主状态选择器后，完整重跑UGC／Reader14项并保留Portfolio16项。

实际证据：`.cache/classic-dispatch-tests-01/run-01/RESULT.json`（SHA256 `377bccaf2ed9b282d963b6170860506f72330330c2e6f93f20cd5fa4d6722f3f`）；`.cache/classic-dispatch-qualified-01/QUALIFICATION.json`（SHA256 `ade2d934f9daaf943e1fbb49a63aa5c6c468bb3e4d112d9919ed2011c725c21d`）；`.cache/classic-dispatch-package-01/RESULT.json`（SHA256 `e7ff771c3d490ad45f9107c786902b831c38574a96d75681fd2a1ac268f4ae5d`）；`.cache/classic-dispatch-installed-02/FINAL.json`（SHA256 `f93625d86c6c085da1e5dd0b6d8af2056761169c0fa78c3840030699edbbf9db`）；`.cache/classic-dispatch-installed-browser-02/INPUTS.json`（SHA256 `7326d89fd910dc7cfdd14a342b198acf169c66b0a3bde5622282ee1b2d9de9d2`）；`.cache/classic-dispatch-public-02/FINAL.json`（SHA256 `5ccd6eac8b0d669f14a15b2f945960e26677e7abca248d7c68068597ba1af7ea`）；`.cache/classic-dispatch-baseline-01/RESULT.json`（SHA256 `ff1410f72fde21a48cdc485b5766f8902ebf73487b3a407a18e9b8c91a199fe8`）；`.cache/classic-dispatch-installed-01/FINAL.json`（SHA256 `cfb288f744f93a3e182600990eee83a65bdb70eec2eff134b642d20efaa8812e`）；`.cache/classic-dispatch-public-01/FINAL.json`（SHA256 `16cdd2a2dc3f52142d25babe52516e452c83c1ec9df2c7afbd12701f07859e93`）；`.cache/classic-dispatch-public-02/PRECONDITIONS.json`（SHA256 `d2667a4f60cae2953eb4559da792297bfee0243f1e91a39bd877666465ebaf91`）。现有14d及更早阶段的结果保持各自历史身份。138个平面的RGBA零差仅认证有限源／Web材质合同，不新增native字体、默认锚点、provider／controller、真实截图或Reader SDK、OS IME和完整原生GUI资格。最终文档应用后须生成doc-only包，逐项比较所有产品代码／资源字节与已测0907bc04包一致。
