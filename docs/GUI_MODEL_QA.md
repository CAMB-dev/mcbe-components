# GUI source model验证

本轮增加从局部模型 / 原始纹理到GLOBAL half几何的显式路径，并在公共barrel新增两个纯函数 `layoutGuiModel` / `createGuiCuboidModel`。公开清单为120组件、4份数据、10函数 / 134运行时值；两model函数、纯assembleGuiTextureAtlas及相关类型均已通过实际包消费。公开正式17项、实际组件12项已通过；source-atlas路径复现一个已观察固定GUI5完整UI target的RGBA零差，范围见后文。普通standalone原PNG路线仍有非零差，旧结果不被覆盖。上一b09ff7a sprite检查点944唯一用例（939 PASS、5预期SKIP）和120 / 131值包仅作历史；更广GUI状态仍各自验收。

新增调查已确认standalone与atlas采样域不能互换，现通过普通原PNG＋显式packing数据的source atlas保留采样域。纯 `assembleGuiTextureAtlas` 已进barrel，10函数 / 134值由React18 / 19实际包确认。原PNG模型32像素完整GUI非零报告保持不可变；source-atlas是另行验证的新输入条件，不把该旧路线改写为通过。

## 显式源模型接口

`GuiModelMesh` 含有序 `GuiModelFace[]`；每face为四个局部3D顶点、四个源纹理像素UV、可选texture key / normal / RGBA8 color。`GuiModelGeometry` 要求model、GLOBAL game `origin`、显式 `projection` 与 `textureSizes`；可另给归一化tint / hudOpacity及物理scissor。projection中yaw / pitch为度数，scale为game单位 / 局部模型单位，offset为game平移，`originQuantization` 必须声明 `none` 或 `physical-floor`。

`layoutGuiModel` 是无I/O、无GPU的纯函数：先按显式规则量化source origin，再投影局部顶点，加offset与GLOBAL origin，最后只对GLOBAL XY做binary16打包；UV按原纹理尺寸转UNORM16，face保持原顺序及固定triangle拓扑，返回whole-frame投影、paintOrigin与各纹理face runs。它不根据目标大小自动fit，不预设native camera / lighting，不把捕获的全局vertices / MVP当作正常输入。

`createGuiCuboidModel(min,max,options?)` 在0…16参考立方内构造六face，逐轴要求0≤min<max≤16，返回普通source mesh；调用方可覆盖各面texture key / RGBA8 colors。未覆盖时只是明确的几何 / UV约定，不等于所有未观察back / bottom / west视角均已原生认证。自定义模型可直接提供局部顶点与in-texture UV，不受该cuboid helper的参考立方限制。

`GuiLayer` / `renderGuiLayer` 增加 `kind:'model'`：普通源model / projection / origin与textureSizes，React textures record可用URL / 显式RGBA8，低层为显式解码纹理。可见face的source key只读own属性，可用显式own `all`作为fallback；尺寸必须与实际纹理匹配。各face通过既有UI/Sprite Transparent程序进入同一RGBA8目标，按源命令顺序与image / sprite / text组合，不新增局部模型canvas。RGBA8 face色、归一化Tint与HudOpacity仍分开，sprite alpha分支含义保持原合同。

所有角度、scale、offset与量化规则由调用方声明；库不提供“原生默认相机”。旧BlockPreview的CPU fit / camera / lighting和自定义renderer保持原样。该新通道是显式选用的source renderer，不自动把旧局部CPU光栅图当作已恢复native提交。

例如宿主已准备好显式projection与纹理的普通model数据后，可直接复用同一目标；下面只是API用法，不是原生观察profile：

```tsx
import { GuiLayer } from 'mcbeui';
import type { GuiModelItem } from 'mcbeui';

export function SourceModelLayer({ item, origin }: {
  item: GuiModelItem;
  origin: readonly [number, number];
}) {
  return <GuiLayer width={1280} height={720} guiScale={2}
    label="Caller-configured source model"
    commands={[{ kind: 'model', ...item, origin }]} />;
}
```

## 可选InventoryItem与附魔台组合

`InventoryItem.guiModel?: GuiModelItem` 为可选数据，含model / projection / textureSizes / textures及可选Tint / HudOpacity；普通ItemSlot继续保留其DOM回退。只有 `EnchantingTable imageRender.itemModels` 显式开启才读取该数据。槽位source origin由原slot rect求值，不读取DOM bbox来拟合位置。

显式model可与itemImages同时使用；有guiModel时model优先，其自定义icon / image仍作为整层加载失败回退保留。只有整个目标ready后才隐藏对应物品视觉wrapper，数量、耐久、tooltip、AT语义与原操作节点保持；失败应整层恢复。该ready / fallback与同section / focus / selection / stateful book合同须由本轮实际组件QA证明，不预先视为通过。

## 已有只读研究及非唯一性

`.cache/gui-block-transform-study-01/{REPORT.md,RESULT.json}` 与 `.cache/gui-block-uv-study-01/{REPORT.md,FINAL.json}` 读取固定官方ZIP、原PNG和既有GUI4 / GUI5 G57数据；没有GPU replay或生产改进声明。三物品为两16×8×16 slab和一16×12×16 table，九可见face。两个已知scale共72顶点：GLOBAL XY half、UV UNORM16与RGBA8面色各288字节匹配；这不是完整VB / CBV / native emitter恢复。

一个统一观察候选为yaw45° / pitch30° / scale0.625，量化source origin后平移。X可行区间为[8.0625,8.116432188134524]；Y为[8.93269052838329,8.946559207056708]。8.936157698051645、8.943092037388354和8.9375都匹配已观察GLOBAL XY字节；**8.9375只是调用方可声明的观察候选，不是原UI找到的常量或唯一原生算法**。local半精度先取整负控在三候选的差异为0 / 6 / 0，不能写成一概拒绝该替代模型。近邻角度 / scale及原CPU算术顺序未被穷尽排除，两个已知scale也不是blind holdout。

native-compatible visible face顺序为up / east / south，各四顶点按源约定发射，indices为[1,2,0,0,2,3]。旧CPU的UV方向本已正确，east面的旧quad对角线与该拓扑相反；半精度GLOBAL位置可能使投影quad非严格平行四边形，对角线会影响插值。此事实不授权旋转原PNG、经验UV偏移或硬编码捕获vertices。

slab的up / east / south原顶点色为255 / 127 / 186灰度，table三可见面均白；这些是明确观察配置，不恢复通用光照函数。stone / table top / side完整原PNG在各原atlas中各唯一匹配，未绘bottom有两个匹配；不能据同画面宣称唯一底面绑定或未观察face的native纹理使用。

UV研究最初错误断言unused bottom唯一匹配，后又遇Python list / tuple容器比较问题；仅改断言范围 / 比较规范，未改原像素、native值或阈值。最初诊断未另存原日志，INITIAL-NOTE如实记录，不把后来笔记冒充初次文件。

## 两个新原目标oracle

`.cache/gui-block-oracles-01/FINAL.json` 记录恰好两个新串行before-only读回：GUI5 beforeG58 / afterG57与GUI4同边界。原beforeG57来自sprite阶段immutable引用，不重复读回 / 覆盖。两目标完整2570×1402、RGBA8 UNORM / sample1，exit0 / errors0；只按声明rowPitch移除row padding，不resize / crop / gamma / unpremultiply / mask / tolerance。既有helper DLL与原 / analysis captures哈希不变，无原生UI操作、新capture或重启。

G57原生draw支持区GUI5为9,121像素、GUI4为5,884像素，alpha变化0。这是native draw触及范围，不是Web误差或whole-GUI改进。即便未来固定draw重现，也不能省略完整GUI4928旧残差的真实复验。捕获atlas和完整target只用于私有oracle；生产正常输入仍须是source model / transform与原始资源。

## 原PNG与显式source atlas

独立首批14项为12 PASS / 2 FAIL；两个原atlas路径不代表两个standalone路径也精确。完整原PNG模型在GUI4仍102像素不同（max246）、GUI5为32（max230），alpha均0；初报告 / trace与完整actual / expected图留存。这与实际完整GUI32残差是不同作用范围的证据，不能把原PNG失败静默改成原生通过。

`GuiTextureAtlasSource` 是普通源数据：`kind:'atlas'`、width / height、tiles列表；每tile明确origin / size与完整原图URL或RGBA8。low-level `GuiTextureAtlas` 接收已解码原图叶节点，包含普通ImageBitmap或RGBA8；不能嵌套atlas。GuiLayer的image / sprite与model textures可以使用该union，text pages仍只接受原叶页，不把组装图冒充原packed-font页；旧GuiImageLayer / renderGuiImages接口保持原样。它不是captured native atlas bitmap或自动游戏packing算法，坐标由宿主明确声明。当前观察配置使用stone[96,16]、table top[848,112]、side[832,112]；这些通过完整原PNG扫描建立，是有限观察packing配置，不宣称恢复了CPU自动排列算法。

纯函数 `assembleGuiTextureAtlas` 把显式原RGBA8图按整像素位置逐行复制，gap保持透明zero，不采样、不premultiply、不tint、不色彩转换、无需浏览器 / GPU / I/O；其CPU输入不接受ImageBitmap。GPU路线用texSubImage在显式目标中装配已解码叶图，不经过Canvas2D或“重新绘制”纹理，不改变旧shader或加UV epsilon。原图真实字节和原UV / 全frame模型输入保持各自含义。

React接入把leaf URL扁平去重，分别计入解码叶资源与assembled纹理预算，snapshot同时保留packing布局与leaf像素；原子loading / error / 取消 / retry由后述独立与实际组件QA分别验证。atlas每边为1…8192整数、总16MP以内、tiles最多256，空atlas可为透明图；每tile正size、integer origin、in-bounds，不允许overlap（边相接允许）或sparse / inherited数组条目。此处描述输入合同，GPU / React与固定完整GUI的证据在后节分列，不能推广为standalone或任意atlas通过。新atlas完整场景在另目录保留，与旧32报告分开。

## 独立公开model / atlas正式测试

`.cache/gui-model-independent-qa/{final-report,FINAL}.json` 最终完整单批17 / 17 PASS，43.8秒，0skip / retry / flaky：13公开合同＋4私有native比较。实际后端NVIDIA RTX3050 / ANGLE D3D11，Chromium sandbox、1280×1000 / DPR1。两known scale / 一个viewport下的显式yaw45 / pitch30 / scale0.625 / offset候选仍不是唯一CPU恢复或blind holdout。

公开用例覆盖无默认projection的SSR、局部坐标与source-origin量化、normal可见性与face顺序、cuboid UV / 非对称RGBA8、非方纹理 / Sprite alpha、material切换 / scissor、own texture key / all fallback / culled binding不请求、等值请求稳定 / projection与bytes更新、decoded-size错误 / retry / context loss / 取消及预算拒绝。新增纯装配完整字节、URL叶图去重 / 无Canvas2D、packing / tile尺寸 / pixels snapshot与非法metadata预检亦覆盖。八段旧image / sprite / text / copy shader kernel身份不变，未改shader或添加UV偏移。

四个native正向条件是GUI4 / GUI5 × 完整native atlas oracle输入 / 原PNG显式source-atlas输入。四FBO与四实际1:1 React DOM完整截图，共28,825,120像素严格RGBA0；另四low live与四React raw各14,412,560像素亦为0，不叠入前述主计数。每项使用对应原native-before背景，只认证G57 model过渡，不把背景里的GUI当作从source重建。源参数独立求值并对每scale36顶点的XY / UV / RGBA各144字节及indices / 七个XY投影条目比较，跨scale为72unique顶点、各288字节一致；native z / w / 全CBV并未恢复。

原PNG装配路线按完整RGBA搜索建立tile metadata，不以捕获UV生成expected。最初三tile source atlas在GUI4仍1像素 / 3bytes不同、max116，atlas-initial批16 PASS / 1 FAIL保留。该sample落到邻tile[864,112]；扫描2,183个官方16×16 PNG后，完整16×16 end_rod.png与邻tile唯一全RGBA匹配，加入这张完整原图后新正向通过。没有只补一个texel、修改expected或加epsilon。该四tile配置仅认证已观察packing，不恢复自动stitcher；GUI5完整场景的三tile观测另见后节，不能外推所有packing都只需可见tile。

首14项12 PASS / 2 FAIL的standalone原PNG102 / 32差异保持原报告 / trace / 图与严格期望；`GUI_MODEL_STANDALONE_DIAGNOSTIC=1` 仍可复现该非零条件。最终17项验证的是新增source-atlas正向输入，没有把standalone失败静默改pass。只读审查曾误怀疑sparse尺寸tuple未校验，实际原builder已经校验，定向SSR拒绝检查通过、未改生产；诊断不增加正式用例。

## 实际itemModels组件正式测试

`.cache/enchanting-model-independent-qa/{final-report,FINAL}.json` / RESULT.md为12 / 12 PASS，26.8秒、0skip / retry / flaky。只有一次正式run，initial全过；final是同run的逐字节canonical副本，不能计作第二次。17份source / fixture / spec身份在前后均不变。

GUI4 / GUI5普通原tile及GUI5 source-atlas三个完整canvas共1,940,881像素与独立原UI command queue同RGBA字节；参考与实际共用public renderGuiLayer，只认证adapter source origin / order / material / binding，不是另一独立shader或native whole-GUI证明。实际后端SwiftShader，与上节NVIDIA分列。source-atlas用完整2×3 synthetic PNG含非二值alpha，放在8×8 atlas的[3,2]，独立zero-buffer copy作expected，不调用生产assemble helper。

实际覆盖38model槽优先于image / icon、混合33model＋1sprite、自定义节点 / count0 / nonfinite、model-only不造fallback画、count5 / 8与50%耐久 / canonical文字保留、无嵌套属性泄露。一个bad projection / missing texture / overlap / decoded-size错误影响一model而其他37有效时，整目标原子失败，880×830有效展示尺寸与所有fallback恢复；延迟或失败一个atlas URL亦不部分隐藏。stateful icon / book、section ref、焦点 / 选择 / primary / secondary回调和真实context loss往返保留。

disabled model按宿主hudOpacity乘原Web半透明因子，`.8*.5`完整80×80区域与enabled `.4`一致，不改vertex alpha、不认证native disabled renderer。320 / 1280、GUI4 / GUI5、D1 / D2 / D2.5保持flow / source尺寸与实际窄屏pan；close / reopen仍38槽。unsupported-zoom fallback、其他engine、native数量算法及任意custom-node光栅均不由此认证。

## 相关回归与正式累计

`.cache/gui-model-existing-final.json` / gui-model-existing-RESULT.md固定按整文件选择受测profile，126唯一相关旧用例均在其声明范围通过：gui-layer.spec.ts与gui-sprite.spec.ts两完整文件的30项取稳定NVIDIA / D3D11，其余文件96项取标准Chromium；每条保留sourceProfile / sourceReport。不是按单case挑成功，也不是126项单批全绿。

首强制NVIDIA126批为123 PASS / 3 FAIL：旧SwiftShader观察的disabled合成色蓝通道166在NVIDIA为165，另有native fixture等待timeout与font-ready context销毁。并行build / HMR仅为后两项可能原因，未证明因果。标准126批为121 PASS / 5 FAIL：四个明确NVIDIA backend断言收到SwiftShader，另一native Smooth标签目标不一致；均保留原JSON / trace。最终稳定NVIDIA的两整文件30项通过，其他96标准项原已通过；生产 / 测试源与RGBA阈值未为此改变。它说明后端合同边界，不能用跨profile单批失败或聚合通过推导所有driver精确。

`.cache/gui-model-validation-integration-summary.json` 按project / 文件 / 完整标题累计973唯一用例：968 PASS、5预期SKIP、0未解决合同失败，新增17＋12；这是多个范围批次累计，不是973项单次全绿。producer检查、原生支持像素数、20辅助完整场景与生产65辅助检查均不增加正式case。独立17项与组件12项不外推未观察形状 / 视角 / 动画、其他viewport / GPU及所有GUI。

## Producer合同自检（不计正式用例）

`.cache/gui-model-builder-01/FINAL.json` 为12项纯builder自检与source typecheck通过；普通source模型 / 显式观察profile产生72顶点的XY / UV / RGBA各288字节匹配。这仍是producer有限观察候选，不是独立模型、native像素或唯一CPU算法证明。

`.cache/gui-model-core-01/FINAL.json` 为11项实际GuiLayer / React / SSR smoke通过，旧prepared Sprite GPU程序未改。初probe把2×3 UV错误用于3×2 metadata，校验正确提早拒绝；仅修probe UV，初报告保留。freeze前另发现React snapshot的Object.entries会漏掉builder允许的non-enumerable own尺寸key，已改为Object.getOwnPropertyNames并实际检查该场景；该预先正确性修复不冒充原shader误差。source与完整typecheck最终通过；构建中独立QA spec尚未完成造成unused imports的首次类型诊断也保留。所有这些检查不增加正式case，不替代下一步独立native / 实际完整GUI验收。

`.cache/gui-source-atlas-01/FINAL.json` 为纯装配45项producer检查：完整4×3独立期望含alpha0 / 1 / 2 / 127 / 128 / 254、不透明像素、透明gap与touching tile，逐字节复制一致、输入不改、DOM / fetch trap不触发；metadata校验不读取texture getter。越界 / 重叠 / sparse / 类型 / 16MP / 256tile边界亦覆盖，不计45正式浏览器case。初tuple类型诊断未另存原日志，INITIAL-NOTE如实记录；后续union集成尚在进行时的真实类型日志保留，不把中间未完成集成冒充最终运行失败或原shader误差。

## 保留：standalone原PNG完整GUI的32像素差异

`.cache/full-gui-model-integration-01/FINAL.json` / RESULT.md保留12组合：4幅上一sprite图按不可变原SHA引用，另8幅为当前真实生产React的model-off / model-on，public CSS18 / gallery CSS20各默认与显式book。frame2570×1402 / GUI5、source origin[169,57.5]、displayScale2.5；全帧3,603,140像素与完整ROI[840,282,890,840]共747,600像素均评分，无mask、fit、epsilon、UV改写或native atlas作为生产输入。

| 路径 | Public18 默认 / 显式book | Gallery20 默认 / 显式book | RGBA绝对差总和 |
| --- | --- | --- | --- |
| 上一source sprites | 4,928 / 4,928 | 4,928 / 4,928 | 367,897 |
| 当前提供guiModel但itemModels关闭 | 4,928 / 4,928 | 4,928 / 4,928 | 367,897 |
| 当前itemModels开启，完整原PNG输入 | 32 / 32 | 32 / 32 | 2,017 |

全部model-off完整RGBA hash重现上一阶段；四幅model-on完整hash相同，ROI MAE0.0006744917067950776、max230、alpha差异0，ROI外0差异。**完整GUI仍NOT EXACT**。两个slab各5差异像素、max8 / sum102；table为22像素、max230 / sum1813，包括16像素竖直分量及六个孤立点。空间定位与UV采样 / triangle调查相符，但不证明因果；未加纹理相位特判。

真实root[845,287.5,880,830]、book[910,340,200,200]、canvas[843,286,883,832] / backing883×832及38槽不变。等待原book绘制与三原fallback BlockPreview ready（size32 / resolution80）后测量；model标记29 / 30 / 31仅在ready时隐藏三个fallback视觉wrapper，sprite标记0 / 33 / 34 / 35 / 36 / 37保留六个已加载原DOM图。数量、耐久与book组合未改；实际后端NVIDIA RTX3050 / ANGLE D3D11。

model正常输入通过公共createGuiCuboidModel构造两height8 slab与height12 table，明确yaw45 / pitch30 / scale0.625 / offset[1+10/sqrt(2),8.9375] / physical-floor。该8.9375是非唯一host观察候选，没有提升为native默认。slab面色255 / 127 / 186、table白均显式；四原16×16 PNG与固定官方ZIP同字节，bottom已声明但此视角不采样。font data八实际组合与生产gui-fonts.json深相等，public CSS18 / gallery20仍独立。该次测量的25个run-pinned source跨两批且在其报告冻结时与当时源码相同，270份历史冻结文件未变；后续source-atlas代码变化须另有当前源码证明。辅助完整图不增加正式case，也不认证其他driver / viewport / 动画或完整目标完成。

## 实际source-atlas完整GUI：一个固定观察UI target零差

`.cache/full-gui-model-atlas-integration-01/FINAL.json` / RESULT.md保留16组合：8幅不可变历史引用（sprite4928与standalone-model32各4幅），8幅当前真实React截图（standalone32复现与source-atlas各4幅）。所有实际输出均评分完整2570×1402 target及747,600像素ROI，无mask、fit、epsilon或UV特判。

| 路径 | Public18 默认 / 显式book | Gallery20 默认 / 显式book | RGBA绝对差总和 |
| --- | --- | --- | --- |
| 历史source sprites | 4,928 / 4,928 | 4,928 / 4,928 | 367,897 |
| 历史standalone原PNG模型 | 32 / 32 | 32 / 32 | 2,017 |
| 当前standalone原PNG模型 | 32 / 32 | 32 / 32 | 2,017 |
| 当前source-atlas模型 | 0 / 0 | 0 / 0 | 0 |

四幅当前standalone保留历史完整RGBA hash `f39e8fcf00621f9e72f1de5c18449dda56bbbe9417231d6d69f05e6d168a2606`。四幅source-atlas均与原native完整RGBA hash `60e0ad4ec548949eeb9653dc0ccd37d3cf86086e36c3ddad060041ff1d5ce7c9` 相同；全帧3,603,140像素及ROI747,600像素均RGBA0 / sum0 / max0 / alpha0。**这认证同一个已观察GUI5 post-all-UI R117固定target，不是四个独立游戏场景、final world / Present或整个目标完成。**

完整帧检查使用displayScale2.5，使GUI5 canvas reciprocal `.4`与语义plane缩放在布局中相乘为1，backing按物理像素1:1呈现。标准展示页默认displayScale1仍保持352×332组件尺寸；该缩小预览的功能smoke不等于此原生尺寸完整帧零差，也不据此认证任意displayScale / DPR。

该GUI5完整场景使用1024×512显式atlas的三个完整原图：stone[96,16]、table-top[848,112]、side[832,112]，尺寸皆16×16；visible face UV仅加各tile origin。实际source GuiLayer instrumentation记录每font-profile页面三次16×16 ImageBitmap texSubImage2D上传，GLerrors0、source-layer Canvas2D calls0；同值book分支不冗余上传。没有native captured atlas输入、源图重绘、评分后加padding或shader改变。这里三tile足以覆盖已测GUI5采样；前节GUI4模型draw需完整end_rod邻tile，不能因此泛化任意scale / packing的邻图需求。

显式projection、非唯一offset8.9375、三cuboid与观察RGBA8面色均保持原输入。root / book / canvas bbox、backing883×832及38槽不变；原fallback BlockPreview仍以size32 / resolution80真实挂载 / ready，三个wrapper只在目标ready后隐藏，六原sprite DOM图仍存在 / complete，count / durability / book继续普通生产组合。public CSS18 / gallery20的八实际font data与生产JSON深相等，宿主环境仍不同。

该完整零差依赖宿主显式text profile及用户自有原glyph pages、已观察的采样 / model / packing配置；私有字体仅作本机可选资源，不进入Git / npm。public CSS18指宿主CSS环境，不代表公开Fusion / Noto默认字形已获得原生认证；默认CSS / CPU BlockPreview与未声明原资源的普通消费不继承此零差结果。

26份source pin跨两批及该报告冻结时的当前源码相同，290份历史证据文件字节未变。实际后端NVIDIA RTX3050 / ANGLE D3D11，无page / console / GL错误。该单观察帧不认证所有屏幕、任意字符串 / 字体coverage、其他scale / viewport / driver / 动画、通用camera / lighting / 自动packing或原生最终场景合成。八新图与八引用为辅助测量，不加入正式case；完整项目目标继续按更大范围验收。

## 四完整tile的后续完整GUI5复验

`.cache/full-gui-model-atlas-integration-01/four-tile-phase/{FINAL.json,RESULT.md}` 另存四幅真实React截图，采用与GUI4独立正向同一完整end_rod邻图[864,112]配置；原三tile的16组合FINAL及所有原图不变。显式合计20辅助case：8历史引用、4当前standalone32复现、4三tile零差与4四tile新零差，不计正式用例。

四新图在public CSS18 / gallery20、默认 / 显式book组合中，完整全帧及ROI仍RGBA0，完整hash仍为原native `60e0ad4ec548949eeb9653dc0ccd37d3cf86086e36c3ddad060041ff1d5ce7c9`，与对应三tile图逐字节相同。实际每font-profile页面记录四次完整16×16 ImageBitmap texSubImage2D，坐标[96,16] / [848,112] / [832,112] / [864,112]；GLerror0、source-layer Canvas2Dcalls0，等值book变更不重新上传。

end_rod为159字节原PNG，SHA256 `94f20a6cd82eed61af0597d690f26411f83693ef943f2c0d31d9fa5a5721128e`，与固定官方ZIP同字节。26个library source身份与三tile阶段相同且运行前后不变，309份历史文件保留原字节；bbox / 38槽 / 三fallback wrapper / 六sprite图 / count / durability / book、原glyph data与独立CSS18 / 20环境均保持。该批没有再取GUI4完整原生场景，仍只认证同一已观察GUI5 target及显式有限profile，不恢复CPU自动packing / camera或宣称所有GUI已完成。

## 实际包消费

`npm run verify:package` 构建并把真实tarball分别安装到React18.3.1 / 19.3.1消费者，120组件＋4数据＋10函数共134值、SSR、严格TSX / ref / model / source-atlas / itemModels类型、样式、原资源与许可检查通过。内部validateGuiTextureAtlasLayout / prepared / precision helpers不出公共barrel，私有glyph页、captured targets / atlas / shader不进npm。

实际已测 `.cache/gui-model-consumer-verified.tgz` SHA256为 `124d271bf609f9e622afdfbe80a69361832fb11ebfd319aedd55d5b6075e9e08`，`dist/index.js` SHA256为 `11ad42e6f19d27c8f742ca11eb0066c5bd0cb421d1b370cc084daf774604a78a`；`.cache/gui-model-consumer-identity.json` 证明两消费者各256份dist与本轮构建逐字节相同。最终文档包以 `.cache/gui-model-final-pack-proof.json` 逐条登记与已测包比较：仅README / docs可变化，非文档条目必须同字节，消费认证仅由该身份链关联。

## 实际生产展示页

`.cache/gui-model-production-01/{smoke,identity,FINAL}.json` / RESULT.md记录65辅助检查PASS，不计正式973项；实际HTTP的8个HTML / assets入口与当前site同字节。主 `main-BxaFAddA.js` SHA256为 `e1a539c253fd1f64b04fd47609c3e30d586b26355690f532b7cfa04f91e14339`。

三个开关默认开启，text / sprite / model的8组合均保留同section / book / 三fallback canvases / selection / count / callbacks；只有000使用GuiImageLayer，model-only仍GuiLayer。source model标记29 / 30 / 31，三个fallback BlockPreview真实ready且非空（442 / 442 / 561前景像素），ready时仅wrapper隐藏，关model恢复。source sprite标记0 / 1 / 2、count32 / 8仍可见；clear后保留image槽2 / count8与三hotbar model，restore / close / reopen通过。

GUI4 / GUI5仍352×332 root、707×667 / 883×832 backing，支持zoom时transform均none。真实composited元素截图中book open / closed都有书本色像素且图不同；不以preserveDrawingBuffer=false时已清空的readPixels冒充实际画面，也不据此认证native闭书像素。390px文档保持390与局部pan，150icons解码 / 分类搜索 / 3×预览通过。demo无durability值，不声称有值耐久条由此smoke演练。

page / console / render及非取消网络错误0；raw requestfailed实际12次ERR_ABORTED保留，5个distinct退役字页另HTTP200且site字节相同。未请求.cache / native-atlas-pixel资源。此生产浏览器为SwiftShader、无runtime GPU hook；专用fixture拥有texSubImage与native parity证据。它验证标准尺寸demo组合 / 交互，不把小尺寸预览推广成原生完整帧零差，也不认证native CPU相机 / 自动packer。原贴图来源与许可见 [gui-model-assets.json](gui-model-assets.json)；完整原end_rod图不因项目MIT而重新授权，demo / 私有资源的分发边界保持明确。
