# EmoteWheel 范围与验证

`EmoteWheelScreen` 提供完整源布局组合，`EmoteWheel` 是可单用的 Classic / JSON UI 四槽轮盘，`EmoteSlotPreview` 是可独立复用的槽位预览。固定依据是官方 `v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3` 的 `persona_common.json` 与 `emote_wheel_screen.json`。原文件、纹理、metadata 和许可的身份见 [emote-wheel-assets.json](emote-wheel-assets.json)。这些组件只发请求，不执行表情播放或商城操作。

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
- `centerLabel` 可独立传入源 `#emote_name` 视觉名称，包括空字符串；无障碍名称继续使用 `slot.label`。未提供时，只有选中的有效图片 /文字槽位采用其标签，空槽或无选中项默认不生成中心文字。实际游戏的四个空槽参考均保持中心空白。

## Web 交互合同

`activeIndex` 控制接受的画面；省略时使用内部状态，`defaultActiveIndex` 只决定初始值。`onActiveIndexChange` 是变更请求，不能绕过受控宿主更新。`onActivate` 独立发送目标槽位，空槽仍可请求激活，播放是否成功由宿主决定。

Web 指针策略采用归一化内半径 0.35、外半径 1 和最近四方向；这是公开 Web 交互配置，不是由 JSON 恢复出的原生输入阈值或状态机。键盘使用 `1..4`、方向键、Enter / Space 及 Escape；焦点按钮的激活遵循按钮自身语义。`onCancel` 请求取消，由宿主决定关闭。原生控件 ref、HTML 属性与阻止默认事件保留。

`inputMode` 选择提示方式，不连接浏览器 Gamepad API。图片 URL、表情所有权、可用性、缩略图有效性、播放结果、控制器纹理、本地化、世界状态及换装界面导航均由宿主负责。不得把空槽自动当成 disabled。

## 尚未验收的范围

`EmoteWheelScreen` 已提供透明 screen、`55% + 35px` 根区域、居中上下填充、instruction 黑底和 Change Emotes 行。默认 DOM 字体 /百分比栅格、原生输入状态机、各平台控制器、触控原版整页、原生动画与最终合成仍需逐项核验。窗口参考采集不能替代原始 UI-pass 的严格 RGBA 比较。

资源字节正确、Web 合同通过和原生整页 pixel-perfect 是不同范围。任何下述客户端检查都不能代替完整原生 GUI 的验收。

## 轮盘阶段检查（142组件 /159值）

原资源准备与只读核验通过：30份完整原件共2,026,388字节，14张PNG共7,618字节。源 JSON /locale 的行尾及原尾空白保留；Git 对该资源目录禁用文本换行转换。源文件仅作参考数据，不执行引擎绑定。

正式命令为 `npm exec -- playwright test tests/emote-wheel.spec.ts tests/emote-wheel-fidelity.spec.ts --project=desktop --project=mobile --project=pixels --workers=1`。21项客户端合同跨 desktop /mobile 两 profile，另1项实际截图合成用例：修后完整43次执行，42通过、1个 desktop 真实触控条件跳过、0失败 /重试 /flaky。最初41通过 /1跳过 /1手机触控失败保留在 `.cache/emote-wheel-tests-01/formal-01`；修正 touch 松手后的 pointerleave 清空问题后，测试字节未改，完整复跑保留在 `formal-02`。

截图合成比较以原 PNG 独立计算最近邻采样及一次 source-over 混合；排除宿主预览和中心文字框。在1 /2逻辑倍率的五种原图状态中，分别每幅比较462,080 /458,204像素，10组受检区域实际差异像素与最大RGBA通道差均为0。它只验证明确背景和整数采样下未覆盖的轮盘图区域，不是原版屏幕截图、字体、缩略图或完整 GUI 像素认证。测试容许浏览器量化的最多1通道字节，并另记录实际值，不能把阈值当作观测零差。

发行检查使用 `npm run verify:package`：真实 tarball 分别安装至 React18 /19 消费者，检查142组件 /6数据 /11函数共159个值、ESM /SSR、readonly四项tuple、ref /回调严格类型、独立 `emote-wheel.css` 导出、30份完整原资源及上游许可。公开构建预览入口为 `#emote-wheel`；这些 Web 检查不替代本页列出的原生整页与完整 screen 组合缺口。

本批实际 React18.3.1 /19.3.1 安装消费均通过。构建后的真实4173预览另有7项辅助检查通过，包括五张完整状态图的实际内联PNG字节、受控拒绝、1 /2 /3倍字体及阴影、提示切换、禁用和390宽局部平移；无页面 /控制台 /HTTP /请求错误。公开首轮脚本错误地假定PNG有文件名，保留失败后改为比较实际图片字节，产品未改；修后源码 /site 冻结无漂移。这7项辅助不计入正式43次执行，也不是原生验收。源文件、包与公开预览分别保留哈希，历史批次不扩充为原生认证。

## Screen组合（143组件 /160值）

```tsx
import { EmoteWheelScreen } from 'mcbeui';
import type { EmoteWheelScreenProps } from 'mcbeui';

<EmoteWheelScreen slots={slots} label="Emotes" size={[400, 300]} scale={2}
  activeIndex={activeIndex} onActiveIndexChange={setActiveIndex}
  centerLabel={gameBoundName}
  labels={{ keyboardInstruction: '使用热键或鼠标激活表情',
    touchInstruction: '点击表情以激活', changeEmotes: '更改表情' }}
  onActivate={(index, slot) => requestPlayback(slot.id)}
  onCloseRequest={({ reason }) => requestClose(reason)}
  onChangeEmotes={() => requestDressingRoom()}/>
```

这里的 `size` 是整个 screen 的逻辑尺寸，区别于单独 `EmoteWheel.size` 的 squaring-panel 尺寸。根高取完整 screen 高度的55%加35单位；轮盘仍是内方形75%。说明区间隔2，Black 背景只对自身应用 alpha0.7，宽高为内容加10 /14。文字白色、有阴影；Gamepad instruction 单独为黄色、MinecraftTen 字体角色、最大300×28及 y−3。`--mc-font-ten` 由宿主映射字体；没有可用 face 时回退，不把回退当原版字体认证。

非 Gamepad 的 Change Emotes 行为27高，其中按钮120×23。`changeEmotesVisible={false}` 仅隐藏按钮，保留行；Gamepad 模式隐藏整行。按钮完整外边框、内缩1单位原图、内容各边3单位、无文字阴影及按下文字位移1单位分别对应源模板。`changeEmotesDisabled` 对应宿主禁止换装；全局 `disabled` 也阻止轮盘、换装与关闭请求。小于内容所需高度的 frame 按固定源尺寸裁切，不生成滚动条或擅自压缩控件。

`onCloseRequest` 只是请求，接受后是否卸载由宿主决定。Web 外部区排除轮盘方形、说明条和保留动作行；它不是由 PNG 的透明像素推算出的原生命中算法。Escape 在 Screen capture 阶段处理，依次调用宿主 `onKeyDownCapture`、`onKeyDown`，两者均可 `preventDefault`；随后仅非 Gamepad、启用且非 IME /组合键状态请求关闭，防止子轮盘重复清空选择。Change 按钮的 Left /Right 将焦点移回轮盘根，Down 停留；这些方向键也尊重宿主阻止默认行为。普通键保持正常冒泡。该 inline 组件没有自动 modal 锁定、焦点陷阱或外部服务操作。

动态 `gamepadInstruction`、`gamepadStartGlyph`、`gamepadStartDescription`、`gamepadExitLabel` 均可显式提供；Start 图形占26方框，独立描述为内容宽加2、26高、文字 x−2，Exit 标签另占100宽。缺少绑定时不编造平台图片、按钮名称或 `%s` 替换。`wheelRef`、`changeButtonRef`、槽位 `buttonRefs` 和根 ref 保留原生节点。

新19项 Screen 合同跨 desktop /mobile 共38次均通过，连同未修改的旧43次轮盘批，实际81次执行为80通过 /1个预期 desktop 真触控条件跳过，0失败 /重试 /flaky。背景 alpha 桌面 /手机各16个采样点实际 RGB18/30/42，文字124点保持全白；旧10组原图合成的4,601,420受检像素仍0差。记录见 `.cache/emote-wheel-screen-tests-01/FINAL.json`；这些是 Web /源图呈现检查，不是原生整屏像素认证。

## 本机原版参考与字体

实际安装版本1.26.60.5的既有测试世界中，采集了7张2560×1400窗口 JPEG：空槽基础页、四方向指针高亮、Change 按钮焦点和外部指针观察。原始文件只保存在 ignored `.cache/emote-wheel-native-01`，未进入库资源、Git 或 npm。Escape 的关闭已观察；注入鼠标输入只证明图像变化，不能据此宣称激活 /外部关闭的原生路由已确认。世界已保存退出，游戏及 Computer Use 已关闭。

CPU测量得到说明背景约545×145、11字 ink490×40，Change 按钮600×115、4字 ink175×40，与5倍、Classic Han 9单位 advance 及源布局主尺寸相容。两者约1.5物理像素的共同位置残差仍可能来自 viewport /截图裁切 /量化；不向产品加入拟合偏移。JPEG有损，不用于严格 native RGBA0 声明。测量与来源资格见 `.cache/emote-wheel-native-layout-01/FINAL.json`。

旧本地 Classic 字集缺少原说明所需的“情改更标活激热表鼠”。新增 `scripts/emote-wheel-font-characters.txt` 合并原版说明和演示文案，准备命令见 README。字体仍由调用方使用自己的固定源 archive 在本地生成，不能发布或打包这些私有字体；也不能把正确字符覆盖扩写成完整字体栅格验收。

本次私有准备合并后为227 /227 /95映射，共549；新增17字，既有515 mapped 的轮廓、字宽、COLR及纵向指标逐项未变，ASCII WOFF2 全字节未变。新增17字的17,408个源cell中心采样0差，公开双 `--text-file` 命令可复现；`--check-only` 不改5个输出的字节或时间，原8项 Python 检查通过。证据为 `.cache/emote-wheel-font-01/FINAL.json`。这证明有限源字形输入与旧字形保持，不证明浏览器与原生字体渲染完全一致。

最终143组件 /160值包已实际安装至 React18.3.1 /19.3.1 消费者，ESM /SSR /strict TypeScript /样式 /资产 /许可检查通过，私有原字体泄漏门禁通过。构建后的真实公开预览另13项辅助检查通过，含完整屏幕 /单轮盘切换、五种原图状态、关闭请求接受 /拒绝、源方向焦点、禁用、Gamepad 行切换、中文全空槽、整倍数字号及390宽局部平移，无页面 /控制台 /HTTP /请求错误。

中文参考用512×280逻辑 frame /5倍和同源文案。浏览器 `CSS.getPlatformFontsForNode` 实际报告11字由自定义 `MCBE Classic` 绘制，实际请求的 WOFF2 与227字 Host face SHA256 `e386324851d377a0b31d05df6e7d0866f0bcd9901db67e0e28c22d519396392a` 一致。DOM 背景545×145、文字框495×75、Change 按钮600×115与主尺寸参考相容，未调整共同位置残差。公开预览检查与81次正式执行分别记录，不累加为原生整页通过；最后仅补记此验收说明，最终包的运行时、样式、字体和资产应与已受测包逐字节相同。
