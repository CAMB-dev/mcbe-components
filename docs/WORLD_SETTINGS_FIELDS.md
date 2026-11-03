# World Settings 具名字段与导航

当前源码新增 `WorldGameSettings`、`WorldMultiplayerSettings`、`WorldSettingsNavigation`，合计 **264 个公共组件＋6 个数据导出＋13 个函数＝283 个运行时值**。三者分别提供固定 Game69、Multiplayer8 内容和 World／Add-ons 导航子树。完整公共 `WorldSettingsScreen` 尚未提供；整页命名快照组装、其余上下文分支和原生布局仍是继续目标。

展示入口为 `#world-settings`，通用基础件仍在 `#settings-source`。当前实际 React18.3.1／19.3.1 包为264组件＋6数据＋13函数＝283运行时值。World Game69／Multiplayer8／World导航三部件、15kind共用字段、显式source-image材质路径已提供。Node108、普通交互74、修复后材质14、实际安装开发／生产四组合和生产展示6项各自通过；完整WorldSettingsScreen及原生字体／默认布局／整页像素仍未完成。 最新包为package03，每peer新增World14组／24负类型合同通过。详见 [具名验收、像素对照边界与保留失败](WORLD_SETTINGS_FIELDS_QA.md)。

## 来源与完整快照

固定来源为 Bedrock Samples commit `15701fa9c13923f12662984c32c124327e40e3d3` 的 `settings_screen.json`、`settings_sections/world_section.json`、`settings_sections/settings_common.json` 及直接继承依赖。字段合同见 [world-settings-fields-source.json](world-settings-fields-source.json)，拓扑审计见 [world-settings-source.json](world-settings-source.json)，素材见 [world-navigation-assets.json](world-navigation-assets.json)。

两个具名字段组件不接受 `rows`、任意 `children` 或 HTML 注入。库按源定义生成固定有序节点，宿主提供完整具名 `snapshot`：

| 快照部分 | Game | Multiplayer | 合同 |
| --- | ---: | ---: | --- |
| 直属源控件 | 69 | 8 | 固定身份、顺序、kind、直属／间接子控件与绑定由源数据库确定 |
| `bindings` | 114 | 25 | 精确原始 key 与类型，含值、启用、可见性、面标签、警告和步骤等，不自动互推 |
| `conditions` | 24 | 4 | 宿主求值后的原表达式／变量布尔记录，包含 ignored 分支；库不是游戏表达式求值器 |
| `strings` | 93 | 9 | 以原本地化 key 命名的完整已解析字符串 |
| `metrics` | 116 | 8 | 以规范源路径命名的未恢复尺寸／排版记录，包含嵌套控件，不等于直属行数 |

这些记录必须包含规范要求的全部 key，含当前 ignored／不可见分支；缺失、多余、改名、错误类型、稀疏数组或带 getter 的快照会被拒绝。快照中的条件决定源 ignored／visible／enabled 状态，不通过删行来隐去困难分支。每个 `metrics` 记录只接受其声明的未恢复预算，不能改写源绑定、kind 或固定子控件。

`layoutPolicy` 必填 `unresolvedPanelAnchor: 'top-left' | 'center'` 和 `unresolvedStackCrossAlignment: 'start' | 'center'`，明确选择尚未恢复的 Web 投影。`metrics` 可提供源角色的 `typography` 覆盖；字体 family／size／lineHeight、换行高度、popup 几何、CM／SM 视觉预算和原生 shadow 未知值都不从字符串长度猜测。

Game 另有必填 `experiments`：完整有序集合长度须等于 `#experimental_toggle_count`；每项有唯一 `id`、连续 `index`、原 `#experimental_toggle_value`／`#experimental_toggle_enabled`／`#show_experimental_toggle`／`#experimental_toggle_text` 和显式排版 metrics。隐藏记录仍在集合内，不假设实验数量或游戏默认值。

源 create／template-create／edit 是三种不同 alias。特别是 template-create 的 `$is_world_create` 为 false；不能因其属于创建流程便改为 true。pregame、Education、Editor、NX／PS4、trial、publish、client、文件选择／导出能力及 provider 状态仍是独立宿主输入。

## WorldGameSettings 与 WorldMultiplayerSettings

两者转发真实 `HTMLDivElement` ref。公共类型为 `WorldGameSettingsProps`／`WorldMultiplayerSettingsProps`、对应 Snapshot，以及 `WorldSettingsNamedSnapshot`、`WorldSettingsFieldMetrics`、`WorldSettingsExperimentSnapshot`。

必填 `snapshot`、`inputMode: 'mouse' | 'touch'`，并继承 `SettingsFields` 的 `width`、整数 `scale`、`typography`、`hiddenSlots`。可传 `onRequest`、`disabled`／`readOnly`／`hidden`／`inert`、`popupHost`、原生事件与 input／button／row／popup refs 映射。节点身份使用规范生成路径，不能用显示标签作为 key。

`onRequest(detail)` 保留原 target、identity、真实 control 和 nativeEvent；变更含 previousValue／proposedValue，滑块另保留 sourceValue／sourceSteps 和 `explicit-web-domain` 标记。宿主接受后提交新快照，拒绝时控件保持已接受状态。库不写世界存档、不执行导出／删除、不打开账号设置 URI，也不连接服务。URI 操作只在请求中附带 `uri` 元数据。

Game 保留实际复合结构：opt-in、模板解锁、非堆叠 panel、管理分支和实验工厂。Waypoints 是独立的两选项 radio 及各自描述；Education 的另一个 Waypoints toggle 保持单独源分支。权限可保留 visitor／member／operator 三个原始 checked 标记，不能先强制转换为单个枚举而丢失输入。Multiplayer 保留两个广播 dropdown、三组独立警告和账号帮助操作；没有把它们改成服务器生成表单。

下面的例子接受宿主已准备好的完整快照和视觉预算，不内置游戏默认值：

```tsx
import {useRef} from 'react';
import {WorldGameSettings} from 'mcbeui';
import type {WorldGameSettingsProps, WorldGameSettingsSnapshot} from 'mcbeui';
import 'mcbeui/styles.css';

type Visuals = Pick<WorldGameSettingsProps,
  'width' | 'scale' | 'typography' | 'inputMode' | 'hiddenSlots'>;

export function GameSettingsExample({snapshot, visuals, onRequest}: {
  snapshot: WorldGameSettingsSnapshot;
  visuals: Visuals;
  onRequest: WorldGameSettingsProps['onRequest'];
}) {
  const root = useRef<HTMLDivElement>(null);
  return <WorldGameSettings {...visuals} ref={root}
    snapshot={snapshot} onRequest={onRequest} />;
}
```

搭配 `SettingsFrame` 时，用 `layoutSettingsFrame(...).content.contentWidth` 作为字段宽度，并将 Frame 的 `popupHostRef` 实际节点传给 `popupHost`。完整快照的示例准备逻辑见仓库的 `demo/world-settings-model-data.ts`；它不是包的公共数据导出或游戏规则来源。

## SettingsFields 的本阶段扩展

通用内核现在有15种 kind：`label`、`info`、`spacer`、`divider`、`stack`、`panel`、`toggle`、`text`、`text-action`、`dropdown`、`radio`、`slider`、`permissions`、`action`、`experiments`。

新增 `panel` 保留真实子控件 offset 和显式内层 panelHeight，不按 stack 游标重新排列。`permissions.checked` 可表达原始三个 checked 布尔值；省略时保留原枚举适配。`action.uri` 是宿主请求元数据。这些扩展用于真实源分支，不表示通用 rows 自动成为完整世界页。

可选 `textFormatting: {colors, resetCode}` 只投影宿主明确声明的 `§` 颜色码。`colors` 是单字符 ASCII key 到 RGB 三元组的映射，分量为0…1；`resetCode` 为独立单字符或 null。没有内置 Minecraft 调色板、大小写别名或隐式格式处理；未声明的序列保留字面值。文字输入框的 accepted value、placeholder及mock输入显示、原始标签数据和请求字符串保持原文，显示文本和默认可访问名称可按该显式 profile 去掉已知颜色码。

```tsx
const textFormatting = {
  colors: {'7': [170 / 255, 170 / 255, 170 / 255] as const},
  resetCode: 'r',
}; // 显式宿主 Web 示例，不是已恢复的原生 RGB 默认值。
```

## WorldSettingsNavigation

`WorldSettingsNavigation` 转发 div ref，保留 World selector 的17个直属节点、Add-ons selector 的5个直属节点和实际外层间隔／分组。它覆盖缩略图、Bedrock／Education 启动行、Game／Switch Game、Classroom、Multiplayer、Cloud、Debug、server、资源包和行为包导航；其它 settings／Realms selector 子树不在这里合成。

必填 `mode: 'create' | 'template-create' | 'edit'`、完整 `snapshot: WorldSettingsNavigationSnapshot`、受控 `value: WorldSettingsNavigationId | null`，以及继承的 label、width、scale、font、sourceDefaultIndex、toggleOnHover、hoverPolicy、hiddenSlots。`snapshot` 的 context、全部九个 buttons、groups、thumbnail、server、cloud、packs、launch 记录均须提供；不会因当前分支 ignored 而跳过数据形状检查。

`context` 显式给出 world／packs inclusion、spatial pattern、pregame、Education、NX、publish、Editor、Cloud 开关和 multiplayer client 状态。`buttons` 各含 label、panelTitle、enabled、sourceIndex；业务 `value`、forced index、sourceDefaultIndex 与数组位置分开。`onValueChange(value, detail)` 只请求接受新的受控选择；`onLaunchAction` 处理启动行请求。`itemRefs` 指向九个真实 button，`nodeRefs` 用于源结构节点；launch 可另外传 buttonProps／buttonRefs。

| 图像／分支 | 合同 |
| --- | --- |
| Game／Switch Game | 各自两张原图；Switch 实例使用 controller_glyph_switch／controller_glyph_color_switch，不能从 Game 基类猜相同图 |
| Classroom | 两张物理15×15原图，源 display21×14，物理尺寸和控件尺寸独立 |
| Thumbnail | 显式 textureName／fileSystem／image／alt／webFit；原 BannersTransparent 边框，源 bilinear；fit 为宿主 Web 投影 |
| Server | 独立 icon／outline provider 名和完整图像，声明显示21×14；`loadingFrame` 必须为0…9整数 |
| Server loading | 完整640×8原 loading_bar，UV64×8，投影到21×14；没有库内时钟或 provider 请求 |
| Level／Add-on | 17×17边框＋单个15×15 cycling provider icon，path／zip／filesystem 分别传入；不是 outline／color 双图替代 |
| Cloud／White | 两个 OneDrive literal 及大写 White 在固定 ZIP 精确缺失；可见分支必须传显式已解析资源，White带 resolution，不能用相似图或大小写猜测填补 |

原图闭包为12个可用 key，复用5个完整原材质并新增7张未经修改的原 PNG；缺失 literal 单独记录。资源形状在所有分支预检，实际可见分支才要求对应图像存在。

## 可选 materialRendering

`WorldSettingsNavigationProps.materialRendering` 可选，类型为 `WorldSettingsNavigationMaterialRendering`。省略时继续使用原有CSS展示。显式传入后，用已有 `GuiImageLayer` 的 source-image 图像几何／shader 路径绘制导航材质；它是可选 Web renderer，不表示已恢复本族原生 anchor、默认材质或整页绘制规则。

| 字段 | 合同 |
| --- | --- |
| `profile` | 必须为 `'source-image'` |
| `extentPolicy` | 必须显式为 `'ceil'`：物理目标宽高分别取 `ceil(plan.width × scale)`／`ceil(plan.height × scale)`，覆盖分数 intrinsic 范围 |
| `background` | 必填 `{kind:'solid', color:[r,g,b,a]}` 或 `{kind:'transparent'}`；solid各分量须为有限0…1值，只支持明确的均匀底面，不自动读取Frame下方像素 |
| `renderKey` | 可选字符串或有限数字；变更可重试失败的图像请求或丢失的图形上下文 |
| `onStateChange` | 可选接收 `'loading' | 'ready' | 'error'` |
| `onError` | 可选接收 `Error` |

```tsx
import type {WorldSettingsNavigationMaterialRendering} from 'mcbeui';

const materialRendering = {
  profile: 'source-image',
  extentPolicy: 'ceil',
  background: {kind: 'solid', color: [49 / 255, 50 / 255, 51 / 255, 1]},
  renderKey: 'host-attempt-1',
} satisfies WorldSettingsNavigationMaterialRendering;
// color是宿主明确选择的Web底面示例，不是库推断的Minecraft背景默认值。
// 在已有完整导航属性上增加：<WorldSettingsNavigation {...hostProps} materialRendering={materialRendering} />
```

加载、失败或上下文丢失时保留CSS材质；新的图像图层 ready 后才隐藏对应CSS状态皮肤、glyph、启动按钮材质和缩略图边框。真实按钮、文字、可访问名称、事件与ref继续由DOM承担，缩略图照片也保持其独立图像呈现。该选择不会替宿主补齐Cloud／White或provider资源，也不启动加载条时钟。

`ceil` 是目标范围政策，不是把所有DOM坐标四舍五入。图像路径仍使用已有source-image的独立几何／属性量化；CSS半相位、缩小采样、透明背景最终交给浏览器合成的阶段，不能据此认作相同的采样算法。`transparent` 尤其保留额外的浏览器最终alpha阶段；没有已知均匀底面时不能随意填一个solid颜色来追逐对照通过。底层API范围见 [GUI_IMAGE_QA.md](GUI_IMAGE_QA.md)，不自动授予本导航族原生资格。

### 保留的CSS候选结果

早期32个CSS完整材质平面为17通过／15失败，结果和旧expected均保留；不是Minecraft原生对照，也不是当前可选renderer的验收。独立只读CPU复核确认原图字节与旧数学expected一致，分别识别半相位覆盖、采样边界／缩小和中间8bit量化等有限差异：

| 类别 | 有限结论 |
| --- | --- |
| Switch半透明像素／Banners边框 | 有完整平面最大1byte差异；有限分阶段量化候选可以一致解释，不能据有限样本锁定唯一native blend规则 |
| Debug／White分数位置 | 半相位、邻接源texel与边缘coverage可解释部分结果；整数相位通过不代表任意位置都相同 |
| Loading／provider缩小 | 精确texel边界方向候选解释部分平面，但loading frame9和provider仍有反例／残差，没有统一规则 |

审计没有重画PNG、修改旧oracle、调阈值或容差，也没有从旧字体／其它屏幕的native结果推成本族native规则。上述CSS候选、私有32项CPU、Root node02的96项CPU以及当前source-image浏览器批次是不同记录。最终browser08的14项Web合同通过，不会把旧CSS15个失败改成通过，也不构成Minecraft原生绘制证据。

## 演示与整页边界

仓库新增完整具名示例准备数据：Game93个本地化 key 和 Multiplayer9个 key 均显式提供；Game93个可在固定 `zh_CN.lang` 找到，Multiplayer 两个精确 key `options.thirdPartyConsoleVisible`、`options.xboxliveBroadcastSettingsForCrossplatform` 缺失，示例明确使用宿主占位，不宣称来自原文。两个完整原图 `WorldDemoScreen.png`／`missing_pack_icon.png` 仅用于 demo 缩略图／provider 输入，不成为库默认封面。

示例的 metrics、条件求值、滑块数值域、选项接受策略、provider 图像、White 别名和颜色 RGB 都是显式 Web 示例，不是原版默认值或已恢复的原生字体／intrinsic。示例可把 `ResourcePackManager` 的 level／addon 放到真实内容分支；未挂载的 server／Cloud／Classroom／Debug provider 不用通用 rows 伪装完成。

当前仍没有公共完整 `WorldSettingsScreen`。真实整页后续还需在 `section_content_panels` 的源挂载点组装固定页面、资源包、服务器自定义内容及上下文服务。特别是 server_form.custom_form_scrolling_content 含 generated_form 与独立 submit_button；仅复用 `ServerCustomContents` 不能遗漏其提交 sibling。World 源 header／footer 是空数组，不能发明 Save footer。

## 本阶段验证状态

当前受检功能包为package03：两peer各283值、World14组／24负类型合同通过。最终Node108、普通交互74、修复后材质14、实际安装开发／生产四组合与built展示6项各自通过。材质34完整平面5,109,100RGBA像素差异0仅证明共享GPU引擎的集成；安装开发／生产16对画面7,072,000像素严格相同。

保留旧CSS数学候选17通过／15失败、较早包／源浏览器结果与两处实际安装产品缺陷及修复。初始视口Axe有1个label-title-only报告；Chrome实际名称正确，滚动至该slider后全scope为0报告、2个incomplete，两份raw结果均保留，不称全站WCAG认证。

详细版本、原图／SSR／声明／owner／失败边界及剩余完整WorldSettingsScreen／native范围见 [WORLD_SETTINGS_FIELDS_QA.md](WORLD_SETTINGS_FIELDS_QA.md)。本轮Computer Use只发现运行窗口，未找到游戏，无新native截图，随后已关闭会话。
