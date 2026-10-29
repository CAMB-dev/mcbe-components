# Bitmap 字体 GPU 路径与验证边界

初始独立GPU阶段为117组件 /123运行时值，下方原证据保留当时身份；当前库120组件 /134值。`shadeItemGlint` / `renderItemGlint` 是纯纹理运算，`renderBitmapGlyphs` 分配浏览器WebGL资源、绘制与读回，非纯函数 /SSR绘制。后续共享资源治理范围见 [BITMAP_RESOURCES_QA.md](BITMAP_RESOURCES_QA.md)，不增加公共API。

## 组件 API

`BitmapText` 继续要求 `font`、字符串 `children`、显式 `sampling: 'point' | 'bilinear'` 和 `shader: 'bitmap' | 'bitmap-smooth'`。`BitmapFont` 的 pages URL、glyph 矩形、advance / offset 与 lineHeight 由调用方提供。ref 仍为 `HTMLSpanElement`；保留可读、可复制的真实 DOM 原文，加载或渲染失败通过 `onRenderError` 报告并显示原文。SSR 保留文本，不加载字图或创建 GPU context。

| 属性 | 默认与范围 |
| --- | --- |
| `renderer: BitmapTextRenderer` | 默认 `cpu`；`webgl` 为独立活 GPU context，`webgl-shared` 为同 Document 共享 Offscreen 会话、各实例 bitmaprenderer |
| `profile: BitmapTextProfile` | 默认 `atlas-rect`；另有 `bedrock-unicode` |
| `background?: string` | WebGL target 的具体 CSS clear 色；省略时透明，不能使用 `var()` / currentColor 等依赖上下文的颜色 |
| `color` / `shadow` | 前景色默认白色；shadow 仍需显式 color / offsetX / offsetY，不猜原生阴影 |
| `scale` / `onReady` / `onRenderError` | 沿用原排版尺度与加载回调 |

CPU 仅支持 atlas-rect，且不接受 background。atlas-rect 支持合法裁剪矩形及任意页尺寸；WebGL bedrock-unicode 要求 256×256 页、16×16 完整字格以及按16对齐的 x/y，使用 packed UV / corner 规则，不把 trimmed 字格静默转换为原生 profile。非法 GPU profile / 背景组合走渲染错误回退。

组件沿用已有 code-point / 换行排版，不提供 shaping、自动换行或缺字替代。advance、颜色、阴影、页面与 shader / sampler 的输入仍由宿主负责；选择 WebGL 不会将字体、默认 CPU 或所有输入自动认证为原生一致。

## 低层 API 与 alpha

`renderBitmapGlyphs(options: BitmapGlyphRenderOptions): BitmapGlyphRenderResult` 接收目标 width / height、`ReadonlyMap<number, PixelTexture>` pages 以及有序 `BitmapGlyphRun[]`。所有像素输入和读回行均为从上到下，位置、viewport / scissor 采用左上原点的物理 target 像素。

| 输入 | 合同 |
| --- | --- |
| atlas-rect run | `BitmapAtlasQuad[]`，显式目标矩形及原页 atlasRect，可加 RGBA |
| bedrock-unicode run | 原始 position 的第三分量为 corner ID；UV 为 UNORM16 原整数，颜色为 UNORM8 原整数；显式 indices、glyphHeight、halfTexelOffset |
| 通用 run 状态 | page、sampling、shader 必需；可选列主序 MVP、tint、hudOpacity、viewport、scissor、cull / frontFace |
| background | 透明、solid RGBA 或同尺寸 texture；texture 明确声明 framebuffer / straight-alpha 编码 |
| output | 默认 framebuffer；可显式选择 straight-alpha |
| canvas | 可选独占 `HTMLCanvasElement | OffscreenCanvas`，不能预先创建其他种类 context；传入时尺寸会设置为 target 尺寸 |

结果中的 `data` 默认保留 RGBA8 framebuffer 预乘存储，`alphaMode='premultiplied'`。`output='straight-alpha'` 以已经量化的8位数据进行反预乘、舍入和钳位，可能产生 LSB 差；它不用于证明透明 DOM / native 零差。纹理背景编码与目标 clear 色也参与混合，不能把带原背景的结果直接套作透明文字。

独立 `renderer="webgl"` 将FBO直接copy到预乘活canvas；共享webgl-shared使用Offscreen /ImageBitmap /每实例bitmaprenderer，不经Canvas2D /putImageData。当前共享私有后端复用有限GPU资源且不readPixels；公共 `renderBitmapGlyphs` 仍完整读回，独占canvas、buffers /textures /programs在调用结束清理。公共调用未传canvas时释放临时context，传入时宿主必须调用返回dispose，之后不能继续绘制。共享没有公共lease /session API，其历史证据及新资源边界分别见 [BITMAP_SHARED_QA.md](BITMAP_SHARED_QA.md) / [BITMAP_RESOURCES_QA.md](BITMAP_RESOURCES_QA.md)。

## 已捕获输入的独立验证

证据为忽略目录中的 `.cache/pix-capture/independent-production-font/production-capture-verification.json`，SHA256：`bea90d671be706a3e2675ad6b5e89753e2221b2ddc93bcbde5aa1ee14538ec59`。验证直接调用生产 `renderBitmapGlyphs`，期望为实际捕获的 native post102 / RT106，而非生产 shader 生成的快照。

固定8个真实 draw 使用原 API-before target 作为背景，保持捕获的页、顶点、uniform、顺序与状态；无重拟合、mask 或容差。已测试后端为 NVIDIA GeForce RTX 3050 Laptop 的 ANGLE / D3D11。临时 context 与活 canvas 两条路径均满足：

| 比较范围 | 像素数 | changed RGBA / sumAbs / max |
| --- | --- | --- |
| 完整2570×1402 target | 3,603,140 | 0 / 0 / 0 |
| field＋halo，247×104 | 25,688 | 0 / 0 / 0 |
| 活 canvas 默认 framebuffer，2570×1402 | 3,603,140 | 0 / 0 / 0 |

两条输出及活 canvas 默认 framebuffer 的原始 RGBA SHA256 均为 `6033d7afb5f28ecaac4663dea433e6529927f041d942e1ba76e36a77767d41df`，与捕获 after 相同。活 canvas 的 context 在 dispose 前未丢失、dispose 后已丢失，验证记录无 errors。

这证明上述固定输入在已测后端上可由实际生产 GPU 函数复现。它没有从零生成整个 GUI 背景，也不认证最终 Present、透明 DOM 合成、任意文本 / 颜色 / 坐标 / 字图、所有硬件或默认 CPU。组件自动排版生成的 runs 与直接回放捕获 runs 是不同验证层；低层8 draw 零差不能直接充当组件整屏零差。

旧 CPU、软件后端、浮点阈值和 GUI4/5 反例保留在 [NATIVE_BITMAP_FONT_QA.md](./NATIVE_BITMAP_FONT_QA.md)，不被本次条件式 GPU 结果撤销。私有捕获、游戏原字图与本机 font.json 不进入 Git / npm；公共 API 只接收调用方提供的素材。

## 资源与后续验收

`renderer="webgl"` 每实例独立活context；webgl-shared按Document共享Offscreen，每实例仍有bitmaprenderer canvas /显示结果。当前共享有限持久page /program /buffer /target与跨Document payload预算不代表driver总VRAM或无限容量；按输入同步绘制 /转移，非Worker /多实例一次batch。只有共享组件去除readPixels，公共调用读回和设备限制仍在，资源政策 /待验状态见 [BITMAP_RESOURCES_QA.md](BITMAP_RESOURCES_QA.md)。

组件错误路径保留原文，context loss 经回调报告。此前独立 webgl 路径新GPU7项与旧CPU13项共20/20通过、0跳过，覆盖完整RGBA、Unicode、多页/换行、PMA、StrictMode、后端切换、错误恢复及异步取消；旧CPU测试未改。实际React18/19的123值包消费通过，两消费者各102份dist与受测包逐字节一致。正式结果与包身份见 [VERIFICATION.md](VERIFICATION.md)。公开函数包含尺寸 / 页 / runs / 顶点数量上限检查，但实际可用范围仍受设备 WebGL 限制。

另有独立组件检查：四种透明度 / 背景组合的整个243×100字段及247×104 halo相对独立原PSO shader的浏览器输出RGBA零差，生命周期等15项辅助检查通过。统一摘要 `.cache/pix-capture/independent-production-font/FINAL_SUMMARY.json` SHA256 `a4b772ead0df50e9c75b0e8b371ed7833159da699b541fefd47ae7ac00dca922`；这组浏览器合同验证不替代整GUI的原生验收，也不计额外正式用例。

本轮新增 webgl-shared 正式7项连同旧20项同批27/27通过，48实例资源 / loss恢复及 React18.3.1 / 19.3.1 实际包消费已完成；新共享实际 native 捕获已由 raw RT / 独立 DOM 显示双层检查闭环，生产25项辅助断言与40实例 context 生命周期亦通过，不能由上述独立 webgl 结果直接标为通过。分项证据与消费身份见 [BITMAP_SHARED_QA.md](./BITMAP_SHARED_QA.md)。
