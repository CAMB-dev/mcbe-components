# GUI sprite与展示采样验证

本文记录b09ff7a sprite / 布局zoom检查点。后续source model / itemModels源码与拟新增公开函数另有验证阶段，本文944用例与已测131值包不能直接认证新代码；当前进展见 [GUI_MODEL_QA.md](GUI_MODEL_QA.md)。原4928非零完整GUI结果保留。

本轮保持120组件、4份数据、7个函数，共131个运行时值。`GuiLayer` / `renderGuiLayer` 增加 `kind:'sprite'` 命令与导出类型 `GuiSpriteGeometry`；`EnchantingTable imageRender.itemImages` 可选接入普通物品PNG。公开sprite源输入 / GPU / React正式13项已通过，实际组件、整GUI、实际包与生产分别验收；上一图文阶段920唯一用例 / 131值包身份保留为历史，不能套作新shader与CSS的验收。

## 公开sprite命令

`GuiSpriteGeometry extends GuiImageGeometry`，共享GLOBAL game rect、完整原纹理 / uvRect、nine-slice、归一化tint / hudOpacity及物理scissor；另有可选 `color: GuiTextRgba8`，默认四字节255。React命令的texture可以是URL或显式RGBA8；低层函数接收显式解码纹理。sprite与image / text保持调用顺序，在同一RGBA8目标中切换程序，不插入中间物品canvas。旧 `kind:'image'` 保留UI/Blit含义。

```tsx
import { GuiLayer } from 'mcbeui';

<GuiLayer width={1280} height={720} guiScale={2}
  commands={[{ kind: 'sprite', texture: '/items/diamond_sword.png',
    rect: [20, 20, 16, 16], color: [255, 255, 255, 255],
    tint: [1, 1, 1, 1], hudOpacity: 1 }]} />;
```

该profile为实际观察到的 **UI/Sprite / Transparent / variant0 / MultiColorTint Off**，POINT / CLAMP，SRC_ALPHA / INV_SRC_ALPHA颜色混合、ONE / INV_SRC_ALPHA的alpha混合。它不覆盖同material的AlphaTest / Blend或其他变体。令 `s` 为纹理采样、`c` 为归一化RGBA8顶点颜色：

```text
rgb = (s.rgb + (s.rgb * c.rgb - s.rgb) * s.a) * tint.rgb
alpha = (c.a > 0 ? ceil(s.a) : s.a) * tint.a * hudOpacity
```

顶点alpha只选择ceil分支，**不是透明度乘数**；例如1与255均选择正分支。Transparent程序无alpha-discard阈值。整体透明度应显式使用tint alpha / hudOpacity，不能按常规CSS opacity理解顶点alpha。白色顶点、二值alpha图在POINT采样下可化简为旧blit公式，但这不证明半透明 / 非白色图普遍等价，也不宣称所有设备上的8bit存储或合成完全一致。

## 实际附魔台可选物品接入

`imageRender.itemImages?: boolean` 默认为关闭。开启后只把有非空 `item.image` 且没有自定义 `item.icon` 的已占用槽位送入sprite层，使用槽内居中的16×16 game rect；count0为空槽，不生成物品。普通物品与lapis / inventory依源顺序组合，数量、耐久、tooltips、焦点、操作与其他DOM语义继续由原组件保留。自定义React icon、3D / 旗帜renderer不被检查或转换成纹理。

只有整个组合目标ready时才隐藏被替换的DOM物品视觉，资源或GL错误整层回退；是否保留38槽、ref / 选择 / 焦点 / stateful book、加载 / 取消 / 恢复与局部pan，以本轮实际组件正式报告为准。该选项不推算游戏物品规则、atlas注册或3D相机。

## 原物品布局与材质来源

`.cache/gui-item-source-study-01/{RESULT.json,REPORT.md}` 只读固定原UI、已存捕获buffer与原PNG。GUI4 / GUI5在2570×1402中各有六个剑quad：一钻石剑、五木剑；独立按容器18×18、居中16×16、热栏9列与锚点求值。共48顶点的192个XY half字节与192个UV UNORM16字节全部一致。此处不包含未由正常source输入恢复的z / w，不能称完整native VB恢复。

两张完整16×16原PNG在512×1024原atlas中各有唯一RGBA匹配；通过扫描图像求得tile位置，再独立计算UNORM16，捕获UV仅用于比较。固定tile的相同画面不等于任意scale / 过滤 / atlas边缘都相同，生产不加入经验UV偏移。

安装版UISprite material与两捕获SM65程序身份相符。VS使用half4 position / UNORM16 UV / UNORM8 color，PS只用明确TintColor与HudOpacity窗口，无光照或AlphaTest discard。shader / 材质二进制仅留私有缓存，不进入Git / npm。`.cache/gui-sprite-oracles-01/FINAL.json` 记录四次串行before-only原目标读回，均exit0 / error0，仅去row padding；既有DLL与捕获字节不变。这是读取oracle的证明，不是renderer通过声明。

## 独立公开sprite正式测试

`.cache/gui-sprite-independent-qa/final-report.json` / FINAL.json / RESULT.md为最终单批13 / 13 PASS，47.4秒，0skip / retry / flaky；9项公开synthetic合同与4项需要私有捕获的原生比较。Chromium sandbox、D3D11、1280×1000 / DPR1；实际记录为NVIDIA RTX3050 Laptop / ANGLE D3D11。缺私有oracle时四项明确skip，不伪造expected。

九项公开测试通过完整独立RGBA8期望核对部分alpha纹理、非白RGBA8色、Tint / HudOpacity、顶点alpha正值与零分支、有序IMAGE→SPRITE→TEXT→SPRITE→IMAGE混合、UV / per-command scissor / 全frame crop、变更与等值请求、StrictMode共享URL解码、原子资源失败 / retry / ref / focus / context loss，以及网络 / GPU前预算拒绝。公式独立转录安装版SM50汇编，并核对主程序 `lt / round_pi / movc / mad / mul` 指令序列；不以生产shader字符串作expected。synthetic数值结果只覆盖测试输入，不能宣称所有通用半透明图在所有后端均已原生认证。

四项原生比较为GUI4 / GUI5 × 完整512×1024原atlas / 完整standalone原PNG。输入来自独立解析原UI求值rect、逐RGBA扫描原tile位置和原始纹理；捕获vertices / matrices不作为正常输入。四底层FBO与四实际React GuiLayer完整2570×1402目标，共28,825,120像素严格RGBA0；四个底层活canvas另外亦为0，不重复计入像素总数。每项都以匹配的原native-before framebuffer为显式背景，仅认证该sprite过渡，不重建背景内已有GUI。

两unique scale的48顶点XY192字节 / atlas UV192字节、indices、白顶点色与每scale七个影响XY投影的条目全部匹配；未恢复native z=-830 / w / 深度系数，不声称完整VB / CBV一致。standalone与atlas在这些实际采样位置全输出一致，未加epsilon / UV偏移；两个已知scale及一个viewport不等于盲测或任意scale / filter / stitch认证。

首浏览器批次也13 / 13通过，但只计最终一批。此前TypeScript诊断发现SSR测试构造了Uint8Array，而公开PixelTexture.data类型要求Uint8ClampedArray，仅修正测试构造；原诊断与初报告保留。独立提取六段旧image / text / copy shader与42f25e9逐字节相同，四core source匹配冻结身份，无生产修正或旧证据覆盖。

## 实际附魔台组件正式测试

`.cache/enchanting-sprite-independent-qa/{final-report,FINAL}.json` 为扩充后最终完整11 / 11 PASS，21.5秒，0skip / retry / flaky。两个完整GUI4 / GUI5输出共1,206,225像素与独立解析原UI命令队列同字节；actual / expected共同使用公共renderGuiLayer，因此认证adapter顺序 / 几何 / material选择，不是第二份独立shader或native whole-GUI证明。实际后端为SwiftShader，与前节NVIDIA认证分开。

用例覆盖默认 / false保留DOM物品、item-only的38槽sprite标记、count / durability / canonical文本保留、自定义icon与count0 / nonfinite规则、text＋sprite同目标、部分alpha ceil行为、URL变更、disabled物品显式hudOpacity像素、延迟加载原子显示、失败 / 错误度量 / context loss全CSS回退及恢复。ref、同section / stateful book / 选择 / 焦点 / callbacks均保留。320 / 1280视口、GUI4 / GUI5、displayScale1 / 2 / 2.5共12组合核对布局reservation与实际局部scroll移动，另精确核对GUI4 D2和GUI5 D2.5的有效net1× backing比例。

初批10 PASS / 1 FAIL来自测试错误要求任意小数CSS尺寸在0.0005px内保留理想double精度；GUI5 D1实际353.1875而非353.2，属布局1/64CSSpx量化。仅修正CSSOM合同为一布局量子内，并增加整数有效比例的无容差检查；全部framebuffer RGBA仍逐字节零容差。初截图 / context / trace与18.0秒的pre-expanded通过报告均保留，最终11项只计一次。此批只覆盖square16×16 synthetic物品，不恢复通用object-fit、自定义ReactNode光栅、unsupported-zoom fallback或原生数量算法。

## 先定位raw绘制与浏览器呈现的差异

上一图文阶段的10,155差异像素由 `.cache/gui-residual-map-01/FINAL.json` 在冻结42f25e9源码重新复现。raw图文GPU层与固定书本绘制存在零差证据，最终DOM截图仍有细线、第三行文字 / 经验粉及书本边界差异；源空间区域分区不自动等于因果分类。诊断保留完整3,603,140像素全帧与747,600像素ROI，没有移位拟合、mask或从评分裁去残差。

后续 `presentation-probes-01` / `02` 在新目录测试浏览器采样。两层互逆CSS transform可在net1×下仍引入canvas采样相位差；两层布局zoom候选保持原bbox / backing / 原始GPU字节，诊断结果降至7,078差异，全部在hotbar：3D区4,928与木剑区2,150。该probe只是诊断，不自动作为新生产shader或整GUI通过证据。

本轮在支持 `zoom` 时将显式displayScale与canvas reciprocal scale交给布局zoom，保留原transform作为不支持时的fallback；不加坐标拟合或改变宿主frame。CSSWG的[CSS Viewport编辑草案](https://drafts.csswg.org/css-viewport/#zoom-property)把zoom缩放用于布局used values并定义嵌套缩放相乘、几何API包含缩放；这是机制依据，不能代替本机像素验证或证明跨浏览器零差。该编辑草案仍在演进。

## 当前生产源码的完整GUI对照

`.cache/full-gui-sprite-integration-01/FINAL.json` / RESULT.md为12组合：4幅上一阶段不可变原图引用与8幅当前真实React渲染。固定frame2570×1402 / GUI5 / origin[169,57.5] / displayScale2.5，同时保留完整全帧3,603,140像素和ROI[840,282,890,840]共747,600像素；无mask、拟合origin、容差或native atlas作为生产输入。

| 路径 | Public CSS18 默认 / 显式book | Gallery CSS20 默认 / 显式book | RGBA绝对差总和 |
| --- | --- | --- | --- |
| 上一组合transform | 10,155 / 10,155 | 10,155 / 10,155 | 1,663,443 |
| 当前布局zoom，itemImages false | 7,078 / 7,078 | 7,078 / 7,078 | 773,597 |
| 当前布局zoom，itemImages true | 4,928 / 4,928 | 4,928 / 4,928 | 367,897 |

最终ROI MAE为0.12302601658640984，最大通道差252、alpha差异0，ROI外没有变化像素；**完整native GUI仍NOT EXACT**。剩余恰在三格3D hotbar：1,766 / 1,766 / 1,396像素。五木剑 / 耐久、钻石剑输入、已观察标签 / runes / costs / 经验图片 / 槽边与固定book姿态在本次完整图中零差；这是固定条件的空间定位与比较结果，不等于唯一恢复原生3D相机 / 光照 / 模型或任意书本动画。

实际root[845,287.5,880,830]、book[910,340,200,200]及canvas[843,286,883,832] / backing883×832均不变，38slots完整。等待真实book绘制、3个BlockPreview ready与原物品图加载后才测量；sprite模式标记槽0 / 33 / 34 / 35 / 36 / 37，六个原DOM img仍存在且complete，仅在ready后隐藏视觉，zoom-only保留可见。后端为本机NVIDIA RTX3050 / ANGLE D3D11。

两张16×16物品PNG与固定官方v1.26.60.5完整ZIP逐字节相同：diamond_sword.png 198字节、wood_sword.png 225字节。public字体data-only桥只移除全局FontFace / CSS副作用，八个实际font metadata / page URL组合经正常相对URL解析后均与生产gui-fonts.json深相等，CSS18 / CSS20宿主环境保留不同。全部23个source pin在每次运行间及当前均相同，250份历史冻结文件未变；原图、实际几何、字体 / 图片身份及评分均在FINAL逐条登记。

runner-only的不存在source pin前检错误与5197端口占用记录保留，最终用5206执行；未操作原生UI或新捕获。该12组合属于辅助完整场景测量，不增加正式case。unsupported-zoom fallback、任意displayScale / DPR / 宿主CSS与其他driver仍不由此认证。

## 正式累计与旧相关回归

`.cache/gui-sprite-existing-final.json` 旧相关102 / 102 PASS，157.9秒，不计新增。runner曾把JSON落在嵌套 `.cache/.cache` 路径，外层报告是原件同SHA复制，原件保留；没有改写测试结果。新实际附魔台suite扩充后最终11 / 11 PASS，21.5秒、0skip / retry / flaky；此前18.0秒批次另存pre-expanded，不双计，组合 / 生命周期边界另由其最终报告登记。

`.cache/gui-sprite-validation-integration-summary.json` 按project / 文件 / 完整标题累计944唯一用例：939 PASS、5预期SKIP、0未解决失败，新增13＋11；这是多个范围批次累计，不是944项单次整套全绿。辅助全GUI图、probe / shader研究与生产检查不增加正式case。

## 实际包消费

`npm run verify:package` 实际构建并把打包文件安装到React18.3.1 / 19.3.1消费者。120组件、4数据、7函数 / 131值、SSR、严格TSX / ref / 新sprite及itemImages类型、样式、字体 / renderer资产与许可检查通过。已测包 `.cache/gui-sprite-consumer-verified.tgz` SHA256为 `97255a7b1d3b4b6f7405f15b6a9cb31b4cbdcbcedee810d5bfb62704edce82a3`，`dist/index.js` SHA256为 `e62b5fe666033a9b391f7a0660e39736a133317bf635d8f20be42b48fe828e4b`；`.cache/gui-sprite-consumer-identity.json` 证明两消费者各256份dist与本轮构建逐字节相同。私有字体 / 捕获 / 原生shader不进npm。

最终文档包以 `.cache/gui-sprite-final-pack-proof.json` 逐条登记与已测包比较：仅README / docs可变化，所有非文档条目必须同字节；实际消费认证只通过此身份链关联。

## 实际生产展示页

`.cache/gui-sprite-production-01/{smoke,identity,FINAL}.json` / RESULT.md记录47辅助检查PASS，不增加正式944项。实际HTTP的8个HTML / assets入口与当前site逐字节相同；主 `main-Bu--OVeg.js` SHA256为 `e347ce5ca76c997985e66a84ec45b959fe40474542f43b87dd5a1e3af7a9040f`，上一gui-text生产原件未改。

`#gui-layer` 默认启用两个开关，source槽标记0 / 1 / 2，三个原DOM img已解码、ready后只隐藏视觉，数量32与8保持可见。text / itemImages四组合保留同section、选择、计数与回调；双关恢复GuiImageLayer及所有DOM物品，关text / 开items保留DOM标签而使用sprite。清空后仅库存source槽2 / count8，恢复后回到0 / 1 / 2。此次demo无durability输入，不声称有值耐久条被生产smoke演练。

GUI4 / GUI5均为单ready目标与38槽、352×332 root，backing707×667 / 883×832；实际支持zoom，plane / canvas的transform均none。焦点 / 选择 / 回调、close / reopen、直接hash显示、390px文档390与局部pan client300 / extent364均通过。150icons全解码，分类 / 搜索4匹配，17×17图在3×为51×51。

page / console / render与非取消网络错误均0；raw requestfailed实际12次ERR_ABORTED保留，5个distinct退役资源另经HTTP200且site字节一致。所有settled层ready、无render error-state；不能把原始请求失败写0。运行后端为SwiftShader，辅助功能验收不替代NVIDIA native parity。通用半透明、未观察物品 / 3D相机 / 动画 / 所有GUI的原生逐像素验收仍各有边界。
