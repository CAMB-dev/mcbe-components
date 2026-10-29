# 铁砧可选原图图层：接口与分阶段验证

`Anvil` 新增可选 `imageRender`；组件仍120、数据4、函数10，共134个runtime值。新增三个公开类型，不增加运行时值。四个已观察GUI5状态的显式source profile完整native UI target逐RGBA零差，修后React18 /19包通过。Anvil35与按既定整文件GPU profile选择的旧回归103共138独立用例通过；生产首轮73辅助检查亦通过，不把分profile批次称单backend整套全绿。

## 公开profile与四个文字角色

| 类型 | 合同 |
| --- | --- |
| `AnvilImageRenderProfile` | 必需物理target `frame:{width,height,guiScale}`；可选GLOBAL game `origin`、`displayScale`（默认1）、`itemImages`、`itemModels`、`text` |
| `AnvilTextRenderProfile` | `title` / `inventory` / `name` / `cost` 四角色分别可选，不自动借用其他工作站的字体或metrics |
| `AnvilTextRenderStyle` | 明确 `font`、`fontScale`、`sampling`、`shader`；可选RGBA8 `color`、归一化 `tint` / `hudOpacity`、`shadow` / `scissor` |

title / inventory各在style上必需 `metrics:{lineHeight,paintOffset}`。cost也必需metrics，并明确success `color`、`failureColor`、`shadow:{offset,tint}`；失败状态颜色覆盖success color。shadow.offset为game单位，不随字体页尺寸自动缩放。费用文字、可负担性与领取guard仍由现有Anvil状态合同决定，不计算游戏修复经验。

name必需 `paintOffset` 与 `clipQuantization:'floor-min-ceil-max'|'logical-stage-floor'`，不接受继承的shadow / scissor；源label固定高10game。只有原input未focus且未composition时才绘可选原glyph，focus / IME交还原input视觉。原input、value / onNameChange、maxLength30、disabled / readOnly、ref、选择与caret保留；不等于恢复原生编辑器的caret / selection / scroll算法。四角色只替换视觉，canonical字符串保留可访问语义。

```tsx
import { Anvil } from 'mcbeui';
import type { AnvilImageRenderProfile } from 'mcbeui';

const profile: AnvilImageRenderProfile = {
  frame: { width: 2570, height: 1402, guiScale: 5 },
  itemImages: true, itemModels: true,
  // text: 宿主明确准备的四角色样式与字体。
};
<Anvil name={name} onNameChange={setName} imageRender={profile}
  inputs={inputs} result={result} cost={cost} />;
```

origin省略时按ceil(frame / guiScale)的stage居中176×166根，不从DOM bbox、截图墨边或捕获vertices产生普通runtime布局。全部请求资源ready后才隐藏被替换视觉，失败保留CSS / DOM fallback；name编辑切换保留同一input。下述正式合同与生产辅助检查分别验证这些浏览器路径。

## 几何、contain与历史误设

39槽顺序为input / material / result 0…2、inventory3…29、hotbar30…38。source三槽local `[20.77,47.02,18,18]` / `[74.554,47.02,18,18]` / `[128.338,47.02,18,18]`。旧稿把内部container_item中心锚点套到外层grid wrapper；旧10/10测试共享错误期望。QA /Long /Empty三捕获均排除旧wrapper居中，旧值与来源见 [ANVIL_QA.md](ANVIL_QA.md) / [anvil-geometry.json](anvil-geometry.json)。

逻辑box与paint分开：22×15箭头contain于18×12 box，paint17.6×12、水平inset.2；原15² cross在同box内contain为12²、水平inset3。旧18×12直接stretch和canonical原PNG采样自对照不证明native比例；仅更正已观察Anvil，不推广Smithing。普通close自身hit[153,2,21,21]，居中paint[156,5,15,15]。

图像显式使用 `physicalPrecision:'float32'`，物理乘法先f32，再floor origin / ceil extent，之后half-pack；无UV拟合或捕获位置输入。通用API省略此字段保持旧路径，见 [GUI_IMAGE_QA.md](GUI_IMAGE_QA.md)。name逻辑clipper `[42.4,22.73,123.6,15.32]` 与label高10分开。`logical-stage-floor` 用f32(frame / ceilStage)逐轴比例与f32 global edge乘法，对四边floor；QA /Long实测scissor LTRB `[1057,400,1675,476]`。此显式host候选不证明所有viewport或完整原生clip engine已恢复。

## 原图、私有字体与本机预览

共用registry现28完整原PNG /29keys，新增Anvil icon、plus、黑色Gray、edit_box_indent及hover；旧23份asset记录 /三UI来源身份保留。素材一致不证明active pack或GUI一致，见 [workstation-image-assets.json](workstation-image-assets.json)。费用背景用原2²黑Gray，以未paint的逻辑label box为parent居中扩至105%×105%、alpha.3，不以字墨 /shadow边界定parent。

```sh
python scripts/use-local-anvil-fonts.py "C:/XboxGames/Minecraft for Windows/Content"
python scripts/use-local-anvil-fonts.py "C:/XboxGames/Minecraft for Windows/Content" --check-only
```

脚本只写独立ignored `.cache/local-fonts/anvil`，原字体 /metadata不进Git或npm。`labels.json` / `unicode.json` / `ascii.json` / `costs.json` 分别是GuiTextFont，`gui-fonts.json`包含四字典；页URL相对originalpages，宿主需解析。保留16张完整Unicode页及128² default8原页，不裁剪或重采样字图。`mixed-candidate.json`明确不受当前API支持，不把提议pageMetrics当作已实现混合字体功能。

QA /Long cost整句“魔咒花费：1”包括digit1均用Unicode；QA /长ASCII name用default8 POINT，中文“钻石剑”另实测UnicodeSmooth /LINEAR、8game glyph、pens0 /9 /18。demo按整串选择一个明确font，不等于任意混合串的native fallback。terminal advances、其他字符 /换行 /太贵及失败费用仍有候选边界，脚本不注册全局字体或自动选择sampler /baseline。

本机 `#anvil-layer` 为Source Anvil入口，含GUI4 /5、五recipe状态、原字 /sprite /model开关及长名称。GUI5且本机字库可用才绘原字，GUI4保留CSS文字；下述生产辅助检查实际验证其组合与交互。

## 实际native属性与CPU对照的边界

三原捕获 /RT读回见 `.cache/anvil-native-source-01/FINAL.json` /REPORT.md。另invalid cross /中文name见 `.cache/anvil-native-invalid-source-01/cross-name-metrics.json` SHA256 `a69dd58cb5366bee1ef53d14e4617c786c5e4a0bc8e9bd823c8d85675a35fc1d`：实际Global49 fullUV原15² cross的packed bounds为 `[277.75,106.8125,289.75,118.8125]`。这些实际draw /资源 /scissor证据不是生产像素0分数。

`.cache/anvil-full-gui-01/cpu-geometry-audit.json` SHA256 `0f9e735cd769a1472f89267147d12b10c3861e8ff15cecd281ee74da2d252360` 按正常source公式核对全部image groups、39槽、name背景与contain箭头的XY /UV16 /indices及使用到的七个XY MVP条目。首name背景、arrow stretch及仅contain仍不匹配的报告保留在cpu-geometry-audit-initial.json；仅contain不足，还需明确f32物理乘法路径。

同目录cpu-text-audit.json SHA256 `6b18146f3a3d4174ce96df8dba79880dd7fcb4639686418c86b19f44c2c4c308` 对QA /Long各角色XY /UV /RGBA /indices /使用到的MVP /tint /sampler /clip相同。finite font advance /offset候选能解释观察，不证明唯一native CPU布局算法。二者均为CPU属性比较，尚非实际FBO /React完整native像素验收。

## 分数槽位耐久候选与实际完整target

首轮QA /Long /Empty source画面全RGBA0，invalid仍差40像素，原失败报告保留在 `.cache/anvil-full-gui-01/runs/invalid-2026-10-29T13-15-21-594Z/report.json`，bbox `[1232,590,1297,599]`。该差异来自分数material槽的耐久条，不能以其他三状态通过掩盖。

新增私有sourceDurability候选只在有效Anvil source profile且完整canvas ready时，临时对齐原DOM meter；ItemSlot /DurabilityBar /默认CSS /颜色 /ARIA节点不变。背景候选为slot+[3,13.5]、13×2，inner12×1，填充宽度来自全局端点 `clamp(floor(f32(left+f32(13*ratio)))-floor(left),0,13)`，经正常f32物理乘法、half与raster量化。原meter ratio来自其真实ARIA值，不测DOM几何；pending /error /卸载回退拥有的inline几何，保留外部新样式。

四状态20条bar共60个native primitives的XY /indices /raster与最终RGB8相符，来源 `.cache/anvil-durability-source-study-01` / `.cache/workstation-durability-source-01`。float CBV仍有8 /80分量差异，多个算术顺序同样解释样本，不称唯一engine算法。damage58的1/59前景是实测零宽，ratio0 /1仅synthetic边界；默认满耐久隐藏不变。

耐久修复后四case各完整2570×1402（3,603,140像素）及完整ROI[840,282,890,840]（747,600像素）均RGBA0，合计14,412,560完整像素。独立raw native presentation复制也RGBA0。最新四run分别位于 `.cache/anvil-full-gui-01/runs/{qa-2026-10-29T13-37-32-402Z,long-2026-10-29T13-37-51-172Z,empty-2026-10-29T13-38-09-339Z,invalid-2026-10-29T13-37-19-833Z}`；原失败与原targets未改。CSS baseline仍非零，且与首轮actual SHA一致：

| 已观察状态 | CSS18差异像素 | gallery20差异像素 | source profile差异像素 |
| --- | ---: | ---: | ---: |
| QA | 56,559 | 61,751 | 0 |
| Long | 67,753 | 72,166 | 0 |
| Empty | 39,645 | 43,217 | 0 |
| Invalid | 43,960 | 48,357 | 0 |

最终canonical `.cache/anvil-full-gui-01/FINAL.json` SHA256 `ab23d289f5a0c707381e1edff46cd2b3748d3c1829660751c3e4d7375039092e`，RESULT.md SHA256 `d1e06c4999af200635ec42e1925b5e052b2536507b4d841a148d5264830e50f2`，明确 `sourceProfileNativePixelParityPass:true`。94个source /30个resource pins每run与四case间均无变化；initial到final仅shared helper与Anvil hookup两文件改变，caller数据及原native targets不变。native full-frame比较为辅助integration，不增加正式用例。

原始 /followup /instrumented repro总25条ERR_ABORTED完整保留，13唯一URL另fresh HTTP200且完整原PNG bytes /RGBA一致；非取消网络错误0，`allRequestsSucceeded:false`。QA /Long raw `runtimeClean` / `sourceProfileNativeParityPass` 仍false，不回填成全绿；最终独立pixel字段只表达完整像素相同。另实测带记录的input-fill /blur probe有generation1 /2取消时序与正常DOM事件，最终source仍RGBA0；最初未记录的generation保持unknown，不能倒推。所有raw全样式 `nativeParityPass:false` 也因CSS非零保留。

平台为NVIDIA /ANGLE D3D11的有限GUI5 profile；adapter仅绘panel，完整RT宿主另供测得dim .4背景、原字页、原PNG /显式atlas与投影。它不证明world /Present、默认CSS /字体、所有driver /scale /语言 /编辑 /失败费用状态或完整库目标。原scope与CPU非唯一候选边界继续保留。

## 正式Anvil合同与保留的测试修正

`.cache/anvil-image-independent-qa/final-02` 实际35 /35 PASS、82.87116秒，0skip /retry /flaky，817个source /demo /test /font pins前后相同。包括13新Anvil source合同、10旧Anvil fidelity、desktop6 /mobile6；actual SwiftShader /Vulkan。完整GUI4 /5共1,206,225像素与独立原UI queue的RGBA SHA相同，actual /expected共用public renderer，认证adapter合同而非独立native shader。长名两clip策略分别产生8,335 /8,120个截断差异像素，独立clipper外变化0；分数耐久meter的ready /pending /error /off与最新React inline恢复亦通过。

FINAL.json SHA256 `ec49c0abe1097a3804a614c3ed5c74db2bedd3598a0a43c974a72d9b5d05e075`，report.json SHA256 `bc069d5247487697755ef135268065a80ad79cc2b1ffb1c849f5318209ba5ced`。首final-01实际33 PASS /2 FAIL与原trace /截图 /spec保留：旧arrow canonical以IMG object-fit对CSS background的分数contain路径差6px；长名逐pixel重复断言造成CPU超时。仅把参考绘制统一为独立CSS primitive、将同一全像素clip计数聚合后strict zero断言，未改source /原PNG /RGBA阈值 /clip范围 /skip，不把修后35与首33重复累计。

## 旧回归的受测profile与调度纠正

全standard SwiftShader首批8文件103用例实际102 PASS /1 FAIL、143.295891秒，817pins不变，原报告在 `.cache/anvil-image-independent-qa/regression-01`。GuiImage实际18（先前14只是漏参数化的静态声明计数），GuiLayer17，Grindstone11，workstation11，Enchanting46。唯一GUI5 labels native FBO差273像素 /819 RGBbytes、max4 /alpha0；六native draws的完整已用VB384 /CBV768 bytes仍相同。原报告及像素证据保留，不称103全绿。

既定whole-file规则为GuiLayer与GuiSprite文件使用NVIDIA /D3D11，其余使用原standard profile；本轮曾误把GuiLayer调为software。整GuiLayer17随后在NVIDIA RTX3050 /ANGLE D3D11实际17 /17 PASS、27.036789秒、0skip /retry /flaky；硬校验后端。selected旧回归为其他七整文件86 standard＋整GuiLayer17 NVIDIA＝103通过；整GuiLayer software17全部排除，未挑其16个PASS。与Anvil35合计138独立project /file /case；非一次138项单backend运行，software102 /1继续作为非gating跨后端观察保留。

最终 `.cache/anvil-image-independent-qa/FINAL.json` SHA256 `b9f49b5f648789f4011747e4a2ebe8ddd60c0c40f84f91321845b589f0621ddd`、RESULT.md SHA256 `6c4ee92c830f4ae30e8840f591dfc15c999783291dd12ed23766b9da7317083e` 登记selection rule与逐case来源。所有final run内及run间817pins相同，0skip /retry /flaky。当前gui-layer.spec.ts SHA256 `1e47b18482098e6870ef61169145b5c82227544784155abb5fbcd5f4a53ae465` 等于HEAD blob，最后修改commit42f25e9早于旧NVIDIA报告与既定规则；旧报告未自带该spec hash，不补造历史身份。恢复既有整文件profile未修改源 /测试期望 /RGBA阈值。

## 两次实际包消费与最终文档身份链

第一包 `.cache/anvil-package-01/consumer-verified.tgz` SHA256 `6ef175907c10abd16a89e29b04395df28ecb6eae33ec478c975855146483bfa1` 当时实际验证成功；其后耐久修复改变source，故重新验证，首成功不套为最终source认证。第二次 `npm run verify:package` 实际exit0、40.37秒，React18.3.1 /19.3.1各134runtime、真input /39槽、default /source /四文字角色 /items /models /disabled /fallback SSR无IO、三Anvil类型 /float32严格TS与28PNG /29keys /styles /licenses均通过。

最终已测包 `.cache/anvil-package-durability-01/consumer-verified.tgz` SHA256 `c2736133eada9336dd6c2cda889efa9d3c3bb81b5e9817dd6804a54f46349bee`；dist/index.js 564,648bytes，SHA256 `721edbfb20e89ddde0e725b7177352e77fb7e9747eba8f473bf8e4a260796c15`。同目录consumer-identity.json确认tar /build /两个实际安装consumer各256dist同字节；actual-consumers.json保留真实入口与导出，源pins运行前后相同。两次包是各自source的成功历史，后一次覆盖当前耐久修复，不累计为新增正式case。

最终补文档包须另逐条登记与上述已测tarball的差异：仅README /docs允许改变，所有非文档payload必须同字节；消费认证通过该身份链关联，不能借已测SHA覆盖改变后的runtime。

## 实际生产辅助检查与剩余范围

`.cache/anvil-production-01/{smoke.json,identity.json,FINAL.json,RESULT.md}` 首轮实际exit0、无重试，73辅助checks通过，不加formal138 unique。覆盖39槽 /四文字角色、真实受控input编辑 /选择 /focus /blur、synthetic composition回退、30字符长名、GUI4 /5、五recipe guard /实际take→empty、三paint开关全关DOM /恢复、close /reopen及1440 /390px局部pan。synthetic DOM composition不认证Windows真实OS IME；active editor的浏览器交互不等于native caret /选区 /IME像素复刻。

此demo数据与四native场景分别记录：empty有6sprites、其他recipe有7，models各3，invalid有6耐久meter、其他5，逐项对真实DOM资源数核对。其5recipe行为不是新增native失败费用场景认证。

8个实际HTTP入口与site同字节，main-BxVOgva8.js 168,625bytes，SHA256 `f1da0af363d9283e21e1bfd8437283fcf75a4e5bd2ae53c29f9a8c28a85ebd88`；全部256dist /47site与第二包pins相同。27个实际HTTP font URL及3个distinct取消URL另GET200 /site bytes相同；raw3 ERR_ABORTED保留，page /console /render /非取消网络错误0，不称raw请求失败0。FINAL SHA256 `bbb4af794a4c0ac2ca6e6aff32b10e2f64db5e766d07526c1ed762ac48b45e46`，RESULT.md SHA256 `a9477af229536b7f28f9855c9251cedc0a10a9c6e308175dc33b568abcff1204`。

生产实际SwiftShader /Vulkan，只认证组合与交互；全部后台headless，没有CUA /桌面 /可见用户tab操作。有限native NVIDIA结果、same-public-renderer正式合同及software生产各自保留范围：默认CSS /字体仍非零，任意ratio /viewport /语言 /混字 /crossGPU /active-editor native pixels /world /Present未证，库Goal继续active，未以此完成广义像素目标。
