# 附魔书本与经验文字 QA

2026-10-29。依据本机 Bedrock 1.26.6005.0（界面显示26.60）的无损截图与原材质程序，修正经验数字、符文前景字节和书本照明。**书本完整比较区域仍有残差，尚未达到原生 pixel perfect。**

## 原生参考

参考来自新建单人测试世界 `mcbeui GUI Reference`，简体中文、Classic GUI 5。外框176×166游戏像素显示为880×830像素，槽位18×18显示为90×90；保存的窗口图像均为2568×1400。打开 / 关闭样本在创造模式取得；经验不足样本在生存模式、0级、无青金石时取得。

普通自动截图接口返回JPEG，不能验证颜色字节。本次使用原生 Alt+PrintScreen 将剪贴板原图粘贴到画图，再直接保存PNG；PNG签名及尺寸经过检查，没有把JPEG转存作为无损证据。原图只在忽略目录 `.cache/native-gui/` 保存，不进入Git或npm。

| 样本 | 文件 | SHA256 |
| --- | --- | --- |
| 打开 / 可用 | enchanting-open-native-lossless.png | 0d58418de8fe8751481563e13e4615b6752907394d73926746d627900bf308fa |
| 关闭 / 空槽 | enchanting-closed-native-lossless.png | c2ae69ebe7615bcb8e4e993e261833b7e72aa9cefe9ddadaba189cc01bc15646 |
| 打开 / 经验不足 | enchanting-insufficient-native-lossless.png | 57d8cb8ecd4f28750500cbd4b7d513e158c0f897f9c42143139a3992347ec7a9 |

## 经验文字

原始 `enchanting_screen.json` 给出 `shadow:true`、bottom-right锚点、offset `[-2,-2]`，成功色 `[.5,1,.125]` 和失败色 `[.54,.37,.36]`。此前按归一化RGB四舍五入得到的颜色不是最终游戏字节；现直接按上述PNG的不透明字面像素校准：

| 状态 | 主字 | 阴影 |
| --- | --- | --- |
| 成功 | #7fff1f | #204008 |
| 经验不足 | #895e5b | #221717 |

原生GUI 5中三个费用行的可见阴影均向右下偏移5像素，对应GUI 2的2×2 CSS像素。测试独立提取字面和阴影轮廓，比较阈值识别轮廓的位移；其中包含部分覆盖边缘，但低覆盖边缘可能被阈值排除，不代表全部可见抗锯齿边缘都已验过。经验数字的锚点仍由源JSON推导，尚未完成整行文字基线的原生零差认证。

这直接证明当前捕获状态的字节和位移，未推断全引擎通用的0.25暗化或量化算法。`--mc-enchantment-cost-shadow` 仍允许宿主覆盖。公开JSON只声明shadow开关，并不提供阴影RGB算法。

## 书本

使用真实64×32 `enchanting_table_book.png`，SHA256 `e8d23533b48976b578098db767e2c8161a31fa5d7b22bf576bf531b1bc7f000f`。七部件网格参考官方Java 1.21.5客户端BookModel：左右封面、书脊、左右页块及两张翻页面。它仍是Bedrock renderer重建，原生网格与翻页算法未获取。

默认pitch保留20°，让关闭 / 打开书本的高度接近同尺寸原生轮廓。本轮将原先拟合的分面光照替换为本机 Entity / MeshFallback 顶点 DXBC 支持的候选式，在白色 TileLightColor、TileLightIntensity=1、OverlayColor.a=0 假设下为 `L=.725-.1*nx²+.1*nz²+.275*ny`。法线应用模型姿态与当前pitch / roll；网格、UV、材质图像、相机参数及原始alpha不变。`lighting="unlit"` 可查看未经光照改变的atlas颜色。

源系数由安装文件中的实际编译阶段反汇编得到，可运行 `python scripts/inspect-native-enchanting-materials.py --output .cache/native-book-material-proof.json` 核对固定材质哈希、DXBC范围与算术依赖。脚本仅输出哈希、范围、归一化公式，不导出私有二进制或ASM。Entity与MeshFallback的overlay运算顺序分别登记；在本轮overlay=0假设下两者化简式相同。实际书本采用的material variant、uniform与normal矩阵仍未捕获，因此该式是有来源依据的候选，不宣称恢复了原生书本渲染器。

比较原生与Web的完整200×165像素书本区域，包含边缘、背景和遮挡，不隐藏纹理差异，不只比较主体掩码。固定新姿态后，分面光照相对unlit的结果为：

| 状态 | unlit平均绝对RGB误差 | 原经验式 | 本轮候选式 | 差异像素前→后 |
| --- | --- | --- | --- | --- |
| 关闭 | 10.2114 | 0.176596 | 0.165404 | 1281→656 / 33000 |
| 打开 | 31.0869 | 0.415081 | 0.343333 | 2239→1683 / 33000 |

平均误差按每通道0–255计；全RGBA比较的alpha差均为0，最大通道差仍为关闭147 / 打开166。原生关闭书本为76×126像素，打开为169×126；浏览器对应75×126、168×126，边界仍有1像素差异。独立QA直接从固定SHA原图和实际生产canvas重算全部33000像素、99000个RGB通道，没有遮罩、滤边或更换ROI。两组已知样本均曾用于既有模型 / 相机校准，本轮改善不能当作盲测或未知姿态泛化认证。MSAA、LINEAR与更高分辨率降采样实验均使已知状态变差，未据此修改生产采样方式。剩余差异集中在纹理 / 面边界与轮廓，仍须继续核实原生光栅、网格与动态相位。

## 符文字节

Classic selectable / unselectable controls 均使用 `fail_runes` 的固定源色；本轮将默认 `#685e4a` 修正为不透明原生前景 `#685d49`（104,93,73）。打开与经验不足的六行完整登记ROI具有相同主色，关闭的三行无符文，作为负控而非颜色证据。单独 `EnchantingRunes` 与纯文字fallback同时修正，显式宿主 `color` 覆盖保留。该观察不建立全引擎统一floor量化规则，也不证明完整原生字形边缘已经零差；源图集AIZ的Web整数展开仍独立保持RGBA零差。

## GUI 4 的新增对照

在同一个测试世界将UI标度从100%改为80%，实测面板从880×830变为704×664、槽位从90px变为72px。新图 `enchanting-gui4-open-native.png` 的SHA256为 `9db5c35d6d9a1cb1d1178f0db2bdf6e5adae12e11d96e8137be32792975876e8`；直接保存原生剪贴板PNG，未使用JPEG颜色。附魔种子没有通过实际附魔改变，且两位独立检查者直接匹配原图集，确认三行仍为同一符文序列。采集后已恢复100%并暂停游戏。

同一首字竖笔，GUI5有4个实心像素，GUI4有3个；左右各1个混色像素在两缩放中完全相同，分别为RGBA `(108,97,76,255)` / `(156,141,111,255)`。检查保留完整源像素分量和空白halo，分别84 / 66个像素，逐字节比较全部RGBA，无遮罩、阈值或容差。这继续排斥本次测过的“直接对原始128×128图集做bilinear放大”模型，但不能唯一识别运行时glyph缓存或最终合成算法。生产继续保留原图集与已核主色，不加入拟合的小数偏移。完整首段 / 单词 / 字形的区域、固定序列和限制见 [native-rune-sampling.json](native-rune-sampling.json)。

书本也在这个新缩放中保持所有既有参数，以160×160生产canvas比较原生完整 `[992,419,160,132]` 与Web `[0,12,160,132]`。这一区域按源布局和GUI5区域同比推导，没有对书本像素优化配准。全部21120像素中，候选式RGB MAE为0.660859、旧经验式0.750395、unlit为31.446780；差异像素分别1409、1853、12699，alpha差均0。候选式较旧式误差降低11.93%，但最大通道差仍198、轮廓仍宽1px。这是新缩放的验证，不能称为新姿态认证或零差。固定数据见 [enchanting-renderer.json](enchanting-renderer.json)。

## 自动验证与复验

`tests/enchanting-renderer.spec.ts` 覆盖真实atlas哈希、WebGL非空渲染、开合与翻页受控行为、经验主字和阴影、宿主覆盖、主页面未遮罩组合、青金石underlay，以及三个可选原生PNG验收项。原生项验证PNG签名 / 哈希、完整区域改善与残差、绿字 / 红字及阈值阴影轮廓位移；用户没有这些本地PNG时明确跳过，不生成替代期望图。

运行 `npx playwright test --project=pixels tests/enchanting-renderer.spec.ts`。普通构建和消费不需要本机游戏或PNG。完整数据、相机 / 光照参数与证据路径见 [enchanting-renderer.json](enchanting-renderer.json)。书本重建、费用局部证据及整个附魔台原生验收是三个不同范围。
