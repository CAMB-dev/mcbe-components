# 工作站文字接入与逻辑排版

本轮增加工作站可选 renderText 和 BitmapText 的 layout 模式，保留默认 DOM 文字、默认 CPU 与旧独立 / shared GPU 合同，不增加组件或运行时值。本feature正式58项已通过，本轮React18/19实际包消费及生产可见smoke已与图标 / invalid合并验证；局部文字与排版接入不表示原生整 GUI 已一致。

## 公共接口与语义

`WorkstationTextRenderer = (text: string, context: WorkstationTextContext) => ReactNode`。上下文为：

| kind | 其他字段 | 接入位置 |
| --- | --- | --- |
| title | align: start | WorkstationFrame 标题 |
| inventory-label | align: start | PlayerInventory 可见库存标签 |
| enchantment-cost | align: end、disabled、业务 id、tier: 1 / 2 / 3 | EnchantmentOption 的数字费用 |

上述三个组件接受 renderText，EnchantingTable 将同一个回调转发给 Frame / 库存及三个有记录的费用行。空记录仍不生成费用节点。它没有给 ItemCount、任意按钮、RecipeBook 或其他 GUI 标签静默接入回调；ItemTooltip 的独立 renderText 合同保留。

回调只用于非交互视觉内容。启用后视觉节点位于 aria-hidden 区域，库另保留 canonical 原始文字；title、库存 label、费用数字及原选项可访问名称不会因 canvas 不可读或回调返回其他图像而丢失。事件、disabled、宿主 ARIA 覆盖与业务 id 仍沿原 API。未传回调时返回原文字，不改默认 DOM 或自动选择字体。

## visual / advance 与行框

BitmapText 新增 `layout?: 'visual' | 'advance'`，默认 visual。visual 按完整 glyph / shadow 包络占据 CSS 尺寸；advance 按各行最大 pen advance 和 lineHeight×行数占据逻辑尺寸，完整 canvas 仍按 origin / bearing 相对逻辑原点定位。负 bearing、尾部原页空白及阴影外溢不会通过缩图或裁剪删除；宿主祖先的 overflow 仍可影响可见范围。

advance 不决定父级 inline formatting。独立八变体研究使用 glyph8×12、advance4、offsetY−3、lineHeight9、scale2：逻辑框8×18，完整视觉 canvas16×24。原费用容器的 inline-block / baseline 子节点让父框高21；仅 vertical-align:top 仍保留父级20px line-height strut。宿主给 BitmapText `style={{display:'block'}}` 后父框和子逻辑框均高18，底边差0，16×24视觉图仍保留。普通字符串保持原20px行框。

因此 end 锚定宿主应明确使用 advance＋display:block，不能靠全局 line-height:0 或 display:contents 消除默认文字兼容性。这个 DOM 结果不认证 native 费用行高、glyph Y 或所有基线。研究见 `.cache/workstation-text-qa/linebox-study.md` 与 `linebox-bearing-result.json`。

## 显式宿主示例

下面的字体、颜色、采样与尺度是宿主给出的单行示例 profile，不是库默认或所有状态的 native 认证。字体需要覆盖这里实际使用的字符；本机样本仅支持下方六个标题字与费用1/2。

```tsx
import { BitmapText, EnchantingTable } from 'mcbeui';
import type { BitmapFont, WorkstationTextRenderer } from 'mcbeui';

export function WorkstationPreview({ fonts }: {
  fonts: { labels: BitmapFont; costs: BitmapFont };
}) {
  const renderText: WorkstationTextRenderer = (text, context) => {
    const cost = context.kind === 'enchantment-cost';
    return <BitmapText
      font={cost ? fonts.costs : fonts.labels}
      renderer="webgl-shared" layout="advance"
      profile={cost ? 'atlas-rect' : 'bedrock-unicode'}
      sampling={cost ? 'point' : 'bilinear'}
      shader={cost ? 'bitmap' : 'bitmap-smooth'}
      scale={cost ? 2 : 1}
      color={cost ? (context.disabled ? '#895e5b' : '#7fff1f') : '#4c4c4c'}
      shadow={cost ? {
        color: context.disabled ? '#221717' : '#204008',
        offsetX: 1, offsetY: 1,
      } : undefined}
      style={{ display: 'block' }}
    >{text}</BitmapText>;
  };
  return <EnchantingTable title="附魔台" inventoryLabel="物品栏"
    renderText={renderText} options={[
      { id: 'first', label: 'First option', level: 1 },
      { id: 'second', label: 'Second option', level: 2 },
      { id: 'third', label: 'Third option', level: 2 },
    ]}/>;
}
```

回调不应依赖捕获中的绝对屏幕坐标。默认内容、源右下费用 offset、标题裁剪与外部布局仍由组件负责；宿主负责选字体、scale、颜色、阴影及所有上下文状态。

## 本机已测字体子集

运行 `python scripts/use-local-workstation-fonts.py "C:/XboxGames/Minecraft for Windows/Content"` 后重启 Vite。脚本只读已安装 vanilla/font.brarchive，核对固定7张原 PNG 和 default8.json，输出到忽略目录 `.cache/local-fonts/workstation`；原十字符 Unicode 样本不变。

仅本地展示虚拟模块增加 `nativeWorkstationFonts: {labels, costs} | undefined`，不是 npm 导出或全局 font-face。展示开关默认关闭，启用后五处文字使用 shared renderer / advance＋block，取消时卸载；没有字体时保留原文路径。私有原页不进 Git / npm / public 源目录，但本机 site 构建可能嵌入可选页面，发布素材需由使用方处理。

| 子集 | 直接观察 | 显式宿主配置及未证范围 |
| --- | --- | --- |
| 附魔台物品栏六字 | 六张256×256 Unicode页的原16×16格；两组三字相邻 pen 为9 game / GUI2 CSS18 | 最末字也统一advance18未经相邻pen观测；lineHeight20与offsetY2是单行宿主框 / 居中，不是恢复的字体 CPU bearing 或多行指标 |
| 费用1/2 | 原128×128 default8页；矩形 [8,36,8,12] / [16,36,8,12]，原bearingY−3；只观察单字费用1/2/2 | scale2；advance6由源右锚与单字pen推导，非相邻数字间距；lineHeight10是宿主20CSSpx行框，不认证多位费用、多行、其他字或 disabled 顶点色 |

标签与费用不能因为都叫“游戏字体”而共用同一 atlas profile / scale；default8 不是256² Unicode页。脚本在源字节不符时拒绝沿用这些指标，不猜测其他版本或缺字。

## SGA 空句点

原 SGA 句点格无可见 ink，但连续句点仍有 pen advance。两次实际捕获的六条符文行和原 atlas 支持句点 advance1 game；旧 fallback 为4，本轮只将 `.` 改为1，其他未测 fallback 字符不变。对应 GUI2为2CSSpx、GUI5为5物理像素；无 ink 不等于无宽度，也不重绘空格。分号未在六行观察，不能由句点推断其宽度。证据 `.cache/open-clean-full-gui/sga-period-native-proof.json`。正式测试的 SGA atlas 是可选本机文件；已枚举的官方full ZIP没有 ascii_sga.png 条目，不把它归因为该公开ZIP供图。

这项三行源码变动会改变 enchanting-book.tsx 文件身份，但没有改变 Book 函数、mesh、shader、pose 或 rendererState。旧文件390…的显式捕获验证属于当时身份，不能继续声称整个当前文件 hash 不变。

## 整页测量与剩余差距

对实际 post-all-UI R117 的完整面板＋5px halo，固定 ROI 共747,600像素，普通 React EnchantingTable 没有直接回放捕获 VB 或预填原 GUI 背景。公开字体CSS18主 profile 的不同RGBA像素为51,666，gallery本机字体20 profile为53,523，max均255；native整页一致仍 FAIL。default / caller-captured book 分支分别记录，不能拿局部 book draw 的零差替代完整组件或文字认证。

冻结汇总 `.cache/full-gui-open-clean-independent/FINAL_BASELINE_SUMMARY.json`，逐项结果在同目录 `react-public-baseline-result.json` / `react-baseline-result.json`；这两项是整页基线，不是本轮可选字体 adapter 已达零差的证明。未提供的工作台图标、字形、边框与角落都保留在评分里，没有 mask 掉缺项。

另有源布局量化候选可解释两帧适用的全部 image 顶点，但只覆盖已知 viewport / GUI scale 和图像坐标，字体起点为条件式观察；跨 viewport、新输入、CPU实现与整个 RGBA未证。研究不作为本轮生产修复，不能把坐标一致写成整屏一致。

正式结果见下节；本轮实际React18.3.1 / 19.3.1消费已包含新types / ref / layout / renderText，253份dist逐字节一致；身份见 [VERIFICATION.md](VERIFICATION.md)。生产可见复测已确认默认0 / 开启五处ready / 关闭卸载释放，以及业务回调保留，见文末。源码 seam、行框研究、辅助 probe 与正式累计分开记录。


## 本机展示开发复核

`.cache/workstation-text-dev-smoke.json` 的14项辅助检查通过，页面 / 控制台错误为空。默认0个字图视图、0个实际 Offscreen context；enable 后五处 ready、共1个实际 context；off 卸载并释放到 live0，重开五处再次 ready。七个实际字图 HTTP 响应的 SHA 分别等于原 PNG，选项语义与操作仍正常；320px 页面宽320无整体横溢出，工作站区域局部平移。

实际费用逻辑框12×20、视觉 canvas18×26且top−6，验证了字图外溢保留；标题 / 库存的54×20框仍是此宿主 profile。该复核只证明本机素材身份、显式配置及组件生命周期，不认证 native 行高 / AA 或整 GUI，也不算新增正式 case。生产构建、实际包消费及生产开关可见smoke均已通过；辅助检查不另计正式case。


## 正式文字回归结果

`.cache/workstation-text-qa/final-result.json` / `final-summary.json` 为一次完整58/58 PASS、0 SKIP / unexpected / flaky，126.4秒；pixels48、desktop5、mobile5。新增6项为工作站文字5与SGA句点1，旧52为CPU13、独立GPU7、shared7、renderer其余15及选项双端10。本feature数量不自动等于当前整轮发布的最终累计。

正式合成字格包含负bearing与多字符：费用逻辑框24×18，完整canvas30×26、offset[0,−6]；block宿主父框高18、底边差0，普通字符串仍20。DPR2保留CSS逻辑框4×6，对完整16×14 device-pixel canvas的已知背景合成RGBA零差，无裁边 / mask / 容差。它们是Web布局合同，不是native成本行高认证。

首轮诊断4 PASS / 2 FAIL及中间定向结果保留：一处为宿主inline strut，改调用方block；另一处28个差异像素全在未覆盖的背景过挂区，raw与opaque ink原本一致。fixture背景增加8px以涵盖完整外溢后，完整DPR2区域通过，没有改变生产wrapper或降低断言。最终58项是在这些fixture修正后完整重跑通过，不将初轮误写为全绿。


## 统一生产与包收尾

最终 `.cache/gui-icons-final-production-smoke.json` 在真实4173中确认工作站字体默认未挂载、0个Offscreen；开启五处ready、共1个实际context；关闭全部卸载并释放live0，操作回调保留。主Bitmap预览仍独立WebGL243×100，没有把字体示例开关改成全局默认。页面 / 控制台 / 请求错误为空。

React18.3.1 / 19.3.1的125值、SSR、类型 / ref / layout / renderText及所有原图 / 许可实际消费通过，两消费者各253个dist文件与受测dist逐字节相同。受测包身份、8个生产入口字节证明及整轮856唯一正式用例的多批次累计见 [VERIFICATION.md](VERIFICATION.md)。本机原字图仍不随Git / npm分发；本节不改变多位费用、native行高 / bearings或整GUI仍未认证的边界。
