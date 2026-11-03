# Settings 源码基础件

当前源码为 **264 个组件＋6 个数据导出＋13 个函数＝283 个运行时值**。基础件 `SettingsFrame`、`SettingsNavigation`、`SettingsFields` 和纯函数 `layoutSettingsFrame` 对应Classic设置页框架、导航与字段内核；本轮另增 `WorldGameSettings`、`WorldMultiplayerSettings`、`WorldSettingsNavigation`，提供完整具名69／8字段快照及17＋5导航子树。详见 [WORLD_SETTINGS_FIELDS.md](WORLD_SETTINGS_FIELDS.md)。**完整公共 `WorldSettingsScreen` 尚未实现**，引擎规则与世界服务仍由宿主负责。

上一261组件基础阶段保留其原受检身份，见 [基础阶段验证](SETTINGS_SOURCE_QA.md)。当前package03两peer各283值，新增World14组／24负类型合同、Node108、普通交互74、材质14、实际安装四组合和built展示6项分别通过。完整原生字体、默认几何与整页像素仍未认证，见 [最新记录](WORLD_SETTINGS_FIELDS_QA.md)。

## 来源与实现范围

来源固定为 `Mojang/bedrock-samples` commit `15701fa9c13923f12662984c32c124327e40e3d3` 的 `settings_screen.json`、`settings_common.json`、`settings_sections/world_section.json` 及有限继承依赖。原文声明、Web布局政策、浏览器材质检查和原生引擎行为分别处理。

- Frame 保留 selector／content 两栏、顶部标题、返回按钮、独立滚动、header／footer 插槽及 content_area popup host。World 源 header／footer 内容为空，不添加 Save footer。
- Navigation 保留 source radio 的行状态、outline／color 两层图标、分组与留白，使用原始材质。
- Fields 渲染宿主提供的有序字段快照，不读取世界存档、账号或网络，也不推导权限、选项、依赖规则或数值域。

旧 `SettingsPanel`／`NavigationList` 仍是通用组合 API；本阶段没有改变它们的合同，也不把其任意 children 当完整设置页。

## SettingsFrame 与 layoutSettingsFrame

三个新组件均转发 `HTMLDivElement` ref。Frame 的核心属性如下。

| 属性 | 合同 |
| --- | --- |
| `layout: SettingsFrameLayout` | 必填 `size`、整数 `scale`、已求值 `dialogRect`、`backgroundHeight`、`variant`、`inputMode`、`mouseRailAllocation`、两栏 scrollbar visibility、content header／footer 高度 |
| `variant` | `navigation` 使用双栏；`fullscreen-content` 无 selector／divider，内容取独立源比例 |
| `mouseRailAllocation` | `reserve` 始终保留鼠标轨道槽；`when-visible` 只在对应显式可见标记为真时保留。轨道绘制与占位独立；touch 不保留鼠标槽 |
| `background` | 显式完整图像 `{src, sourceSize, resolution}`；`resolution` 为 `exact-source` 或 `host-resolved` |
| 标题／字体 | `label`、`dialogTitle`、`sectionTitle`、`font`、`titleFont`、`titleShadow`、`titleVerticalAlignment: top / center`、`dialogTitleAlignment: left / center` 均必填 |
| `back` | 显式 `visible`、`enabled`、`label`、命中 `box`、局部状态图 `paintBox` 与 `glyphOffset`，不从 glyph 大小猜命中区 |
| 命名内容 | `selectorContent`、`content` 必填，可传 `null`；可选 `headerContent`／`footerContent`。不接受任意 children 或 HTML注入 |
| 滚动／popup | 两栏必填名称 `selectorScrollLabel`／`contentScrollLabel`；提供 `selectorViewportRef`、`contentViewportRef` 与 `popupHostRef` |
| 请求／状态 | `onRequest`、`controllerRef`、`backButtonRef`、`backButtonProps`；可选 `disabled`、`menuCancelEnabled`、`modal`、`hidden`、`inert` |

`layoutSettingsFrame(layout)` 不访问 DOM 或字体，返回 `SettingsFrameGeometry`：background、topBar、两标题、可空 selector、content、contentArea、header／footer 与可空 divider。Pane 包含 `box`、`viewportWidth`、`contentWidth`、`contentOffset`、`railReservation`。坐标是 source logical units，`scale` 用于实际 CSS 布局；分数坐标保持分数，不声称已恢复原生量化。

双栏源比例为 selector 宽 `40%−3`、content 宽 `60%−8`；fullscreen-content 宽 `80%`。鼠标轨道占位为8，pane内容横向内缩合计4。调用方应把返回的 `contentWidth` 传给 Navigation／Fields，避免把外层 pane 宽度再次当内容宽度。

`textures/ui/White` 在固定 ZIP 内没有完全匹配大小写的条目。任何替代 URL 必须通过 `host-resolved` 明确声明；不能将已有 permissions_white 等候选自动标为该 literal 的 exact-source。Frame 保留源背景色向量 `.192/.196/.2`，不证明宿主别名就是实际引擎材质。

请求保留 `target`、`origin`、`control`、`fromButtonId` 与可选原始事件。Escape／controller 的 `button.menu_cancel` 请求映射为 `button.menu_exit`；另有 `button.menu_tab_left`／`button.menu_tab_right`，fullscreen-content 不发切栏请求。`controllerRef.current.request(command)` 返回是否排入当前有效请求通道，不表示宿主已执行动作。Frame 不自行离开页面。`disabled` 管框架 chrome 请求，嵌入内容仍使用自身 disabled／readOnly；`modal` 默认角色为 dialog，显式角色须为 dialog 或 alertdialog。

## SettingsNavigation

必填 `label`、`width`、整数 `scale`、`font: WorldSettingsFont`、`items`、受控 `value: string | null`、`sourceDefaultIndex`、`toggleOnHover`、`hoverPolicy`、`hiddenSlots`。

| item | 必填特有字段 |
| --- | --- |
| `section` | `label`、`viewBinding`、`sourceIndex`、`panelTitle`、`glyph` |
| `group` | `label`、显式已求值 `height` |
| `spacer` | `size: [number | '100%', number]` |

所有 item 均保留 `id`、`sourceControl`、独立 `ignored`／`visible`／`enabled`。ignored 不实例化；visible=false 的行按显式 `hiddenSlots: reserve / collapse` 处理。`value` 只以业务 id 选择，不由数组顺序、sourceDefaultIndex 或 sourceIndex 推断；`null` 可表示无选中项。sourceIndex 与 viewBinding 保留原导航身份，不等于 Web 数组索引。

`glyph` 包含 `outline`／`color`（可各为 null）和逻辑 `size`；每幅完整图像显式提供 `src`、物理 `sourceSize`、`visible`。四张 game／multiplayer glyph 为完整源 PNG，见 [settings-navigation-assets.json](settings-navigation-assets.json)。轮廓和颜色层分别处理，不生成替代图标。另有六个原状态皮肤复用；图像相同不等于原生布局已认证。

行高30、状态图高31，内容局部起点3，图标起点5、文字起点34，因此相对根起点分别8／37。未显式声明 anchor 的居中取法与 `−0.5` paint 相位是本组件的明确 Web 政策。分组文字原位移可外溢，由外层 Frame 滚动视口处理。

`hoverPolicy` 为 `activation-only` 或 `request-when-source-flag`。后者还需要显式 `toggleOnHover`，不宣称恢复引擎 hover evaluator；touch 不以 hover 改页。`onValueChange(value, detail)` 保留原身份、前值、origin、真实 button 和事件；宿主更新 `value` 才改变受控选择。方向键移动可访问焦点不隐式接受新页面。`itemRefs` 按 id 指向真实 button；root 支持 div 原生属性、hidden／inert。

通用 `SettingsNavigation` 不自行补server provider。新增具名 `WorldSettingsNavigation` 保留原加载条64×8 UV、显示21×14和显式0…9帧，provider与推进时钟由宿主负责；level／addon使用单个cycling图加17×17边框，不能用outline／color双图假替。Cloud两图和大写White精确缺失仍需显式解析。

## World导航的可选材质呈现

`WorldSettingsNavigation` 可传 `materialRendering: WorldSettingsNavigationMaterialRendering`：必填 `profile: 'source-image'`、`extentPolicy: 'ceil'`、`background`（uniform solid RGBA或transparent）；可选 `renderKey`、`onStateChange`、`onError`。省略时仍用CSS；图层loading／error时保留CSS，ready后替换相应图像材质，DOM文字、真实button、事件和refs保留。

ceil明确物理目标范围，图像内部仍沿用已有source-image几何／shader量化，不代表任意CSS半相位或native默认值。solid背景必须由宿主显式解析；transparent保留浏览器最终alpha合成阶段。早期32个CSS平面为17通过／15失败；独立CPU分类保留采样、半相位和量化边界，没有统一native规则。当前source-image browser08的14项Web合同、package03及实际安装四组合已通过，不改写旧CSS候选。Node最终108、普通交互74与材质14各自记账，不能混为native证明；详见 [当前验证](WORLD_SETTINGS_FIELDS_QA.md)。完整API和示例见 [WORLD_SETTINGS_FIELDS.md](WORLD_SETTINGS_FIELDS.md#可选-materialrendering)。

## SettingsFields

必填 `width`、整数 `scale`、`typography: {label, description, control}`、`rows`、`hiddenSlots`。每个字体为显式 `{family, size, lineHeight}`，不从角色名称猜原生字体缩放。

当前 **15 种 kind**：

| kind | 数据与边界 |
| --- | --- |
| `label` | plain／group／header、原文、显式 textHeight |
| `info` | 原文、textBinding、textHeight；可显式保留实际 option wrapper／panelHeight |
| `spacer`／`divider` | 显式高度；divider另有 inset |
| `stack` | vertical／horizontal、完整有序子 rows；横向子项须显式 width |
| `panel` | 子控件按显式offset定位，不走stack游标；可保留option wrapper与panelHeight |
| `toggle` | 原始 binding、checked、toggleName、bindingCondition 与 option 布局 |
| `text` | 已接受字符串、placeholder、textBoxName、maxLength、sourceTextType、allowDataBinding；NumberChars 不解析或强制转为数字 |
| `text-action` | text 数据加 textFraction 与 text／arrow／mock-arrow 操作；label／target／enabled／labelMaxHeight 显式提供 |
| `dropdown` | 原 faceLabel／binding、完整 choices、dropdownName 与显式 popup profile |
| `radio` | 独立 waypoint 两选项、各 checked 标记、描述／视觉预算和显式 shadow；不改造成 dropdown |
| `slider` | sourceValue／sourceSteps／stepsBinding 与展示字符串；交互另由必填 web 的 value／min／max／step／markers 定义，二者不混同 |
| `permissions` | 原权限face、labels、choiceBindings、popup与各高度；可用checked保留visitor／member／operator独立原标记 |
| `action` | label、原target、tone、labelMaxHeight；可选uri只作宿主请求元数据 |
| `experiments` | 固定 experimental_toggles 集合名、显式 count／countBinding 与完整 toggle rows；集合 index／id 必须一致 |

每行共有 id、sourceControl、ignored／visible／enabled、显式 height，可选 binding／enabledBinding／collection、width／offset／typography。高度是宿主已求值的 source intrinsic 预算，不按文字长度估算。option 行保留独立 label／description 高度、controlY 和尾部4间隔；不够容纳控制本体会拒绝，不缩小原控件来挤入预算。

全局 `disabled`／`readOnly`／`hidden`／`inert` 与行能力独立。`onRequest` 收到 change／action、identity、原 target、previousValue／proposedValue、稳定真实 input／button 和 nativeEvent；滑块还带原 sourceValue／sourceSteps 及 explicit-web-domain 标记。宿主接受后更新 rows；库不自动修改世界配置。原生调用方事件先执行，延迟请求在传播后复核 native veto、IME、当前快照与owner；卸载或失效的owner不会继续提交旧请求。

`popupHost` 可显式传同一文档、已连接的 Frame content_area 元素；null／省略采用局部内联 Web popup，不自动 portal 到 body。每个 dropdown 的 scrolling、height、placement、inputMode、highlightOffset／highlightExtraSize 均由宿主明确提供。

`inputProps`／`buttonProps` 提供原生事件与语义扩展；`inputRefs`、`buttonRefs`、`rowRefs`、`popupViewportRefs` 指向真实节点。choice button key 为 `${row.id}:${choice.id}`，text-action 按 `${row.id}:action`。部件保留React18／19 ref合同；SSR不创建controller／DOM引用或执行宿主回调。上一基础阶段实际包保留原版本身份；本轮package03已补实际React18.3.1／19.3.1声明、SSR、素材／metadata／许可／CSS及新增World14组／24负类型合同，四组合dev／prod运行亦已通过；仍不代替原生验收。可选textFormatting要求显式host RGB映射；未知颜色码与输入value保持literal，见 [具名字段文档](WORLD_SETTINGS_FIELDS.md)。

## 组合方式

以下示例接收宿主已经求值的三个完整快照，不内置世界字段或默认页面选择。`hostNavigation` 的 value／onValueChange 与 `hostFields` 的 rows／onRequest 由调用方控制。

```tsx
import {useState} from 'react';
import {SettingsFrame, SettingsNavigation, SettingsFields, layoutSettingsFrame} from 'mcbeui';
import type {SettingsFrameProps, SettingsNavigationProps, SettingsFieldsProps} from 'mcbeui';
import 'mcbeui/styles.css';
// 也可分别导入 settings-frame.css / settings-navigation.css / settings-fields.css。

export function SettingsSourceExample({frame, hostNavigation, hostFields}: {
  frame: Omit<SettingsFrameProps, 'selectorContent' | 'content' | 'popupHostRef'>;
  hostNavigation: SettingsNavigationProps;
  hostFields: SettingsFieldsProps;
}) {
  const [popupHost, setPopupHost] = useState<HTMLDivElement | null>(null);
  const geometry = layoutSettingsFrame(frame.layout);
  return <SettingsFrame {...frame} popupHostRef={setPopupHost}
    selectorContent={geometry.selector &&
      <SettingsNavigation {...hostNavigation}
        width={geometry.selector.contentWidth} scale={frame.layout.scale} />}
    content={<SettingsFields {...hostFields}
      width={geometry.content.contentWidth} scale={frame.layout.scale}
      popupHost={popupHost} />} />;
}
```

`frame.layout` 必须显式包含诸如：

```ts
const layout = {
  size: [520, 340], scale: 1, dialogRect: [0, 2, 520, 336],
  backgroundHeight: 340, variant: 'navigation', inputMode: 'mouse',
  mouseRailAllocation: 'reserve',
  selectorScrollbarVisible: true, contentScrollbarVisible: true,
  contentHeaderHeight: 0, contentFooterHeight: 0,
} satisfies import('mcbeui').SettingsFrameLayout;
```

520×340 是示例宿主预算，不是原版默认分辨率或安全区。已有 `WorldLaunchActions`／`WorldSettingsActionButton` 可单独组合，范围见 [WORLD_SETTINGS_ACTIONS.md](WORLD_SETTINGS_ACTIONS.md)；Frame 不自行添加启动行、服务端表单或保存逻辑。

## 当前验证与未完成事项

| 层级 | 当前事实 |
| --- | --- |
| 上一基础阶段源浏览器 | 36交互＋24原材质检查通过；仅覆盖原受检版本与60项范围 |
| 上一基础阶段实际包／安装运行 | React18.3.1／19.3.1及四个默认Vite场景通过，保留旧受检身份；不延伸为本轮新包PASS |
| 字体与默认几何 | 宿主显式字体、行高、intrinsic、safe-zone／dialogRect、visibility占位和hover政策；原生未认证 |
| 具名字段／导航 | Game69／Multiplayer8与World17＋Add-ons5已实现；Root node02 CPU96与独立material CPU10、此前27／20／32／11各批分别记账 |
| 本轮实际包 | package03两peer各283值，canonical与新增World14组／24负类型合同通过；base helper另记 |
| 本轮源浏览器 | 普通交互74（browser06）与修复后材质14（browser08）各自通过；旧批次及失败保留，非native认证 |
| 当前安装运行／built／native | 实际安装开发／生产四组合通过；16对完整RGBA画面7,072,000像素差异0。built展示6项通过。demo01定位错误保留，demo02六项通过；原生仍未认证 |
| 完整 WorldSettingsScreen | 公共整页尚未实现；完整命名snapshot组装、其余上下文分支及原生资格仍需后续工作 |
| Provider／服务 | server进度接受显式帧；provider／clock、engine controller／forced-index求值、世界／账号／网络服务仍由宿主负责或未恢复 |
| 整页像素 | 未认证；源码参数、原图一致及浏览器通过均不能替代实际原生验收 |

来源素材的字节与许可证见 [settings-navigation-assets.json](settings-navigation-assets.json)、[world-navigation-assets.json](world-navigation-assets.json)、[world-settings-assets.json](world-settings-assets.json) 和各复用资产账本；可选本机原字体不随 npm／Git 发布。未恢复的 native anchor、字形测量、换行和引擎绑定保留为未知，不凭JSON的max高度推定换行算法。
