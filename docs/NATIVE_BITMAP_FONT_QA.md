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
