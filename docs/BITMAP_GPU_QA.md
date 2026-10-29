# Bitmap 字体 GPU 路径与验证边界

当前公开范围为 117 个组件、3 份 renderer 数据及 3 个渲染函数，共 123 个运行时值。`shadeItemGlint` / `renderItemGlint` 是纯纹理运算；新增 `renderBitmapGlyphs` 会分配浏览器 WebGL 资源、执行绘制与读回，不能作为纯函数或 SSR 绘制调用。它不增加组件数量。

## 组件 API

`BitmapText` 继续要求 `font`、字符串 `children`、显式 `sampling: 'point' | 'bilinear'` 和 `shader: 'bitmap' | 'bitmap-smooth'`。`BitmapFont` 的 pages URL、glyph 矩形、advance / offset 与 lineHeight 由调用方提供。ref 仍为 `HTMLSpanElement`；保留可读、可复制的真实 DOM 原文，加载或渲染失败通过 `onRenderError` 报告并显示原文。SSR 保留文本，不加载字图或创建 GPU context。

| 属性 | 默认与范围 |
| --- | --- |
| `renderer: BitmapTextRenderer` | 默认 `cpu`；显式 `webgl` 才启用独立活 GPU canvas |
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
| canvas | 可选独占 WebGL canvas，不能预先创建2D context；传入时尺寸会设置为 target 尺寸 |

结果中的 `data` 默认保留 RGBA8 framebuffer 预乘存储，`alphaMode='premultiplied'`。`output='straight-alpha'` 以已经量化的8位数据进行反预乘、舍入和钳位，可能产生 LSB 差；它不用于证明透明 DOM / native 零差。纹理背景编码与目标 clear 色也参与混合，不能把带原背景的结果直接套作透明文字。

组件将 FBO 直接在 GPU 上 copy 到 `premultipliedAlpha:true` 的活 canvas；该显示路径不经 Canvas2D / putImageData 往返。函数仍执行像素读回供调用方使用，不能称为完全无 CPU 读回。未传 canvas 时函数使用临时 context 并在结束后释放；传入 canvas 时返回 `dispose()`，宿主不再使用时必须调用，释放后不能继续在该 canvas 绘制。内部 buffers、textures、programs 等在调用结束清理。

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

每个启用 WebGL 的 BitmapText 实例持有独立活 context。浏览器存在 context 数量、GPU 内存和目标尺寸预算；本轮未实现中央 batch / 共享 renderer，不支持据此宣称任意大量 GPU 文字实例。建议控制同时可见实例、复用稳定输入，并让组件切换 / unmount 释放不再使用的资源。

组件错误路径保留原文，context loss 经回调报告。正式新GPU7项与旧CPU13项共20/20通过、0跳过，覆盖完整RGBA、Unicode、多页/换行、PMA、StrictMode、后端切换、错误恢复及异步取消；旧CPU测试未改。实际React18/19的123值包消费通过，两消费者各102份dist与受测包逐字节一致。正式结果与包身份见 [VERIFICATION.md](VERIFICATION.md)。公开函数包含尺寸 / 页 / runs / 顶点数量上限检查，但实际可用范围仍受设备 WebGL 限制。

另有独立组件检查：四种透明度 / 背景组合的整个243×100字段及247×104 halo相对独立原PSO shader的浏览器输出RGBA零差，生命周期等15项辅助检查通过。统一摘要 `.cache/pix-capture/independent-production-font/FINAL_SUMMARY.json` SHA256 `a4b772ead0df50e9c75b0e8b371ed7833159da699b541fefd47ae7ac00dca922`；这组浏览器合同验证不替代整GUI的原生验收，也不计额外正式用例。
