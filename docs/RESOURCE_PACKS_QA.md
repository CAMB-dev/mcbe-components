# Resource Packs / Pack Settings

后续有限原生审计：[标题plus绘制证据](RESOURCE_PACK_HEADER_NATIVE_QA.md)已取得真实原图／shader／顶点／常量及before-after读回，并验证条件化公开GPU渲染。它不改本阶段92／120与28个严格失败，也不表示默认整页布局或字体已认证。

本轮公开 8 个 Classic 组件，源码计数为 **247 组件／265 运行时值**。实际 React18／19 安装包、浏览器及生产展示检查已完成；材质比对仍有28个区域未通过，不表示原生整页像素认证。机器可读来源见 [resource-packs-source.json](resource-packs-source.json)，完整材质身份见 [resource-pack-assets.json](resource-pack-assets.json)。

## 来源与范围

固定公开样本为 `v1.26.60.5-full`：14 份完整 JSON 已逐字对照同一 ZIP，索引包含 1,661 个原始节点片段，两个主文件分别有 124／6 个定义。独立审计有 9 组语义检查；其共同范围逐字比对了 12 份文件和 132 个节点值。两份审计覆盖范围不同，不能据此声称全部原生界面已恢复。

`ResourcePackManager` 是设置页中的内容子树；不增加一套假全屏窗口或额外滚动容器。原始入口如下：

| profile | 真实设置内容入口 | 设置操作 target |
| --- | --- | --- |
| `global` | `general_section.global_texture_pack_section` → `resource_packs.selected_stack_panel` | `button.pack_settings_global` |
| `level` | `world_section.level_texture_pack_section` → 同一 stack | `button.pack_settings_level` |
| `addon` | `world_section.addon_section` → 同一 stack | `button.pack_settings_addon` |

父级设置路由、Pocket／OreUI、当前游戏实际使用的路由与字体、完整原生 GUI 均未认证。`PackSettingsScreen` 对应独立的 `pack_settings.screen`；完整 `manifest_validation` 是另一待实现家族。Marketplace 的运行时推荐内容没有被替换成自造 offers 网格；这里只呈现已恢复的源节点与操作请求。

## 公开 API

全部组件转发 `HTMLDivElement` ref，真实输入／按钮另有具名 refs；普通原生属性及事件仍由相应节点承接。类型从 `mcbeui` 导出。

| 组件 | 主要输入 |
| --- | --- |
| `ResourcePackManager` | `profile`、`width`、`scale`、`provider`、`bindings`、`labels`、五种 `collections`、`defaultItem`、`layout`、`onAction` |
| `ResourcePackSection` | `kind`、profile／尺寸、title／expanded、collection；各分支另有 defaultItem、invalidCollection、empty／diagnostic 输入 |
| `ResourcePackItem` | `kind`、`identity`、原始 `icon` 或 null、text、bindings、layout、diagnostics、labels、targets、可选 actions |
| `ResourcePackActions` | identity、kind、bindings、labels／targets、**显式 selected-collection diagnostics**、buttonProps／buttonRefs、onAction |
| `ResourcePackDiagnostics` | `variant`、data、width／scale、lowMemoryDevice、loadingLabel、可见 invalid 行的 intrinsic height |
| `PackSettingsScreen` | `open`、`viewportSize`、scale、title／closeLabel、content、onCloseRequest；panel／content／close refs |
| `PackSettingsContent` | `size`、scale、`inputMode`、scrollLabel、tier、generated、scrollViewportRef |
| `PackContentTier` | width／scale、hasContentTiering／contentTierSupported、label／reason、raw value／steps／ttsText、显式 web domain、labelHeight／reasonHeight、inputProps／inputRef、onValueChange |

`ServerCustomContents` 只在内部复用，不属于这 8 个公开组件；private 材质表、布局计划器也不增加组件数量。

## 集合、状态与宿主请求

Manager 保留源文件 16 个有序垂直节点：模板警告、下载确认、间隔、addon 警告、间隔、selected 标题／内容、间隔、available 标题／内容、间隔、realms 标题／内容、间隔、unowned 标题／内容。Invalid 行在相应 available 分支内，不被挪成一个自行设计的网格。

`selected` 是集合种类，`isSelected` 是当前行状态，二者不等价。集合 `capacity` 是显式 collection length，`count` 是字面标题字符串，`items` 是完整已解析记录；当前 API 要求完整记录覆盖 capacity，不猜缺失行的自然高度。隐藏记录仍在快照中。标题计数、空消息、展开状态与 collection 数量不相互推导。

行的 `mainHeight`、`contentHeight`、expanded text、file-size width、read-button height 等来自宿主对 `100%c`／`100%cm` 的有限解析；源 min50、24 高操作托盘及各自 padding 仍保留。不能把 cm 当固定字数，也不能把数组长度当原生高度。

Errors、warnings、expiry、errorFree、reportGenerating、readMore、readLess、ellipsis、方向提示等绑定独立；允许源文件表达的同时可见状态。动作托盘的 warning wrapper 有引用 selected collection 的原始绑定特例，调用方必须显式提供该诊断快照，不能自动换成当前行集合。原始诊断计数字符串及 loading frame 也由宿主给出，库不生成报告或启动游戏时钟。

添加与移除的语义 action 不同，但源 target 均为对应 profile 的 `button.move_left_global`／`button.move_left_level`／`button.move_left_addon`。按钮 caption 的本地化 key 不是 target。选择、排序、商店、报告和 pack settings 请求保留各自原始别名。

原生事件先行，语义请求延迟到 owner window 的检查点；事件取消、过期身份、hidden／inert、disabled／readOnly 等可阻止请求。行请求保留 profile、collection、id、index、原 opaque payload、真实 control 和 event。宿主接受后更新受控快照；保留原值即可拒绝。库不读写资源包、不连接服务、不购买、不下载、不修改游戏设置。

```tsx
import {ResourcePackManager} from 'mcbeui';
import type {ResourcePackManagerProps} from 'mcbeui';
import 'mcbeui/styles.css';

export function Packs({snapshot}: {snapshot: ResourcePackManagerProps}) {
  return <ResourcePackManager {...snapshot} onAction={request => {
    console.log(request.target); // 宿主在此处理真实意图
    return false;               // 本例保留当前受控快照
  }}/>;
}
```

动态包图标接受宿主完整原图 URL 与物理 sourceSize，或显式 null；不生成材质、不把物理 PNG 尺寸当显示尺寸。内置材质表当前有 59 个 key：31 份原始 metadata，28 项明确无 metadata。仅新增 **5 张完整 PNG**，不是新增 5 个组件；其余复用已核对的公开整图。不存在的 JSON 不补造；私有字体／捕获不随包分发。

## Pack Settings 的显式边界

窗口位于宿主逻辑 viewport 内：`min(W−4,370) × (H−50)` 居中；标题 y9／H10，内容 `[8,23,W−16,H−31]`，关闭 hit21／glyph15。原始 hollow3 及 control 使用现有 ClassicSkin；此页 underfill alpha 是 **1**，下层原始 screen-background dim 为 **.65**，真实场景由宿主放在下面。modal focus／Escape／ref 生命周期是明确的 Web 适配，不是假游戏场景。

在 420×300 viewport 中，窗口 370×250，内容宽354；pane350（x2）、mouse viewport343（bar5＋左 padding2）、stack339、slider321。**没有 Play 特有的额外 −1**；stack 使用源 top-left x0。Touch 单独为 stack346，无 mouse7 预留，默认隐藏4宽 thumb。滚动仅由内部有界 ScrollArea 承接，隐藏 UA scrollbar；不叠第二套 form、窗口、滚动区或提交按钮。

`generated.customFormLength` 必须显式提供，并与完整 `contents.fields`（包括 hidden 条目）数量一致。内部复用真实九种 custom row：label、header、divider、input、toggle、slider、step_slider、dropdown、multiselect。该条件验证完整宿主快照，不从字段长度反写原生 count。示例见 `demo/pack-settings-data.ts`，不是游戏默认数据。

Tier 的 hasContentTiering 决定整块可见性；supported 仅选择白／红标签及不兼容理由，**不因此禁用滑块**。raw `value`、`steps`、TTS text 与 `web.value/min/max/step/markers` 独立。Web accepted value 必须在显式 step lattice 上，避免 UA 自动取整与材质位置不同步。Marker 的位置和 progress 状态均显式提供；不使用 `steps−1` 或条目数猜原生工厂。

```tsx
import {useState} from 'react';
import {PackContentTier} from 'mcbeui';
import type {PackContentTierProps, PackContentTierChangeDetail} from 'mcbeui';

export function TierPreview({snapshot, requestSource}: {
  snapshot: PackContentTierProps;
  requestSource: (webValue: number, detail: PackContentTierChangeDetail) => void;
}) {
  const [accepted, setAccepted] = useState(snapshot.web.value);
  return <PackContentTier {...snapshot}
    value={snapshot.value} // 仍由真正的 source provider 独立更新
    web={{...snapshot.web, value: accepted}}
    onValueChange={(next, detail) => {
      setAccepted(next);         // 仅接受本例的 Web 预览值
      requestSource(next, detail); // 宿主自行定义 source 映射；不自动改 raw value/steps
    }}/>;
}
```

真实 range 在请求等待／拒绝期间恢复 accepted Web value，绘制也使用该值；原生事件可取消请求。readOnly 阻止编辑但保留 Screen 的关闭／Escape 出口；disabled 的行为另行显式控制。labelHeight／reasonHeight 是宿主解析的有限 Web 预算，源10高 label box 不是原生 em 证据。

## 字体与资格

普通字体沿用宿主 `--mc-font`／`--mc-font-size`；可用现有开放字体，原始私有字体不打包。TenLabel 的条件 scale1.39／offset−2 与实例直接 scale.8 存在引擎 override 顺序边界；当前有限 Web 字体策略不构成原生字号、offset、glyph、AA、bearing 或 intrinsic 校准。原始图和 metadata 身份通过也不等于原生 parent-alpha／裁切／整页绘制认证。

| 验证层级 | 本轮结果 |
| --- | --- |
| 固定源码与规格 | 14份 whole JSON、1,661 spans；独立9组语义审计 |
| Node／SSR／ref／事件 | 153项通过：新家族及共享部件82项、相邻 Play71项；Pack Settings19、Manager25 |
| Source 浏览器 | 246项中244通过、2项完整展示页对比超时；保留失败，调整采集预算与 trace 重复快照后，2项实际复测通过 |
| 截图发现的重复文字修复 | 行选择hitbox只保留ARIA名称、不绘制额外caption；实际旧版本Node红测保留，修复后153Node及118项相关浏览器检查通过 |
| 独立整材质 RGBA 平面 | **92／120完全一致，28未通过，严格总结果仍失败**；通过区域69,440像素 |
| 实际 React18／19 包 | 18.3.1／19.3.1各26组资源包SSR、24负向类型契约；247组件／265运行时值、59原图、31原始 metadata、28明确缺失均核对 |
| 默认安装开发／生产 | 两版React×dev／prod共4项通过；真实DOM refs及每次option回调清理、操作／range／readonly、无源码alias或失败资源请求 |
| Built 用户展示 | 实际4173的HTML与site产物一致；桌面／手机、三种profile及设置弹窗通过 |
| 当前原生活动路由／完整 GUI | **未认证** |

28个未通过平面集中在默认标题图标的.3、方向箭头的.7着色取整，以及奇数缩放时箭头刚好落在原始texel边界的采样。参考采用POINT和half-up约定，当前浏览器存在不同结果；没有修改源色值、原始PNG、旧期望图或放宽容差。旧Book原生顶点只支持该角色的.3→76，不能推导通用.7或CSS filter规则。白底白色箭头一致也不能证明其透明形状与采样规则。

本轮同时修复了真实DOM捕获阶段的IME关闭保护、React19返回式callback-ref清理，以及Play标签／行和资源包标题的可见名称对应关系。无障碍检查保留所有规则；文字对比保留原图、透明背板、黑／白fill、恢复图的像素证据。大展示页每次调用重复记录DOM曾生成239MB trace并超时，当前该展示页测试文件停用重复DOM快照，保留调用trace和全部逐对图像，不修改对比阈值。预算修复后实际检出示例Invalid红字在蓝色背景上仅有3.37049对比度；仅将示例宿主背景由#203040改成#101010，源红色和组件材质保持不变，随后复测。

复现：先运行`npm run verify:package`安装两版peer，再运行`node scripts/fetch-references.mjs`。后者从已校验的固定ZIP可复现提取14份原始JSON，拒绝覆盖不匹配缓存。Node测试见`tests/resource-packs.node.test.mjs`、`pack-settings.node.test.mjs`、`resource-pack-items.node.test.mjs`、`server-custom-contents.node.test.mjs`和`checkbox-ref.node.test.mjs`；浏览器见`tests/resource-packs.spec.ts`。原始运行记录位于本机`.cache/resource-packs-qa-01/`。

整个库“Minecraft 中能复用的 GUI 都加入”的目标及原生 pixel-perfect 目标仍未完成。
