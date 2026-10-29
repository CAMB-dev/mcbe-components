# 原版位图文字：来源与采样研究

2026-10-29，安装版 **1.26.6005.0**。这份记录覆盖已测字形来源、几何、固定重建模型与实际 BitmapText 组件验证；**组件合同通过，原生覆盖率与完整RGBA仍未通过**。结构化记录、完整 SHA256、10字符映射和误差统计见 [native-bitmap-font.json](native-bitmap-font.json)。它是研究 metadata，不是可直接传入组件的 runtime font config。

## 来源与私有准备

完整扫描安装目录的 vanilla、版本更新包及字体相关 loose 文件，只有以下4个字体 archive，均位于 vanilla：

| 容器 | 条目 | 字节 |
| --- | ---: | ---: |
| `__brarchive/font.brarchive` | 235 | 1,254,618 |
| `__brarchive/font/smooth.brarchive` | 355 | 168,885,953 |
| `__brarchive/texts/ja_JP/font.brarchive` | 120 | 645,300 |
| `__brarchive/texts/zh_TW/font.brarchive` | 118 | 2,714,459 |

另有180个字体相关 loose 文件，未发现 vanilla 以外更新包的字体文件或独立 zh_CN 字形覆盖。ja_JP/zh_TW 同名 glyph 页确实不同，不能按页名互换。该范围不包括用户外部资源包或未来版本。

可实现来源是基础 `glyph_00/4F/51/52/5B/65/77/94.png`：每页256²，16×16个16²字格。8页的完整 hash 和原始字节数保存在 JSON，并已与实际准备的本机副本逐页核对。没有修改 PNG，也没有在公开文档或 npm assets 中打包它们。

本机可选准备工具是 [use-local-unicode-sample.py](../scripts/use-local-unicode-sample.py)：

```powershell
python scripts/use-local-unicode-sample.py "C:/XboxGames/Minecraft for Windows/Content"
```

工具已实际将8个原页、`font.json`、`provenance.json` 写入 ignored `.cache/local-fonts/unicode`。它先核对全部页的预期 SHA 和256²尺寸再写入；不是完整 Unicode 字体，不推断未测字符，也不改变全局开源字体。调用方提供原图 URL，私有字图仍留在本机。

## Unicode 与 MSDF 不可混淆

注册文件有 MinecraftTen(TTF)、OldSmoothFont(MSDF)与 Unicode fallback aliases；注册存在不等于 custom hover renderer 实际绑定它。Mojangles没有这7个CJK字符，HBUI NotoSC虽有覆盖，测试轮廓与样本仍不同。

smooth archive 中 `.fontdata`、`remapping.dat` 是0字节占位，实际数据在 loose `vanilla/font/smooth/`。175104字节 remapping 可解析为43776个唯一 LE u16→u16 pair：

| 字 | Unicode → smooth index |
| --- | --- |
| 钻 | `94BB → 36A2` |
| 石 | `77F3 → 2F6C` |
| 剑 | `5251 → 3AD4` |
| 攻 | `653B → 3360` |
| 击 | `51FB → 3277` |
| 伤 | `4F24 → 3420` |
| 害 | `5BB3 → 315B` |

这些页是1024²、64²字格，RGBA alpha不恒为255。直接切 `smooth_94` 的 BB格不是“钻”。正确 remapped 常规 median/alpha contour 也未匹配全部原生拓扑，不能因 MSDF 名称就替换来源；未观测的 uniforms 或 draw binding 仍未知。

## 字形与10字符几何

独立 QA 从原生图提取字形，没有使用重建拟合参数：GUI4 原始16² cell固定2×nearest，在完整32²字格与36² halo 上，对7字×`.25/.5/.75` 三阈值各21组比较，**binary difference全部0**，无 tight normalization或逐字平移搜索。GUI5 tight-normalized设计比较仅用于识别轮廓，不当作原始像素证明；A/B按实测位移后的三阈值轮廓也一致。

Fusion“剑”为3分量/1孔，native/base为6/0；Noto“钻”“害”的稳健拓扑也不同，因此不能称这些回退字体为原版字形。该证据定位了可重建的 Unicode 源设计，未捕获实际 native font alias/material。

GUI2 source配置 `scale:1` 对应原16×16px cell：

| 字符 | quad / offset | advance（GUI2） | 证据边界 |
| --- | --- | ---: | --- |
| 钻、石、剑、攻、击、伤、害 | 16² / (0,0) | 18px | 对应8game quad、9game推进，GUI4/5均有采样 |
| `+` | 16² / (0,0) | 9px | 原字格bearing保留；与下个字符约束4.5game推进 |
| `7` | 16² / (0,0) | 8px | 与space拆分为4game+4game的候选 |
| space | 空16²格 / (0,0) | 8px | 直接约束的是 `7+space` 合计8game，未另用字符串独立拆分 |

每texel为0.5game，行推进10game（GUI2 `lineHeight:20`）。Unicode00的`+7 `完整前缀在GUI4的52×36 ROI（含2physical px halo）于`.5`阈值也取得 binary0，支持同一来源组成“钻石剑”和“+7 攻击伤害”。此配置仅覆盖这10字符，不泛化为全部65k字符、shaping、斜体或组合字。

确认原字格 quad 后，样本的总左/上 content inset约5game可作为无TTF bearing的 BitmapText 配置起点；不能把它等同所有字体的CSS padding。右侧自然宽度、末尾advance和亚像素轮廓仍未恢复。

## 固定源模型的严格 RGBA 残差

下表是**研究重建模型**，不是实际组件测试。使用同一字体与两行完整9字布局，逐字完整cell加2physical px halo；相邻ASCII也参加合成，ROI总和可能重复计数。无逐字AA系数，没有放宽像素断言：

| 固定源profile | ROI像素数 | 严格diff | 最大通道差 | binarydiff（.5） |
| --- | ---: | ---: | ---: | ---: |
| GUI4：point，二值样本下Bitmap/Smooth等价 | 11,664 | 1,459 | 22 | 0 |
| GUI5 A：bilinear + BitmapSmooth + 假定SRC_ALPHA | 17,644 | 1,606 | 24 | 0 |
| GUI5 B：同一规则 | 17,644 | 1,606 | 25 | 0 |

整数texel倍数point、非整数bilinear+Smooth只是两个比例支持的有限候选，未恢复native自动选取规则；组件的 `sampling`、`shader`应显式提供。半texel默认范围也只是源shader候选，不能改写为捕获到的runtime uniform。

这里的binary0只指固定`.5`端点覆盖代理阈值（白字R或蓝字B在背景27/前景255之间归一化），不是截图alpha，也没有认证GUI5模型在所有三个阈值均0。它与前面GUI4原始源设计的三阈值独立检查不同。

## 共同横向采样证据

独立 `.cache/tooltip-native/independent-cjk/ui-vs-glyph-straight-edge-audit.json` 只比较已知端点，不新拟合全局滤镜：

- **39个X转变**，普通面板/槽位、CJK、SGA均出现1列physical混色；RGB端点权重区间在byte舍入范围内相容。
- **168个保留Y转变**（其中160为槽位），无混色行；另有2个被遮挡/端点不可靠的Y探针明确排除。
- 槽位混色随screen X变化，不支持全局固定`.08/.92`。约x1260的槽边与SGA权重兼容约`.93`，约x1332..1404与CJK兼容约`.917`。

这是共同UI投影或重采样因素的证据，不能唯一定位最后postpass、逐draw共享矩阵、FXAA或某个sampler，更不能推定1397客户区高度。RGB权重代理不是实际glyph alpha。

另有仅用27个非文字GUI5槽边训练的一维横向插值诊断，未用GUI4或glyph估系数。它使9字严格diff降到GUI4 **825/11664/max3**、A **910/17644/max13**、B **1031/17644/max13**，仍不为零。JSON只保留统计和报告指纹，不发布滤镜系数作为配置。**诊断phi不得进入生产或默认字体实现。**

## 原ASM公式验证不等于截图验证

字体shader agent直接解析安装版 UI/Text 原始字节，完整核对 Bitmap、BitmapSmooth、TrueType、MSDF × AlphaTest × SM40/SM50：16个fragment组合，**7680组输入、2140组discard一致，最大抽象实数误差2.220446049250313e-16**。

BitmapSmooth对采样RGBA全部通道执行 `q=saturate((sample-.3)*5)`、`q²(3-2q)`，不能仅改变alpha；Bitmap/BitmapSmooth使用独立半texel FS bounds，vertex UV仍为完整cell；TrueType不走该cell clamp。MSDF另有median、outline和alpha-shadow组合，不能简化为通用source-over。

该验证认证的是原ASM解释与独立闭式公式相符。UI/Text→UI/Fill→UI/Base没有序列化明确blend选择；sampler、actual uniforms、调用方quad、GPU float32/FMA、后采样和native draw binding都未被认证。7680公式通过不得表述为7680个原生像素测试。

## 实际组件状态

实际组件合同测试已 **13/13 PASS**，原报告为 `.cache/bitmap-text-final.json`。另有独立的原ASM/布局/Web source-over审计：120runs、15606pixels、62424channels，最大浮点差 `2.0539125955565396e-15`；27个相差1byte的Float64半值舍入边界仍完整记录，**并非 byteIdentical**。这些结果认证声明的组件合同，不认证原生GPU绑定。

ready状态保留的透明可选择DOM文字曾继承父级阴影，真实24×25截图比对有54个不同像素。仅清除ready DOM的 `text-shadow` 后为0；强制恢复inherit的negative control再次产生54个差异，且与修前图片hash相同。绘制engine未改，SHA始终为 `28184d6194ae2e1e386ff4b450fd7a2c8a9a14d51ce698c73a7362cfac7503a8`。修前、修后、control和negative control原图SHA均保存在JSON，不能把这一DOM修复描述为native采样已经修复。

### 原生对照的最终合同与剩余失败

独立原图对照最终 **3/3 source/layout合同 PASS**：完整两行字段含9glyph、space、末尾linebox，并另保留四周2physical px halo，无glyph mask、无配准拟合、无新增RGBA容差或生产phi。GUI4门控`.25/.5/.75`；GUI5 A/B仅门控已确认的`.25/.5` source/layout范围。

以下是**实际组件**对原生PNG的完整字段测量，区别于前面的数学重建模型：

| 样本 / fullField | 严格不同像素 / 总像素 | RGB绝对差和 | RGB MAE | 最大通道差 | `.25/.5/.75`差数 |
| --- | --- | ---: | ---: | ---: | --- |
| GUI4，194×80 | 1314 / 15520 | 45227 | .971370 | 22 | 0 / 0 / 0 |
| GUI5 A，243×100 | 1573 / 24300 | 56241 | .771481 | 24 | 0 / 0 / 5 |
| GUI5 B，243×100 | 1573 / 24300 | 57980 | .795336 | 24 | 0 / 0 / 5 |

真正的 **field+2px halo** 使用更大矩形，没有把fullField数字误标为halo：

| 样本 / withHalo | 严格不同像素 / 总像素 | RGB绝对差和 | RGB MAE | 最大通道差 |
| --- | --- | ---: | ---: | ---: |
| GUI4，198×84 | 1444 / 16632 | 45754 | .916987 | 22 |
| GUI5 A，247×104 | 1573 / 25688 | 56241 | .729796 | 24 |
| GUI5 B，247×104 | 1573 / 25688 | 57980 | .752362 | 24 |

各halo的三阈值差数仍分别为`0/0/0`、`0/0/5`、`0/0/5`，alpha差数全部为0。**三个样本严格RGBA均未通过；GUI5的`.75`原生覆盖仍各有5像素失败。** 原始三阈值全0假设产生的 **1PASS/2FAIL** 报告仍原样保留，SHA为 `5f03b6334fc961fdef9fdc5e2a4ffca94b451403e488895bf52b91d5f3b91cb0`。最终3个合同PASS没有把该失败改称为native coverage或RGBA通过。

最终独立报告是 `.cache/tooltip-native/independent-native-bitmap-final/independent-bitmap-verification.json`，SHA `ce55afbbb1234d63fb57e243686391877bf4007d9b041a36ffdd5e1f937203e0`；原始run、初始失败报告及其指纹均在JSON中。

主配置`pixels`项目随后将13组件合同与3限定原生source/layout合同同批运行，**16/16 PASS**（`.cache/bitmap-native-integration-final.json`），不改变上述native失败。实际tarball的React18.3.1/19.3.1 ESM、SSR、样式/字体/素材/许可和TypeScript consumer检查也通过；production preview中2个BitmapText及2个Tooltip bitmap均ready。包验证与preview日志SHA同样记录在JSON，未把这些检查当作原生RGBA验收或最终发布包hash。

### 已证伪的修复假设

固定同一源UV/quad/metrics测试了ONE混合、既有槽位插值及采样前直接`±phi/scale`：它们未重现剩余native角点，部分组合恶化全域和三阈值误差，未按单点最小误差选出“原生绑定”。原报告分别是 `.cache/font-shader-audit/BLEND_AUDIT.md` 与 `.cache/tooltip-font-research/BLEND_FALSIFICATION.md`，完整hash已持久化。数学反事实也没有冒充实际Canvas截图结果。

当前结论是**组件合同和限定source/layout验证通过，native覆盖/RGBA仍未解决**。未增加生产phi、逐字/逐比例拟合、mask或猜测客户区高度；私有atlas分发边界、运行时字体/材质/sampler/blend链及共同UI后采样机制继续保持未知。


## 后续排查：原投影、精度、GPU与AA对照

以下均保持同一字格、UV/quad/metrics及原生阈值，没有加入生产phi或逐字修正。**native覆盖/RGBA结论仍为NOT EXACT**；静态程序存在、软件GPU结果和AA热切换分别记录，不互相替代运行时绑定证据。

### 原始程序与精度

- 原Bitmap/BitmapSmooth VS使用完整cell UV；半texel只限制fragment采样范围，不收缩vertex UV。原`position.z`转整数用于选UV角点，不是屏幕X/Y取整。A/B的5个差异点共10实例距cell边至少1texel，inset为`0/.25/.5/1`时全部不触发clamp。因此固定映射下，仅将half改quarter不能影响这些点；CPU产生的quad/cache UV仍未知。
- 用官方[Microsoft DXC v1.9.2609](https://github.com/microsoft/DirectXShaderCompiler/releases/tag/v1.9.2609)的`-dumpbin`读取原SM65程序，未重编译。8变体共16个VS/PS、96条signature均为float/componentType3、minimumPrecision0，UV输入/运算/输出/采样为f32；审计body无half/min16或窄化转换。工具exe SHA为`aa7965b3763d9c710baaa5a28cedcc633449962a75d1391d161a85304a41b3e2`，release zip SHA为`ad31b1fc8443175d204f77a611fdb3ef2ec42759bdc2f1167368de24a4a7e7f1`。
- 当前256²atlas的`k/16`边界及默认`±1/512` bounds共64值往返binary16全部不变。它不能证明真实vertex格式、插值硬件精度、cache上传值或活动SM65分支。SM65原Smooth常量为`-.30000001192092896`与`5.000000476837158`，而SM50反汇编仅显示六位十进制`-.300000/5.000000`。前述7680组、最大`2e-16`验证针对规范化ASM的抽象实数解释与闭式公式，不是原常数字面bits或GPU f32/FMA模拟。固定float32(.45)标量重放仍得`.84375`；生产声明`q=saturate((sample-.3)*5)`保持不变，没有据未认证native绑定的细微常数差改profile，也未解释剩余约14RGB差。
- 安装包确有TAAU、SM65 FULL FSR1 EASU/RCAS/BILINEAR等程序。EASU有48个gather/4stores；RCAS有20个load/4stores，对应每输出中心加四邻域；BILINEAR为4sampleLevel/4stores。SM4/5的FSR占位程序不能被误称为整个FSR不存在。82个renderer JSON、74个已提取Classic UI JSON、4个GUI JSON的有界检索未提供Classic tooltip到这些pass的绑定；目录、世界preset及单采样UI/Blit都不是活动rendergraph证明。未据程序名称选择滤镜，亦未排除可执行文件里的未观测路径。

### 固定软件GPU与局部反例

实际后端为ANGLE/SwiftShader软件Vulkan，WebGL2 highp为23精度位，**不是原生硬件RenderDragon**。原RGBA8纹理、固定SRC_ALPHA RGB/独立ONE alpha、不启用MSAA、dither、mipmap或额外gamma转换，不用phi或拟合；8个point/bilinear与Bitmap/Smooth配置均保留，字段与单独halo渲染裁回字段逐字节一致。

| 固定profile | GPU对double数学：不同像素/通道/max | GPU对实际组件：不同像素/通道/max |
| --- | --- | --- |
| scale2 point Bitmap | 0 / 0 / 0 | 0 / 0 / 0 |
| scale2.5 bilinear Smooth | 0 / 0 / 0 | 380 / 776 / 1 |

scale2.5 Smooth对native A/B的完整字段及halo仍分别有1542不同像素，RGB差和56035/57774、max24/25；`.25/.5/.75`仍为`0/0/5`。这组软件GPU统计与前面的实际Canvas组件统计有意分开。五点实际float采样约`.450000793`、Smooth约`.843754411`：白字GPU RGB186/183/186对native199/196/199，蓝字53/92/186对56/99/200。软件GPU没有消除剩余13–14RGB差，不能据此认证硬件或更换生产采样规则。

独立14个同`0010`源2×2、同`fx=.1/fy=.5`控制中，5个`.75`失败而9个不失败。尤其石field`[76,17]`与剑`[111,32]`的actual完整3×3相同，native周围8像素也全部相同，但native中心分别为199/196/199与190/188/190。单独相同4texels/phase或该3×3规则不足以解释这对中心，**不泛化为排除所有较大邻域、位置相关处理或cache机制**。固定整quad Y移`±.5physical px`还会显著恶化GUI5完整字段/halo的低阈值几何；未选择新Y相位。

### 原生AA16→1→16热切换

本机界面测试实际在设置中热切换，最终恢复16并暂停，未重启。两张2568×1400无损PNG由独立QA按同位置直接比较；完整两行9glyph、space、末尾linebox和halo均不使用mask：

| 原图矩形 `[x,y,w,h]` | 像素数 | AA1对AA16严格RGBA差 |
| --- | ---: | ---: |
| 字段 `[1273,1127,243,100]` | 24,300 | 0 |
| 字段+2px `[1271,1125,247,104]` | 25,688 | 0 |
| 不透明内部 `[1264,1112,260,120]` | 31,200 | 0 |
| 完整窗口 `[1248,1102,291,140]` | 40,740 | 255 |

窗口255差包括240个透明阶梯角/外侧和15个混色边列；世界底图发生变化，不能把这些差单归AA，也不能把整窗口写为0。原5点在两状态native值相同，保存的实际组件对每张原图的halo仍为1573/25688不同像素、RGB差和56653、max24，三阈值`0/0/5`。新原图对旧A字段也有311个1LSB差，故未假装与旧A整字段相同。

AA1 SHA为`9bab05dcc92856a120271674872f3d3c844f19a3a3b8a73e760b25f70afde07b`；AA16 SHA为`d6e601e45ef58b56e898aee8635381d83da4b9b99a4133a2e68a17df0691402b`。这些结果只约束本次无重启热切换所保存的区域；实际RT sample count、所有后端设置是否即时应用、其它AA或UI路径仍未认证。

### 后续证据指纹与仍缺的数据

完整方法、静态范围、所有8个GPU配置及区域RGBA hash保留在ignored报告；JSON仅持久化摘要和以下完整SHA，不分发原图、atlas或私有程序：

| ignored JSON报告 | SHA256 |
| --- | --- |
| `.cache/font-shader-audit/projection-audit.json` | `7400fe318799611d2d1441519a1b757d0d23e0f44ba11be081ae43471b40c05c` |
| `.cache/font-shader-audit/dxil/precision-audit.json` | `9255dc6140b34a18ab931ca2067c3719743286fc817492dc1fc9909895e6251a` |
| `.cache/font-shader-audit/postprocess-audit.json` | `c823f788ccadd1b307526a99f7e7eb89012313d153d67fc472ddf068dad1685c` |
| `.cache/bitmap-gpu-diagnostic/summary.json` | `f268c4e7a047d1223469ed9670320316576207881663ce9db20861853d966eb7` |
| `.cache/tooltip-native/independent-pattern-study/matched-controls-summary.json` | `f030c511575f87f7166f57d3e641fe16f8aca6a4baefc988b8ffc95f309303f6` |
| `.cache/tooltip-native/independent-aa-study/aa1-vs-aa16-independent.json` | `f66c1cf3ae0d7b3adb6e1610ee8de48ed6b28eafd7a82efbaa18db49ef605609` |

要进一步区分quad/UV、cache、sampler与后续处理，仍需原生draw的实际vertex/index及格式、cellBase UV、上传GlyphTexture/MIP、uniform/sampler/blend、MVP/viewport/scissor、RT/MSAA/resolve及后续读该RT的pass。当前没有这类capture；本轮无生产更改，未新增拟合、mask或阈值豁免，未把限定source/layout合同提升为native覆盖或RGBA通过。
