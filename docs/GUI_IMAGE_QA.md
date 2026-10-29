# 源 GUI 图像图层：API 与分阶段验收

GuiImageLayer、layoutGuiImages、renderGuiImages 初始image阶段为119个组件、4份数据、5个函数，共128个运行时值；下文历史结果保留原范围。后续Anvil阶段增加可选physicalPrecision并实际运行该文件18项，当前库120组件 /134值，见 [ANVIL_IMAGE_QA.md](ANVIL_IMAGE_QA.md)。初始底层、组件集成、包与生产分别验收不等于原生整GUI认证；旧CSS /DOM与非零baseline保留。

## 坐标与纯几何 API

`layoutGuiImages(options: GuiImageLayoutOptions): GuiImageLayout` 不创建canvas或GPU，可用于SSR准备。它接收已经求值的源布局，不是完整JSON UI解析器；anchors、百分比、parent和grid stride需调用方先求值。

| 输入 | 坐标 / 语义 |
| --- | --- |
| width / height | 实际整个framebuffer的物理整数尺寸，不从CSS宽高、DPR或窗口截图猜测 |
| guiScale | 显式正游戏尺度 |
| images[].rect | 已求值的GLOBAL game坐标 [x,y,w,h]，不是组件局部CSS坐标 |
| physicalPrecision | 可选且唯一值 `'float32'`：fround(fround(value)×fround(guiScale))之后floor origin / ceil extent；省略保持既有double乘法路径，不改变旧profile默认值 |
| uvRect | 可选归一化源矩形，默认完整原图 |
| nineSlice | insets为逻辑game边宽，数值或[left,top,right,bottom]；baseSize为源逻辑尺寸，不是PNG物理尺寸 |
| tint / hudOpacity | 显式归一化颜色 / 透明度，默认白和1 |
| scissor | layer / image的物理framebuffer裁剪矩形，取交集 |
| outputRect | 整frame内正整数物理输出窗口；只改变输出范围，不改变全frame布局 / 投影相位 |

源float矩形先按物理origin向下、extent向上量化，再按源nine-slice边展开，位置half-pack；UV编码和UNORM16 GPU解码分开。expanded draw尺寸不作为子布局或grid stride。logicalStage返回ceil(frame/guiScale)，MVP的projectionSize仍为未取整的frame/guiScale，不能用stage代替投影尺寸。

返回值含全frame参数、outputRect、logicalStage、projectionSize、列主序MVP及按image顺序排列的mesh（drawRect、half位置、raw UV、indices、tint / opacity、scissor）。highlight_slot等源中心UV band反向是显式支持的元数据情形，不代表所有新负坐标、非对称边或裁切图都已由native样本认证。

## 组件示例

```tsx
import { GuiImageLayer, layoutGuiImages } from 'mcbeui';
import type { GuiImageGeometry } from 'mcbeui';

const frame = { width: 640, height: 480, guiScale: 2 };
const cell: GuiImageGeometry = {
  rect: [10.25, 12.5, 18, 18],
  nineSlice: { baseSize: [5, 5], insets: 1 },
};
const geometry = layoutGuiImages({ ...frame, images: [cell] });

// cellUrl由宿主提供，其原metadata须匹配上面的逻辑baseSize/边宽。
<GuiImageLayer {...frame} images={[{ ...cell, texture: cellUrl }]}
  outputRect={[0, 0, 128, 128]} label="Inventory cell"
  onRenderStateChange={state => reportState(state)}
  onRenderError={error => reportError(error)}/>;
```

示例是显式宿主frame，不是native默认坐标。即使只输出128²窗口，投影仍使用640×480全frame。输出canvas的默认CSS尺寸为outputRect的物理宽高；style覆盖、CSS缩放与外部transform属于另一个显示配置，不能自动继承1:1物理像素证据。

GuiImageLayerProps使用readonly GuiImage[]，texture为URL或完整straight RGBA8 PixelTexture。ref为HTMLCanvasElement；label / 显式ARIA可命名，默认装饰。SSR只保留语义和输出窗口CSS尺寸，不做网络 / GPU绘图，intrinsic尺寸在ready前为0。

状态通过data-render-state及onRenderStateChange报告loading / ready / error；onReady为无参通知，onRenderError收到Error。等价geometry / source byte不触发重绘循环，可变像素先snapshot；迟到请求取消或忽略、ImageBitmap关闭。URL按显式无预乘 / 无色彩转换解码后直传GPU，不经Canvas2D fallback。真实context loss清空目标并报错，改变renderKey或输入重试，不静默切CPU。

## GPU API、alpha与资源

`renderGuiImages(options: GuiImageRenderOptions): GuiImageRenderResult` 是同步浏览器GPU函数，不是纯函数或SSR绘图。它接受同一几何选项及GuiImageDraw[]，texture为straight RGBA8或明确straight / 无色彩转换解码的ImageBitmap；ImageBitmap由低层调用方持有和关闭。

background可为透明、solid归一化RGBA或整frame尺寸PixelTexture，并明确framebuffer / straight-alpha编码。即使outputRect只输出子窗，背景仍需覆盖整个frame。输入 / 读回按top-first；默认output=framebuffer保留PMA RGBA8，显式straight-alpha是有损8位反预乘适配，不用于声称DOM / native全路径无差。

返回PixelTexture、layout、alphaMode与dispose。可提供独占HTMLCanvasElement / OffscreenCanvas；live结果通过GPU copy呈现原PMA，不经2D往返，但仍执行readPixels，不保证零拷贝或无CPU读回。临时context自动释放；live canvas不再使用后调用dispose，释放后不可继续在同一canvas绘图。每layer一context，不是每image一context，本轮不提供自动shared / Worker调度；大量layer、纹理与目标尺寸仍受浏览器 / 设备预算限制。

## 源 profile 与底层证据

`.cache/native-gui-image-profile/REPORT.md` / profile.json将实际GUI5 PSO801与GUI4 PSO840对到安装版UI/Blit Transparent variant0 / 无flags的相同SM6.5程序；不是仅按名称猜成UISprite。公开实现按源直alpha纹理、POINT / CLAMP、Tint / HudOpacity及分离RGB / alpha混合语义重建，不发布原shader二进制、捕获或私有字体。

producer `.cache/gui-image-producer-qa/REPORT.md` 已报告源声明生成的GUI5 / GUI4 prefix图像与暗行场景，固定四完整target共14,412,560像素对原生对应image-pass为0差；独立首批也报告四native image-pass与实际组件canvas零差。这里认证的是指定image-pass，不是剩余文字、物品、书本、末端合成或完整GUI。

独立最终 `.cache/gui-image-independent-qa/FINAL.json` / RESULT.md、closure-report.json 为单批16/16 PASS，0 SKIP / retry / flaky，26.7秒：12公开合同＋4可选私有捕获，当前四份私有文件均存在。四个2570×1402原生目标分别与低层FBO及实际React canvas默认framebuffer比较，共28,825,120像素RGBA零差，后端限ANGLE / NVIDIA RTX3050 Laptop / D3D11。前四image从透明clear重建；暗行场景使用完整原生before-PMA背景，是条件式绘制，不是整个GUI从空白重建。

公开合同覆盖原图 / nine-slice、physical10 / logical5、half / UV、projection、scissor / 精确crop、PMA / straight背景、校验、SSR / ARIA / ref / 回调、StrictMode、取消、真实context loss与显式重试。URL路径Canvas2D调用为0；原始PMA及三底色完整DOM对照严格匹配。底层scope通过不替代下节实际工作站集成。

两次15 PASS / 1 FAIL原始trace和完整384字节保留：第一例理想alpha191.5，GPU为191、JS Math.round预期192；第二例中间RGB127.5，GPU为127、实数舍入预期128。没有把实测191 / 127回写成通用期望。最终公开合同用sourceR128×Tint.5得到可表示的64、Hud128/255，独立预测 `[96,0,0,192]` 在完整96像素场严格吻合；无1字节容差 / mask / test.fail / 生产shader修正。任意非字节中间值的blend / 转换规则仍未证，不宣称CPU Math.round即硬件通则。

| 验证层次 | 已测范围 |
| --- | --- |
| 独立底层原生 / Web / 正式套 | 16/16同批PASS，固定四native目标×FBO / React整面28,825,120像素0差；两轮舍入oracle反例保留 |
| EnchantingTable imageRender | 正式最终13/13 PASS、整页辅助测量非零；见下节实际API / fallback与集成范围 |
| 原图provider与默认路径 | 已冻结18原PNG / 19 keys与原逻辑metadata，generator --check通过；不带私有font / shader，CSS仍默认 |
| 实际包与生产 | React18.3.1 / 19.3.1实际128值包通过、各256份dist同字节；当前生产8入口身份与34项辅助检查通过，不借用旧site |

源profile存在已观察边界，不能把泛型host支持范围全部提升为native CPU规则。四个image-pass零差、GUI4坐标留出、之前整页非零baseline是不同证据层；旧原始报告保持不变。


## EnchantingTable 可选 imageRender

公开 `EnchantingTableImageRenderProfile` 为 `{frame:{width,height,guiScale}, origin?:readonly[number,number], displayScale?:number}`。frame是整个实际物理framebuffer及GUI尺度；origin为GLOBAL game原点，省略时在ceil(frame/guiScale) stage中居中176×166源面板。displayScale默认1，正数且≤32，控制既有GUI2 DOM的统一显示倍率，不改变sourceframe。

```tsx
<EnchantingTable options={hostOptions} imageRender={{
  frame: { width: 2570, height: 1402, guiScale: 5 },
  displayScale: 2.5,
}} />
```

这是宿主显式profile，不是库读取真实游戏viewport。DPR1下物理1:1展示可选displayScale=guiScale/2；native截图注册还需正确source origin与实际显示位置，不能把任意Web位置 / CSS缩放当作自动native对齐。

启用后panel、close、indent、38cells、lapis、三条常驻dark背景、当前选项overlay、dust及hover / focus / selected图像由单GuiImageLayer绘制，仅ready时替换CSS皮肤。loading / context loss / error恢复CSS表面，按钮 / 焦点 / 业务回调保留；默认不传仍为原CSS与主题路径。DOM文字、items、book、count、durability、tooltip不由该图层重画，不能据图层0差声称完整附魔台0差。原生profile使用显式原素材注册表，普通CSS换色不会自动重染这组原图。

实施及producer自测 `.cache/enchanting-image-integration-plan/IMPLEMENTATION.json` 已冻结；真实独立组件最终正式13项和生产34项辅助结果见后文；整页辅助测量与包消费分别记录，不把selfsmoke当成正式组件验收。

## 内部原图 provider

`scripts/prepare-workstation-image-assets.py` 生成 `src/workstation-image-assets.ts` 与 `docs/workstation-image-assets.json`，18份完整原PNG去重后供19keys使用（dark / unselectable有意别名），原data URL字节不重编码。manifest保留源UI引用、PNG / RGBA / 相邻metadata / license身份；baseSize与insets为源逻辑单位。highlight的base1 / edge1与反向中心UV保留，不自造2×2替代。generator --check已通过。

provider不是新增公共数据导出，不改变4份数据计数。只含公开原PNG与metadata，不包含私有字体、shader或截图；同源license范围见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。安装基础包presence不证明当前激活覆盖顺序。


## 完整真实组件的辅助测量

`.cache/full-gui-image-integration-01/FINAL.json` / REPORT.md 已冻结。最终同一source graph跑8组合（before/after×public18/gallery20×default/captured book）；before四组完整RGBA hash精确重现旧table-preset after，旧60份baseline及59份preset文件未动。最初8组因两个producer文件在before/after批之间变化而另行保留；重启自管Vite后在新目录重测最终8组，不把混合source graph当作最终对照。

实际普通React保留DOM文字 / SGA、真实Book、三个BlockPreview、物品与耐久；没有捕获VB整景替代、原native GUI背景、字形替换、mask、裁小ROI或容差。固定完整 `[840,282,890,840]` 共747,600像素对真实post-UI R117；root / book bbox在两路径精确不变，imageRender使用源已知paint outset而非像素最小化配准，未叠加两次2.5缩放。

| Profile（两book端点各自实跑） | 不同RGBA像素 前→后 | RGBA MAE 前→后 |
| --- | --- | --- |
| public18 | 49520→26595 | 3.767670546→1.673396536 |
| gallery20 | 51377→28452 | 3.948262105→1.853986423 |

两profile均max255→252、alpha差1760→0，但仍有26,595 / 28,452像素不同，whole native parity明确FAIL。区域诊断包含image / text / item / slot等重叠，不是exclusive mask，不能把剩余误差全归某一个组件。每个runner的独立native PMA参考全3,603,140像素0差只认证参考显示；上述普通React整页仍非零。实际后端NVIDIA / ANGLE D3D11、浏览器sandbox开启、无page / console错误；此open状态下两book结果相同，不外推所有动画。辅助测量不增加正式case。

## 实际包消费

实际React18.3.1 / 19.3.1包消费通过：119组件＋4数据＋5函数=128值，SSR warnings0、ESM / types / ref、imageRender profile与18原PNG嵌入 / 原license均检查；两个消费者各256个dist条目与受测dist逐字节一致。证据 `.cache/gui-image-consumer-identity.json`，受测包 `.cache/gui-image-consumer-verified.tgz`；当前包身份统一见 [VERIFICATION.md](VERIFICATION.md)。

底层16、正式组件13、整页辅助、实际包与生产smoke分别记录，不借用其他阶段统计。最终累计见 [VERIFICATION.md](VERIFICATION.md)，不是单次整套运行。


## 实际组件最终正式QA

`.cache/enchanting-image-independent-qa/FINAL.json` / RESULT.md以final-report.json为authoritative单批：13/13 PASS、0 skip / retry / flaky，28.4秒。前一report.json也是13 PASS，但不重复计入累计。11份完整canvas source-queue状态共7,818,129像素RGBA零差，保留halo，无mask / 容差；队列按原ZIP / metadata / UI公式独立建立，参考合成使用另轮已获四native-pass验证的通用renderer。它不是第二套独立shader光栅oracle，更不是完整GUI原生0。

保留DOM按钮 / 文字 / ARIA / ref、物品和book及primary / secondary回调；selected / hover / visible focus / pressed / disabled / empty和关闭重开均通过。valid→invalid→CSS→valid仍是同section / focused node，库存原内部选择与book子状态保留；没有新增controlledSelectedIndex API。loading只在实际ready marker后一起替换旧皮肤，URL失败 / 真实context loss退回CSS并可新请求恢复。

显式GUI4 / GUI5 frame及displayScale .75 / 1 / 2×browser宽1280 / 390 / 320的9种展示组合通过：flow保留高度，doc无横溢出，必要局部panning，320下scale2右移后关闭仍可点击。这是已测Web展示合同，不把每个状态都说成有对应native截图。

## 最终生产与累计

`.cache/gui-image-production-01/identity.json` 的8个实际入口与site构建字节相同，主main-BgFxUfkM.js身份独立记录。smoke.json的34项辅助检查通过，page / console / request errors为空；默认CSS无image canvas，真实GUI4 / GUI5各一ready层、38slots，hover / 键盘focus改实际paint且不失焦，库存选择、输入 / 附魔意图、清空三暗行、CSS往返、关闭重开均保留。

390px文档client / extent均390，局部pan不缩逻辑352宽；原图图库150张解码、搜索 / 分类与3倍缩放正常。自动生产smoke实际后端为SwiftShader，属于功能 / 资源合同，不套用前述NVIDIA native-pass0认证；displayScale=1的预览也不是native物理1:1。root实际IAB选GUI5、ready38slots并保存完整截图，仅为实际UI复验，不添正式case。

最终旧相关32/32通过；全库893唯一正式用例为888 PASS、5预期SKIP、无未解决失败，为按项目 / 文件 / 完整标题合并的多批次累计。新增为底层16＋集成13；旧32、11状态proof、34生产aux与整页8组合不另算新增case。包身份照受测包保留，后续doc-only根包身份由最终字节证明另算。
