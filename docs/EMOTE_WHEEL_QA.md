# EmoteWheel 范围与验证

`EmoteWheel` 是 Classic / JSON UI 表情轮盘，`EmoteSlotPreview` 是可独立复用的槽位预览。固定依据是官方 `v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3` 的 `persona_common.json` 与 `emote_wheel_screen.json`。原文件、纹理、metadata 和许可的身份见 [emote-wheel-assets.json](emote-wheel-assets.json)。这不是六槽轮盘，也不执行表情播放或商城操作。

```tsx
import { EmoteWheel, EmoteSlotPreview } from 'mcbeui';
import type { EmoteIndex, EmoteWheelProps } from 'mcbeui';
import 'mcbeui/styles.css';

const slots: EmoteWheelProps['slots'] = [
  { id: 'wave', label: 'Wave', preview: { kind: 'text', text: '1' } },
  { id: 'clap', label: 'Clap', preview: { kind: 'image', src: thumbnailURL } },
  { id: 'dance', label: 'Dance', preview: { kind: 'text', text: '3' } },
  { id: 'empty', label: 'Empty', preview: { kind: 'empty' } },
];
// activeIndex: EmoteIndex | null，状态可由宿主接受或拒绝。
<EmoteWheel slots={slots} label="Emotes" size={[256, 256]} scale={2}
  activeIndex={activeIndex} onActiveIndexChange={setActiveIndex}
  onActivate={(index, slot) => requestPlayback(slot.id)}/>
<EmoteSlotPreview content={{ kind: 'empty' }} scale={2}/>
```

## 原版视觉规则

- 槽位始终按上、右、下、左排列，索引为 `0..3`。必须提供四项且 ID 不重复。
- `size` 是可用 squaring-panel 的逻辑宽高；`scale` 是正整数像素倍率。轮盘边长取可用宽高较小值的 75%，与源 square / wheel 关系一致。它不是固定 143 逻辑像素；143×143 是原 PNG 的分辨率。
- 每个预览占轮盘 30%×30%，中心偏移分别为上、右、下、左的 33%。空槽使用完整 `icon_none.png`，按源 `100%` 撑满该预览框，不能把其 14×14 原图分辨率误当固定槽位尺寸。
- 五张完整轮盘图直接切换。选中图本身已经包含背景和边框，叠加到底图会改变透明度。
- 空槽、有效且有图片、有效但无图片分别由 `empty`、`image`、`text` 表达；源有效但无缩略图时显示索引文字。图片由宿主提供，不生成自绘角色或假缩略图。
- 源文字含阴影：索引回退为 13 逻辑像素高、1.5 倍字体；中心名称宽及最大高度各 35、0.8 倍字体。触控名称最大 75×30。默认 CSS 字体随库的字体配置，不能据此宣称原生 smooth 字体栅格已一致。
- 键盘提示使用完整 17×17 原图，文字为白色。Gamepad 提示的图形由宿主提供；缺少平台 glyph 时不猜测 Xbox、PlayStation 或 Switch 图标。
- 源没有独立 hover 或 disabled 轮盘 PNG。禁用行为是明确的 Web 宿主扩展，不制造原版禁用纹理。

## Web 交互合同

`activeIndex` 控制接受的画面；省略时使用内部状态，`defaultActiveIndex` 只决定初始值。`onActiveIndexChange` 是变更请求，不能绕过受控宿主更新。`onActivate` 独立发送目标槽位，空槽仍可请求激活，播放是否成功由宿主决定。

Web 指针策略采用归一化内半径 0.35、外半径 1 和最近四方向；这是公开 Web 交互配置，不是由 JSON 恢复出的原生输入阈值或状态机。键盘使用 `1..4`、方向键、Enter / Space 及 Escape；焦点按钮的激活遵循按钮自身语义。`onCancel` 请求取消，由宿主决定关闭。原生控件 ref、HTML 属性与阻止默认事件保留。

`inputMode` 选择提示方式，不连接浏览器 Gamepad API。图片 URL、表情所有权、可用性、缩略图有效性、播放结果、控制器纹理、本地化、世界状态及换装界面导航均由宿主负责。不得把空槽自动当成 disabled。

## 尚未验收的范围

本组件提供轮盘组合及预览零件，完整源 screen 的 `55% + 35px` 根区域、居中上下填充、instruction 黑底、Change Emotes 行、外部透明退出区域及原生动画尚未作为完整 screen 组合交付。默认 DOM 字体 / 百分比栅格、原生输入状态机、各平台控制器、触控原版整页与最终合成仍需原版采集核验。

资源字节正确、Web 合同通过和原生整页 pixel-perfect 是不同范围。任何下述客户端检查都不能代替完整原生 GUI 的验收。

## 本轮检查

原资源准备与只读核验通过：30份完整原件共2,026,388字节，14张PNG共7,618字节。源 JSON /locale 的行尾及原尾空白保留；Git 对该资源目录禁用文本换行转换。源文件仅作参考数据，不执行引擎绑定。

正式命令为 `npm exec -- playwright test tests/emote-wheel.spec.ts tests/emote-wheel-fidelity.spec.ts --project=desktop --project=mobile --project=pixels --workers=1`。21项客户端合同跨 desktop /mobile 两 profile，另1项实际截图合成用例：修后完整43次执行，42通过、1个 desktop 真实触控条件跳过、0失败 /重试 /flaky。最初41通过 /1跳过 /1手机触控失败保留在 `.cache/emote-wheel-tests-01/formal-01`；修正 touch 松手后的 pointerleave 清空问题后，测试字节未改，完整复跑保留在 `formal-02`。

截图合成比较以原 PNG 独立计算最近邻采样及一次 source-over 混合；排除宿主预览和中心文字框。在1 /2逻辑倍率的五种原图状态中，分别每幅比较462,080 /458,204像素，10组受检区域实际差异像素与最大RGBA通道差均为0。它只验证明确背景和整数采样下未覆盖的轮盘图区域，不是原版屏幕截图、字体、缩略图或完整 GUI 像素认证。测试容许浏览器量化的最多1通道字节，并另记录实际值，不能把阈值当作观测零差。

发行检查使用 `npm run verify:package`：真实 tarball 分别安装至 React18 /19 消费者，检查142组件 /6数据 /11函数共159个值、ESM /SSR、readonly四项tuple、ref /回调严格类型、独立 `emote-wheel.css` 导出、30份完整原资源及上游许可。公开构建预览入口为 `#emote-wheel`；这些 Web 检查不替代本页列出的原生整页与完整 screen 组合缺口。

本批实际 React18.3.1 /19.3.1 安装消费均通过。构建后的真实4173预览另有7项辅助检查通过，包括五张完整状态图的实际内联PNG字节、受控拒绝、1 /2 /3倍字体及阴影、提示切换、禁用和390宽局部平移；无页面 /控制台 /HTTP /请求错误。公开首轮脚本错误地假定PNG有文件名，保留失败后改为比较实际图片字节，产品未改；修后源码 /site 冻结无漂移。这7项辅助不计入正式43次执行，也不是原生验收。源文件、包与公开预览分别保留哈希，历史批次不扩充为原生认证。
