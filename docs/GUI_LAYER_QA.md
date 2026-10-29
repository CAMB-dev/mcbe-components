# GuiLayer 图文合成验证

本轮新增 `GuiLayer`、`layoutGuiText`、`renderGuiLayer`，当前公共清单为120组件、4份数据、7函数，共131个运行时值。公开源输入到GPU / React的正式17项已通过；实际附魔台集成、包消费和生产检查仍分别记录，不能以固定绘制零差代替整GUI验收。旧GuiImageLayer / BitmapText / CSS默认不变。上一image-only阶段893唯一用例 / 128值包身份是历史检查点，不能套作本轮完成证明。

## 公开接口

| 接口 | 输入与边界 |
| --- | --- |
| `layoutGuiText(options)` | 纯布局，无I/O / GPU。实际物理width / height、显式guiScale与fontScale、GLOBAL game origin、原文、完整原字页度量、显式sampling / shader。返回全frame投影、逻辑advance / 行高与按页的shadow / main runs |
| `renderGuiLayer(options)` | 浏览器GPU函数；按commands顺序把image / text画到同一RGBA8目标。低层text.pages为显式已解码页Map，image为完整原纹理；返回layout、像素、alphaMode与dispose |
| `GuiLayer` | React canvas组件，ref为HTMLCanvasElement。commands的原图可为URL或RGBA8；text默认使用font.pages的URL，也可用pages Map覆盖。提供label、renderKey、onReady / onRenderError / onRenderStateChange |

`GuiTextFont` 在BitmapFont上声明 `pageSizes: readonly (128 | 256)[]` 与 `cellHeight`；glyph的page / x / y / width / height / advance / 可选bearing与lineHeight均由宿主提供。未知字不静默造替代字。text的 `color` 为RGBA8顶点字节，`tint`、`hudOpacity` 为归一化参数，`shadow:{offset,tint}` 的Tint独立于主通道。

`origin` 是已求值的GLOBAL game paint origin，库不读取游戏绑定。局部顶点量化为half，UV为UNORM16；paint origin先按物理像素求值，再用全frame MVP投影。保持原文 / glyph advance的布局，换行字符遵循显式lineHeight；不实现游戏长行自动换行、省略号或符文生成。text按原页升序分批，shadow批在main批之前；这不是所有游戏UI的通用batch算法认证。

width / height是实际物理framebuffer，outputRect / scissor是物理像素矩形。crop保留全frame投影及相位，不改变布局为局部坐标。单目标在image / text程序切换时不清空，不创建中间文字RT。默认输出PMA framebuffer字节；straight-alpha选项显式8位反预乘，可能损失字节精度。活canvas需要独占WebGL context并在退役后dispose，仍有readPixels和资源预算；不是共享池、零拷贝或无限图层。内部layoutSourceGuiLayer、renderPreparedGuiLayer与精度helpers不由公共barrel导出。

下面的font与image均由宿主提供真实资源，示例坐标仅为显式配置，不能当作原生布局证据：

```tsx
import { GuiLayer } from 'mcbeui';
import type { GuiImage, GuiTextFont } from 'mcbeui';

export function SourceLayer({ image, font }: { image: GuiImage; font: GuiTextFont }) {
  return <GuiLayer width={1280} height={720} guiScale={2}
    label="Source image and text"
    commands={[
      { kind: 'image', ...image },
      { kind: 'text', text: '12', font, origin: [20, 20], fontScale: 1,
        sampling: 'point', shader: 'bitmap', color: [255, 255, 255, 255],
        shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] } },
    ]} />;
}
```

## 附魔台可选 text profile

`EnchantingTableImageRenderProfile` 保留frame、可选GLOBAL origin与displayScale，增加可选 `text: EnchantingTableTextRenderProfile`：

- `metrics:{lineHeight,paintOffset}` 为必需、显式GAME单位的普通标签度量，不能从字墨边界猜测。
- `labels` / `costs` 各为必需style，`runes` 可选。style含font、fontScale、sampling、shader，以及可选color / tint / hudOpacity；costs可显式disabledColor。
- `options[].runeText` 为宿主已生成、排版、截断并保留原始大小写的最终文本。旧 `runes: ReactNode` 仍保留DOM语义 / 任意宿主视觉，不被库转换成字符串。
- 图像与可渲染文字进入同一个目标；DOM物品、count、耐久、book、tooltips与操作语义保留。默认CSS不变，原renderText seam仍可用于CSS路径。

缺glyph、错误度量和资源 / GL错误均整层退回CSS，并保留有效displayScale对应的展示尺寸；最终集成QA已覆盖往返恢复。不得隐藏加入scissor掩盖长行，也不得据固定观察文本假称恢复省略号 / 自动换行。

## 已冻结：CPU属性流独立复核

`.cache/gui-text-layout-independent-01/FINAL.json` / RESULT.md：GUI5与GUI4各15个draw、212顶点，共30draw / 424顶点。独立实现对6,784字节packed VB、3,840字节VS / PS常量、480个MVP float32组件及全部indices严格一致；30个完整atlas身份核对一致。已用的VS96 / PS32窗口与原CBV切片一致。

独立实现读取固定官方ZIP的原UI，解析root / percent / anchor / offset / grid表达式，并扫描原PNG生成字界 / advance / UV / cornerID / color。未导入producer recover.py或以其结果作expected；两份预测冻结后才比较实际提交。原图和捕获用于匹配身份，不是额外blind holdout。

以下不唯一性必须保留：

- normal lineHeight10 / bearingY1、CJK advance9属于有限观察profile，只有六个CJK、单行标题 / 库存与费用1/2。
- percentage先F32再除100与double百分比后F32得到不同中间rowH，但两个scale的全部已测提交字节相同。
- cost lineHeight9 / bearing0与10 / 1同样可生成当前字节；正交Z观察常量不能唯一拆出near / far。
- 三串runes与费用1/2/2是已观察调用方输入；未恢复游戏字符串绑定 / 截断。GUI4标签为Bitmap / POINT，GUI5为Smooth / LINEAR，通用切换阈值未知。

因此结果只支持一个无逐行修正的统一候选复现这些属性流，不证明唯一原生CPU算法、额外blind数据或wholeGUI零差。RGBA另由下面的公开GPU测试验证；独立固定负控和全部字节差异保留原报告，不用它们拟合。

## 已冻结：六次读回与私有prepared kernel

`.cache/gui-text-oracles-01/manifest.json` 记录六次实际native GPU目标读回，错误为0；从已有捕获获取目标，不是新UI / 新捕获或整条公开生产验证。

`.cache/gui-layer-producer-qa/REPORT.md` 的prepared kernel使用实际已准备文字属性 / MVP，GUI4 / GUI5的labels和runes / costs共4个case；FBO及活default framebuffer共8个完整2570×1402目标，28,825,120像素RGBA0，每case三处crop亦与完整输出相符。标签从透明clear绘制图像和文字；符文 / 费用使用匹配的原native-before背景。覆盖128 / 256页、POINT / LINEAR、Bitmap / Smooth及独立quarter Tint shadow。

这只认证内部kernel及固定条件输入，不能把captured attributes / matrices当作正常public场景输入，也不单独认证layoutGuiText → renderGuiLayer → GuiLayer / EnchantingTable的公开source路径；该路径另见下一节。image / text交错的3,584像素合成probe与旧kernel顺序结果一致，仅为状态切换负控。旧image与bitmap路径在新目录复核的零差、六段shader逐字抽取证明，均按原范围保留，不替代本轮正式公开QA。

## 公开源输入、GPU与React正式测试

`.cache/gui-layer-independent-qa/final-report.json` 为最终完整单批：17 / 17 PASS，0 skip / retry / flaky，31.1秒。13项为可复现公开输入合同，4项需要用户自有原始字体与捕获目标；本机此次四项均实际执行，缺资源时正式标明skip。配置为Chromium、1280×1000、DPR1，原生精确绘制证据使用本机NVIDIA RTX3050 / ANGLE D3D11；不外推其他GPU / 浏览器。

公开用例覆盖128 / 256字页、负bearing、按页及shadow顺序、RGBA8色值与独立quarter tint、image / text有序切换、全frame投影与crop / scissor、输入与资源预算、URL去重及straight ImageBitmap解码、StrictMode、取消、context loss / renderKey重试、ARIA / ref及可变像素更新。三个实际DOM背景的完整截图另与明确期望值比较，不用原生截图生成这些公开期望。

四个原生阶段使用普通字符串、完整字页 / 度量、源UI求值origin和图像命令，经过 `layoutGuiText` → `renderGuiLayer` → 实际 `GuiLayer`；捕获VB / MVP只用作比对，不作为公开绘制输入。GUI4 / GUI5的labels从透明clear重建源图像与文字；runes / costs是匹配原before framebuffer的条件式过渡。四FBO与四实际React完整2570×1402目标，共28,825,120像素，严格RGBA差异均为0；四个底层活canvas呈现亦为0。全部30draw的packed VB 6,784字节与所用CBV 3,840字节独立匹配。该结果认证所列固定阶段，不认证附魔台完整组件或整GUI零差。

失败与修正保留，未放宽阈值或修改生产源迎合期望：

- 首轮17项为16 PASS / 1 FAIL，GUI5 labels从clear有2,158个差异像素。错误在测试场景对image indent坐标过早应用文字F32规则；原image source精度与文字精度不同。仅修正独立期望场景的image表达式，保留原报告、trace与差异；其余三原生阶段及13公开项当时已通过。
- 后续定向测试曾错误要求：待解码时直接修改嵌套props，最终ready必须仍为旧输入。真实首个GPU请求已冻结旧输入，但React内部render可观察宿主违反不可变约定后的新值，再发新请求。修正测试为核对首个实际GPU快照及后续请求分别正确，保留失败报告；不承诺嵌套原地修改在所有内部render中不可见。

正式17项只取最终单批；诊断、定向复跑、像素数量和producer自测不增加正式case数。

## 实际组件组合与生命周期正式测试

`.cache/enchanting-combined-independent-qa/final-report.json` 为最终单批10 / 10 PASS，0 skip / retry / flaky，23.1秒。测试独立求值原UI命令队列，通过公开 `renderGuiLayer` 与实际 `EnchantingTable` 的canvas比较；GUI4、GUI5及长rune三幅完整输出共2,643,089像素严格RGBA0。该参考与组件使用同一公共renderer，因此认证adapter组合合同，不是第二份独立shader / native oracle。运行后端为SwiftShader，不能混称为前节NVIDIA原生绘制认证。

实际组件保留38个可操作槽、canonical语义标签、ref、回调、任意宿主items / stateful book、内部选择和键盘焦点。CSS、image-only、combined、缺glyph / 度量错误 / 字页失败、延迟加载与真实context loss往返均核对：整层CSS fallback不缩失有效displayScale尺寸，ready后才隐藏被替换的视觉文字；清空、关闭重开和宽窄视口仍保留局部pan及可达关闭入口。长rune保留大小写与完整视觉外溢，crop / flow reservation覆盖它；这不是游戏自动截断 / wrap的恢复。

首轮9 PASS / 1 FAIL源于测试精确无障碍定位遗漏真实数量后缀：预期 `Lapis lazuli`，实际为 `Lapis lazuli, 8`。仅修正测试locator；原JSON、截图、trace保留。打包首次类型检查还发现测试locator的evaluate节点未声明HTMLCanvasElement，已补类型断言；生产源未改。最终10项只计一次。

## 实际附魔台完整区域的现状

`.cache/full-gui-text-integration-01` 保留同source graph的before / after各四组合：public CSS18与gallery CSS20，各含默认及显式捕获book端点。完整固定ROI为890×840，共747,600像素，保留界面外围halo，不按文字、物品或书本遮罩。image-only before重现上一阶段完整RGBA身份：public18为26,595差异像素、gallery20为28,452；同层文字after四组合均为10,155差异像素，RGBA绝对差总和1,663,443、MAE 0.5562610353130016、最大通道差252、alpha差异0。**完整区域仍为NOT EXACT**，残差不能全部归因于字体或书本。

public18测量通过私有data-only虚拟字体模块去除全局Mojangles CSS / FontFace注册副作用；该模块的字页URL和度量数据保持与生产provider一致，不替换glyph、图像或绘制buffer。原模块 / filtered模块SHA与实际字体身份均单独登记，不能把此私有宿主桥称为npm字体提供器。此八组合属于完整界面辅助测量，不增加正式case数。最终重新解码八幅实际PNG复算，所有run-pinned source均与当前相符；此前冻结的原baseline60、table预设59及image阶段113，共232个历史文件逐字节未变。

producer初次临时 `smoke.json` 在收到保留指令前被修复后复跑覆盖，已在其FINAL明确登记；不把现存文件冒充初次证据。有效displayScale的fallback尺寸问题由新命名 `smoke-after-fallback.json` 验证；`negative-old-catch-results.json` 是后来对旧catch的新隔离复现，不能替代已丢失原文件。公开集成最终正式检查仍另列。

## 本机字体与许可

`python scripts/use-local-workstation-fonts.py "C:/XboxGames/Minecraft for Windows/Content"` 只读安装资源，额外生成ignored `.cache/local-fonts/workstation/gui-fonts.json` 与gui-provenance.json。虚拟模块 `nativeGuiWorkstationFonts={labels,costs,runes}` 仅供本机展示页，缺资源为undefined，不是npm公开值或全局font-face。

旧fonts.json和七张source PNG不变；新profile额外使用原ascii_sga.png，共八张原PNG。新costs 0..9只核原alpha / source advance6，实际native只观察费用1/2；多位费用、所有行高 / binding不自动认证。SGA95 printable ASCII中period无ink但advance1，space零宽字格advance4。SGA来源是本机字体，不宣称官方样本ZIP含该图。

Composed GUI `#gui-layer` 仅在本机资源可用时默认启用此合成示例，可切GUI4 / GUI5、清空 / 恢复。旧五处BitmapText演示的默认关闭策略不变。私有字体页、native截图、捕获及shader反汇编不进Git / npm；本机site可能带可选页，不能未经许可作为公开字体分发物。

## 相关回归、实际包与累计

本轮 `.cache/gui-text-existing-final.json` 相关旧回归75 / 75 PASS，覆盖旧image图层、image-only附魔台、Bitmap GPU / shared与工作站文字 / 几何 / 空态 / 选项；这些是刷新既有用例，不计作新增75。按正式project、文件及完整标题合并的 `.cache/gui-text-validation-integration-summary.json` 为920唯一用例：915 PASS、5预期SKIP、0未解决失败。新增17＋10，累计来自多批次范围检查，不能称920项单次整套全绿。

`npm run verify:package` 已实际构建并把tarball安装到React18.3.1 / 19.3.1消费者；131运行时值、120组件、SSR、严格TSX / ref / 新profile、样式、资源及许可检查通过。私有原字体 / 捕获 / shader二进制不进npm。实际已测包 `.cache/gui-text-consumer-verified.tgz` SHA256为 `20b01191fb2e19480898b3519381209a9fc4cd4f1f8a99af70d9ff54cb9f4bfe`，`dist/index.js` SHA256为 `7738b769ad9b34dcad1bf4891f16d60cfedfe4116f9fa8396c18b3809999ac69`；`.cache/gui-text-consumer-identity.json` 逐条证明两消费者各256份dist与本轮构建同字节。首次构建被测试类型错误挡住的日志另存initial，最终通过不改写首次失败。

## 实际生产展示页

`.cache/gui-text-production-01/{smoke,identity,FINAL}.json` / RESULT.md记录38项辅助检查通过，不计入正式920项。实际HTTP提供的8个HTML / assets入口与本轮site字节相同；主bundle `main-DM5w6q7L.js` SHA256为 `3e5ab66465d11875e7f0ed83cd7b1eb553361b34464994999a3a17273954f6eb`。修复首次hash定位后，直接打开 `http://127.0.0.1:4173/#gui-layer` 即显示目标section（1000px视口中top198.859375）；另在真实IAB确认ready并保存 `iab-composed-gui.png`。

GUI4 / GUI5分别使用707×667 / 883×832 backing，保留352×332 DOM尺寸、单ready层、38slots、标签 / 费用 / 三行runes标志与canonical语义。实际popup切换、text开关的image-only回退、焦点 / 选择 / 回调、清空 / 恢复及关闭重开通过。390px视口文档仍390px，局部pan为client300 / extent364；150图标全解码，分类 / 搜索得到4项，17×17原图在3×显示51×51。

page / console / render及非取消网络错误均为0。原始requestfailed实际有11次，均是快速切换时退役请求的ERR_ABORTED，原记录保留；5个distinct字页另外直接HTTP200且与site字节一致，全部settled层ready。不能把它写成原始请求失败0。此辅助运行后端为SwiftShader，不冒充NVIDIA native parity；截图中的sidebar可能仍高亮前一Workstation text行，active-section observer不在此次通过声明内。首次无预览服务、过严取消断言及修复hash前的报告亦留存。

上述已测tarball身份固定。最终文档包以 `.cache/gui-text-final-pack-proof.json` 逐条登记与已测包的比较：仅README / docs可变化，所有非文档条目必须同字节。实际消费认证只由此身份链关联。既有整GUI非零报告保留，不把局部 / 固定draw零差推广成默认文字、全部姿态、跨GPU / viewport或整GUI认证。
