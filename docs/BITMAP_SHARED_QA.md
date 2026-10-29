# BitmapText 共享 WebGL 路径

本轮新增显式 `renderer="webgl-shared"`，不新增组件或公共函数：仍为117个组件、3份数据、3个渲染函数，共123个运行时值。CPU 仍是默认，原 `renderer="webgl"` 的独立 context 路径保留。本文记录实际源码合同与已完成的正式 / 包消费结果；共享路径的实际 native 捕获、独立浏览器检查与生产预览均已完成，各自认证范围分开记录。

## API 与选择

`BitmapTextRenderer` 扩为 `'cpu' | 'webgl' | 'webgl-shared'`。font、sampling、shader、profile、background、排版与 ref 合同不变。共享 GPU 同样支持 atlas-rect 与显式 bedrock-unicode；后者仍要求256×256页与按16对齐的完整16×16字格，不能把裁剪字格自动认证为原生字格。

```tsx
<BitmapText font={fullCellFont} renderer="webgl-shared"
  profile="bedrock-unicode" sampling="bilinear" shader="bitmap-smooth"
  color="#ffffff">钻石剑</BitmapText>
```

`renderBitmapGlyphs` 的可选 canvas 类型扩为 `HTMLCanvasElement | OffscreenCanvas`。调用方传入的 canvas 仍为独占目标，不能与其他 context 类型混用；函数继续返回 framebuffer / straight-alpha 读回数据及 dispose。内部共享 session / lease 不从包入口公开，调用低层函数不自动加入组件共享会话。

## 会话、显示与释放

当前实现用模块内部 `WeakMap<Document, Session>` 管理会话：同一库实例、同一 Document 的共享组件复用一个 OffscreenCanvas WebGL context；iframe / 不同 Document 分开，不承诺多个独立加载的库副本跨模块共享。

加载所需字图后，每次绘制同步执行生产 `renderBitmapGlyphs`，再通过 `transferToImageBitmap()` 得到结果，交给该实例 canvas 的 `bitmaprenderer.transferFromImageBitmap()`。每实例消费自己的 ImageBitmap，避免后续组件绘制覆盖之前实例的显示。取消或失效、尚未消费的 bitmap 会关闭。

HTML 标准规定 transferToImageBitmap 创建 ImageBitmap 并把 OffscreenCanvas 的图像换为新的空图像；这属于所有权与显示语义，不是实现层面的零拷贝性能保证。见 [HTML Standard：OffscreenCanvas](https://html.spec.whatwg.org/multipage/canvas.html#the-offscreencanvas-interface)。transferFromImageBitmap 将 bitmap 的所有权交给显示 canvas，不能把同一对象反复当作独立实例结果使用。见 [MDN：transferFromImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext/transferFromImageBitmap)。

这条显示链不经 Canvas2D / putImageData，但底层函数仍调用 readPixels，不是无 CPU 读回，也没有新增 Worker、并行绘制或多实例一次 draw batch。PMA framebuffer、target background 和显式8位 straight-alpha 转换的边界沿用 [BITMAP_GPU_QA.md](./BITMAP_GPU_QA.md)；不以 transfer 的名字推断任意后端的 alpha / 色彩处理完全一致。

每个 mounted 组件持有内部 lease。输入变化、renderer 切换或 unmount 会释放旧 lease，并清空旧显示目标；最后一个 lease 释放后通过微任务销毁会话，给 StrictMode 的紧邻 cleanup / setup 留出重新获取窗口。会话中间绘制的 GPU buffers / textures / programs 仍按生产函数的单次调用生命周期清理，不宣称实现了持久字图 cache。

## 错误与恢复

共享路径要求所在 Document 支持 OffscreenCanvas、WebGL、transferToImageBitmap 和 bitmaprenderer。缺少 API 或绘制错误时调用 onRenderError 并显示真实 DOM 原文，不静默换成 CPU 或独立 WebGL。SSR 仍只输出原文，不创建 GPU 资源。

共享 context loss 会使会话失效，并通知所有仍持有 lease 的组件进入错误原文回退；单个错误回调不能阻止其他实例收到通知。输入更新后可重新获取新会话，当前没有保持同一输入的自动重试或后台恢复承诺。宿主需要时可显式切换 renderer。

## 资源限制

共享路径减少同一 Document 内同时活跃的 WebGL context 数量，但每实例仍有 DOM canvas、bitmaprenderer 与显示 bitmap。字图加载、目标像素、GPU 内存、同步绘制 / readPixels 及浏览器资源限制仍在；不能由“一份 WebGL context”推导无限实例、固定帧率或固定内存。尺寸与输入上限检查也不能替代设备实际能力。

正式测试已覆盖48个 StrictMode 实例、切换 / unmount、context loss 全 lease 通知、输入更新恢复及异步取消。48实例是本轮已测规模，不是容量上限、吞吐基准或任意实例保证。

## 验证分层

此前独立 webgl 路径的20项正式测试、原生固定8 draw 复现与实际包消费保留为其自身证据，不直接覆盖本次新共享路径。

| 层次 | 本轮状态与认证范围 |
| --- | --- |
| 新共享路径实际 native 捕获 | 原8 draw raw FBO 对真实 native post、实际 bitmap DOM 对独立预乘参考均完整零差；插队异尺寸后重绘仍零差，详见下文 |
| 新共享正式测试及旧路径回归 | 新 shared7＋旧 GPU7＋CPU13，同一正式批27/27 PASS、0 SKIP / flaky，46.2秒 |
| 多实例预算与生命周期 | 48 StrictMode 实例共用1个 Offscreen GL、48份独立 bitmap 消费；loss / retry / 释放正式检查通过，不代表无限实例支持 |
| React18 / 19 包消费 | 18.3.1 / 19.3.1 均通过，各102个 dist 条目逐字节一致；本次身份见下文 |
| 生产4173预览 | 25项辅助断言通过；真实40实例、切换 / 显隐 / 释放与窄屏滚动通过，5个入口文件与 site 相同，不计正式 case |

即使共享路径匹配已捕获8 draw，也仍是固定输入及原 before 背景的条件式重放，不自动证明任意文本、默认 CPU、透明 DOM 的最终整 GUI 或其他硬件。旧软件后端 / 阈值反例继续保留，私有 capture、原字图与本机 font.json 不随 Git / npm 分发。


## 正式测试与消费身份

正式结果 `.cache/bitmap-shared-independent-final.json`，SHA256：`8423cd770f2217681f02d3d1d7fe47a2aa196f9b60f247286740f891f903dbe6`。该同批27项为7个新增 shared、7个旧 GPU 与13个旧 CPU，全部 PASS，0 SKIP / unexpected / flaky，耗时46.2秒；既有20项测试未改。全库累计是独立集成记录，见 [VERIFICATION.md](./VERIFICATION.md)，不在此把辅助 probe 当作新增正式 case。

48实例验证实际创建1个 Offscreen WebGL context，没有每实例 HTML WebGL context，独立显示 bitmap 全部消费。强制实际 context loss 后48个 owner 各收到一次错误并回退可读原文；输入更新后48个实例取得新会话，只有1个新活 context，无悬挂 bitmap。缺失 API 不创建可用 GL；模拟 transferFromImageBitmap 失败时产出的1个 bitmap 关闭1次、最终活 GL 为0，无静默 CPU / 独立 WebGL 替代。

`.cache/bitmap-shared-consumer-identity.json` 记录实际 React 18.3.1 / 19.3.1 包消费通过，各102个 dist 条目与本次包逐字节相同：

- consumer 实测 tarball SHA256：`ac91e8175e577f3aeeed1b663b03b1feee973cd28388e336c3db8f12b2ea50f9`
- JS SHA256：`b55078aa8b38fadd2e80398abeb8489ee89a35f72fd64436a6d81b28d5ad5cfc`

上述包身份对应本次消费时刻，后续文档收尾可能改变 tarball 身份。native 实际共享捕获独立报告见下文；4173生产预览独立结果见后文，未由包消费自动认证。


## 实际捕获、DOM 参考与混合实例

独立统报告 `.cache/bitmap-shared-independent/FINAL_SUMMARY.json`，SHA256：`31dbf00f6fa6ab0ad10c58252578cac2948f203913fad7a98cc20bc6eceb1406`；实际 native 细报告 `native-shared-verification.json`，SHA256：`48ee1112559c3c06bf25f561a1f380375f3899f57fc903d4d6041d3c7fd51b8f`。三份生产源码在整个检查过程中与 producer freeze hashes 一致，没有按输出改公式或拟合。

原捕获8 draw 与原 before R106 背景作为固定输入。以下是两项不同的比较，均在 NVIDIA RTX3050 Laptop / ANGLE D3D11 实测：

| 比较 | 整个2570×1402 target | field＋halo，247×104 |
| --- | --- | --- |
| 共享生产 raw FBO 对原 native post102 / R106 RGBA | 3,603,140像素，changed / sum / max 全0 | 25,688像素，全部0 |
| 共享 bitmaprenderer 的实际 DOM 对独立 native-post 预乘字节 GPU-copy 显示参考 | 3,603,140像素，全部0 | 25,688像素，全部0 |

原 RT 中大量 alpha 为102，因此 DOM 已合成后的截图不能直接当作原 RT 的 RGBA。第二行使用独立参考执行相同显示语义，与第一行原始 bytes 对照分开；没有通过8位反预乘把 DOM 结果硬凑成 RT。初次绘制及插入13×7异目标 / scissor / filter / background 绘制后再重绘，两层对照均仍为0，raw SHA256 保持 `6033d7afb5f28ecaac4663dea433e6529927f041d942e1ba76e36a77767d41df`。

组件层四种透明 / 背景组合对独立原 PSO shader 的 field＋halo 全0；相关15项辅助检查通过。48个混合尺寸、shader、sampler、background 实例的完整表面共898,560像素全0，实际1个 Offscreen GL / 48个 bitmaprenderer；卸载24个不影响剩余24个，实际 loss 后其余24个原文回退并取得唯一新 pool，最后释放后全部 context 已丢失。资源 third guard 还单独验证 ImageBitmap 创建后取消：未消费 bitmap 被关闭，已有目标图像不变，同 lease 可重用，7项辅助检查通过。这些辅助检查没有作为新增正式 case 计数。

结果仅覆盖该真实捕获状态和已测后端上的 API / transfer 合同。未检查 Global251 最终合成、MSAA目标 resolve、Present 或 JavaScript heap / GC 回收；没有认证所有 GPU、所有 native 画面或任意规模。零 mask / 容差、完整表面包含空白尾部与 halo 的条件保留，旧 CPU / 软件后端反例不变。


## 生产4173与40实例

`.cache/bitmap-shared-production-smoke.json` 的25项辅助断言全部通过，pageErrors / consoleErrors / requestFailures 均为空；这不增加正式 case。真实 Select 可以 shared → 独立 webgl → CPU → shared 往返，文本保持 ready；库默认 CPU 不变，生产字体示例自身初始仍使用原独立 webgl。

40示例默认未挂载、ready=0。Show 后40个实例均 ready 且0 error，Hide 后全部卸载，重开后40个再次 ready；预览与示例共同使用的实际 Offscreen GL 从首次 shared 起 created=1 / live=1，贯穿切换与重开。最后卸载40个示例并将预览切离 shared 后 live=0。独立 UI 检查与 root 实际 IAB 复核均确认 shared 选择及40/40 ready、0 error；不把显示数量当作最大容量。

320px 视口中 document clientWidth / scrollWidth 均320、scrollX=0。示例网格 clientWidth278 / extent848，实际局部滚动160，canvas 仍为194 CSS px，没有压缩；180px主预览区域局部滚动80，243px原 canvas 同样保留。该检查验证布局滚动合同，不声称所有宿主自定义尺寸都不会溢出。

`.cache/bitmap-shared-production-identity.json` 确认5个 served 入口与 site 构建文件逐字节相同。主脚本 `assets/main-BuSYqc2Q.js` SHA256 为 `b262b441ecb406079cf8ab696a203604adab9f3cab678a8886fe8eb09fa78298`；主展示截图 `.cache/bitmap-shared-production-controls-grid-context.png` SHA256 为 `ca6170562dbc9f620c3778b7f1c443306ff9c79a571a87bcbf358dc2605fe2e9`。这些生产 UI / context 证据与 native raw RT、独立 DOM 参考是不同验证层，不构成 Present / 全 GUI 或跨 GPU 原生一致认证。
