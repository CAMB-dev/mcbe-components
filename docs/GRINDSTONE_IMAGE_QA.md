# 砂轮可选原图图层验证

`Grindstone` 新增可选 `imageRender`，共享工作站的源图 / 文字 / 物品sprite / model合成与展示规则。公共组件仍120、数据4、函数10，共134个运行时值；新增的是三个公开profile类型，不增加runtime。修后22项正式合同、旧附魔46项回归、React18 / 19实际包与40项生产辅助检查通过。显式source profile在一个已观察GUI5砂轮UI target达到完整RGBA零差；省略profile的CSS仍有残差，范围分别记录如下。

## 公开接口

| 类型 | 字段与范围 |
| --- | --- |
| `GrindstoneImageRenderProfile` | 必需 `frame:{width,height,guiScale}`；可选GLOBAL game `origin`、`displayScale`、`text`、显式 `itemImages` / `itemModels` 布尔开关 |
| `GrindstoneTextRenderProfile` | 必需 `metrics:{lineHeight,paintOffset}` 与 `labels: GrindstoneTextRenderStyle`；不要求附魔cost / rune字段 |
| `GrindstoneTextRenderStyle` | 必需调用方 `GuiTextFont`、fontScale、sampling（point / bilinear）、shader（bitmap / bitmap-smooth）；可选RGBA8 color、归一化tint / hudOpacity |

width / height为实际物理target，独立于CSS尺寸 / DPR；origin省略时，把176×166 game根居中于ceil(frame / guiScale)的stage。displayScale默认1，表示原GUI2语义plane的展示倍率，不自动选择原生字体或GUI scale。output crop保持whole-frame投影与像素相位，既有布局zoom与不支持时的transform fallback保持同一合同。

下面的profile由宿主明确准备；示例不指定“原生默认”font / sampler / baseline：

```tsx
import { Grindstone } from 'mcbeui';
import type { GrindstoneImageRenderProfile, InventoryItem } from 'mcbeui';

export function SourceRepair({ profile, inputs, result }: {
  profile: GrindstoneImageRenderProfile;
  inputs: readonly [InventoryItem | null, InventoryItem | null];
  result: InventoryItem | null;
}) {
  return <Grindstone title="修复与祛魔" inventoryLabel="物品栏"
    imageRender={profile} inputs={inputs} result={result}
    onTakeResult={action => console.log(action)} />;
}
```

## 39槽与原始源布局

槽位顺序为两个输入、一个结果、27背包、9hotbar，共39：输入0 / 1，结果2，背包3…29，hotbar30…38。源cell分别[43,28,18,18]、[43,49,18,18]、[115,38.5,18,18]；每个普通物品的16×16 game区域在cell+[1,1]。背包 / hotbar源锚点仍由原ui_common / grindstone_screen求值，不从DOM bbox拟合。

arrow为[77,40,22,15]，invalid crossout为[80.5,40,15,15]、画在arrow上方；两者使用完整原图。title / inventory标签源锚点[8,8] / [7,76]再加调用方显式paintOffset，不从字墨边界猜测。

普通close为21×21 hitbox内居中的15×15图。首实现与首独立期望漏掉父hitbox布局，误用[158,3]；完整native比较暴露300像素差异。原ui_common close控件自身top_right[-2,2]偏移与21→15居中得[156,5]，与原生G45一致。现source rect与CSS hitbox分别按[156,5] / [153,2]校准，独立queue / 实际DOM与native完整target重跑通过。初绿11项不能替代原先缺失的父布局验算。

## DOM、操作与原子回退

保留同一个WorkstationFrame / ItemSlot / ResultSlot / PlayerInventory、canonical原文、ref、操作回调和方向键路径。count / durability / tooltip仍由原DOM组件承担。itemImages只替换明确普通item.image；custom React icon不被解析。itemModels只读取明确guiModel数据，model优先于sprite，原自定义视觉仍挂载作为fallback。空数量 / nonfinite数量按共享ItemSlot策略排除；ResultSlot的空 / invalid取出guard保留。

只有完整目标ready才隐藏被替换的skin / 标签 / 物品视觉；loading、资源失败、GL loss、bad optional font / model恢复整层CSS，不接受image-only部分成功。有效frame / displayScale遇可选内容错误时保留该尺寸reservation；真正invalid frame / scale回到普通CSS。私有ready marker及时清理，不通过卸载宿主节点“恢复”。其他engine、不支持zoom的分支及任意native交互状态仍需对应验证。

## 私有共享实现与原图身份

`src/workstation-source-layer.tsx` 为私有共用frame / origin、源image / text / slot / item命令、whole-frame bounds / crop / reservation、zoom变量与DOM状态 / ready-marker工具；不导出新的公共renderer，也不测DOM几何。Enchanting只替换原纯准备段并把旧presentation Context别名指向同对象，原option / state hook与CSS按既有路径保留。

`.cache/shared-workstation-source-01/FINAL.json` 对4frame×6mode×4displayScale×2controlState共192个old / new准备对象严格deep-equal，19份source-hook SSR字符串 / presentation一致、warnings / IO0，6invalid错误相同；两sparse非法tuple现更早拒绝，不当作有效坐标改变。初TSX测试loader失败为零生产比较，原诊断保留；这些CPU / SSR检查不等于浏览器或native验收。

私有registry扩至23张完整公开原PNG / 24keys，增加normal close的default / hover / pressed、砂轮arrow与crossout。旧18张PNG字符串与原metadata逐字节不变；generator / check通过，23份公开图与安装版vanilla base原件一致，但不证明运行时active pack覆盖顺序。记录见 [workstation-image-assets.json](workstation-image-assets.json)。这些图片保留原许可，不把它们重新授权为项目MIT。

## 独立私有八页字体准备

```sh
python scripts/use-local-grindstone-fonts.py "C:/XboxGames/Minecraft for Windows/Content"
python scripts/use-local-grindstone-fonts.py "C:/XboxGames/Minecraft for Windows/Content" --check-only
```

命令只读已固定指纹的font.brarchive并写独立ignored `.cache/local-fonts/grindstone`；不改旧附魔六字符 / cost / rune字体cache，不注册全局font，不自动选择sampler / shader。其 `gui-font.json` 是直接 `GuiTextFont` 对象，不是labels wrapper；页URL相对 `originalpages/`，宿主需正确解析后传给text.labels.font。

八字符为“修复与祛魔物品栏”，对应完整256²原页4E / 4F / 54 / 59 / 68 / 72 / 79 / 9B。示例明确传这两个中文标签；若使用默认英文或其他文字，宿主需提供相应glyph，库不改写字符串或静默补字。cellHeight16、候选advance18 / offset0 / lineHeight20；建议fontScale.5仅记为候选来源，非砂轮native metric / trailing advance / wrap / BitmapSmooth选择的恢复。现有开源 / CSS默认字体不因准备原页而被替换。

`.cache/grindstone-font-preparation-01/FINAL.json` / REPORT.md核对固定完整archive、八PNG SHA / CRC / cells与元metadata；独立Pillow对八页524,288个alpha像素与标准库解码相同。重复生成同字节、check-only不写、改坏archive先拒绝，旧37个font文件不变。初负控改了chunk-length却期待CRC错误，仅修正测试改payload，原失败保留。私有原页 / metadata不进Git或npm；本机site可能带可选原页，不能由此当作公开字体分发物。

## 正式合同与保留的首轮漏检

`.cache/grindstone-image-independent-qa/{initial-report,final-report,FINAL}.json` / RESULT.md首批11 / 11 PASS，18.771591秒，0skip / retry / flaky。只有一次正式run，final为同run逐字节canonical副本，不另计11；62个递归source / CSS / fixture / spec / config文件前后不变。

两完整GUI4 / GUI5 canvas共1,206,225像素与独立原UI command queue同RGBA字节；actual / expected共同使用public renderGuiLayer，后端SwiftShader。它认证adapter源origin / order / material / binding，不是另一独立shader或native整砂轮证明；首期queue也漏了close父布局，native残差揭示其覆盖缺口，首期与修后报告分别保留。

其余合同覆盖39槽、index映射、labels / count / durability、model优先、result guard、ref / focus / selection / stateful fallback、一个坏font / model / atlas tile造成整层fallback、880×830有效reservation、真实GL loss / 恢复、320 / 1280与GUI4 / 5、D1 / 2 / 2.5局部pan及close / reopen。准备fixture的undefined→null tuple类型修正保留typecheck日志，未改变生产或像素阈值。

修后 `.cache/grindstone-image-independent-qa/close-scope-fix-01` 正式完整22 / 22 PASS，56.60776秒，0skip / retry / flaky / framework errors：新砂轮同11项与完整旧workstation-fidelity11项，不增加为22新用例。独立从ZIP own[-2,2]父布局推导close，并检查真实DOM hitbox[153,2,21,21] / icon[156,5,15,15]；旧附魔compact在GUI2 / GUI5仍保留完整原图比较。191个source / demo / config及两spec运行前后身份相同，原首11文件不覆盖；同renderer合同与下述native对照分开计证。

## 原生完整target与CSS残差

native完整首轮公开CSS18差33,716像素、gallery20差37,085；可选source profile差300像素 / 900bytes、max129、alpha差异0，全部在close。仅修正上述source父布局及普通CSS close定位，未改target、shader、epsilon或拟合host几何。首轮与中间报告留在各自runs目录，未被最终结果覆盖。

最终 `.cache/grindstone-full-gui-01/FINAL.json` 对应 `runs/2026-10-29T11-58-59-554Z/report.json`，实测NVIDIA RTX3050 / ANGLE D3D11、DPR1。完整2570×1402共3,603,140像素及含halo的ROI[840,282,890,840]共747,600像素均逐RGBA字节比较，无mask / tolerance / fit：

| 最终模式 | 差异RGBA像素 | 差异bytes | 差异alpha像素 | 最大通道差 |
| --- | ---: | ---: | ---: | ---: |
| CSS public18 | 33,476 | 96,800 | 1,760 | 255 |
| CSS gallery20 | 36,845 | 106,907 | 1,760 | 255 |
| 显式source profile | 0 | 0 | 0 | 0 |

source完整RGBA SHA256为 `27c903bbd4f3a52f5d7cf0cda163a44965bf0b0f7459d3f8e90ae54565403931`，与原native UI RT112相同。报告 `sourceProfileNativeParityPass:true`，而要求三个模式全0的 `nativeParityPass:false` 保留其原意。CSS两模式较首轮各少240差异像素，仍未认证默认CSS或默认字体零差。

原native target的独立浏览器拷贝全RGBA0另证presentation / oracle转换一致。目标来自实际UI RT读回，alpha有102 / 255；此前BMP BGRX第四字节不能作为原RT alpha证明。原capture / BMP来源及结果guard见 [WORKSTATION_QA.md](WORKSTATION_QA.md)。

静态索引元数据勘误：旧indexer误读此前GUI4的CSV，因此旧 `csvQueueEventIndex` 标签及“CSV Queue ID不等于API event index”的结论撤回。正确砂轮CSV的Global36 / 66 / 4892分别为Queue ID80 / 292 / 22223，与当前API XML一致。真实31个UI draw的API索引、两次RT112读回、原RGBA与上述零差验收不变；旧冻结报告不回写。新增 `.cache/grindstone-native-index-erratum-01/ERRATUM.md` SHA256 `d059e5cb1212972279a332b462aa39b2c85340635c0112e26701f6e89f7b0ca1`，逐条原始行与32个独立API映射见同目录 `ERRATUM.json`（SHA256 `dcef94ef0a3e230762e9f013afa4fa6abebdd45c7b46b186b029a684788b6c46`）。

生产imageRender只负责panel window。完整RT比较的host另外提供原生测得的透明黑dim背景 `.4`；它是明确宿主合成输入，不是adapter自动恢复的world / Present，也不能移用为默认CSS / 默认字体零差。五durability仍为DOM组件，在有限五ratio匹配时也不能声称恢复或等同新的PSO826 material。

该有限scene依赖宿主八页原Unicode glyph、明确GUI5 BitmapSmooth / bilinear / fontScale.5 / metrics、四完整原PNG atlas tiles和非唯一的显式cuboid投影候选。覆盖39槽、八CJK字、六sword sprites、三block models、五durability bars及arrow / cross / close。它不认证其他配方、语言、GUI scale、viewport、driver、动画或整个库。

## 旧附魔回归与后端条件

`.cache/shared-workstation-enchanting-regression-01/standard-profile` 按原受测profile单批46 / 46 PASS、73.376447秒，0skip / retry / flaky / errors，actual SwiftShader / Vulkan，39个source / fixture / spec / config前后相同。早期强制NVIDIA的45 PASS / 1 FAIL与历史profile审计保留：同一disabled sprite旧断言观察蓝166，NVIDIA为165，shader与历史身份相同；未改生产、测试、RGBA值或容差，不称46项NVIDIA全绿。

另 `.cache/enchanting-full-gui-regression-01/FINAL.json` 使用原五个未改fixture，四原variants在NVIDIA各完整3,603,140像素及747,600 ROI RGBA0，共14,412,560完整像素检查；均与旧native SHA `60e0ad4ec548949eeb9653dc0ccd37d3cf86086e36c3ddad060041ff1d5ce7c9` 相同。这是同一个已观察GUI5场景的四辅助variants，不新增正式case或native scene。跨砂轮 / 附魔两阶段64个source pins与13份旧证据身份保持。

## 实际包消费与生产浏览器

首次 `npm run verify:package` 实际exit0：React18.3.1 / 19.3.1均确认120组件＋4数据＋10函数＝134值，default / source / text / items / model / fallback SSR0IO、39槽、23完整原PNG / 24keys、strict TS三新类型 / refs及styles / fonts / assets / licenses。已测 `.cache/grindstone-package-01/consumer-verified.tgz` SHA256 `6904a104cd0ebcb133afafd4a78d9ee84e946bd8d06857a04b0890b5e3ccac62`，dist/index.js SHA256 `4bf7e4383ac954f80f5f8b105d2ed817164a055553cb9b184d120132318f7c59`；consumer-identity.json逐条确认tar / build / 两个实际消费者各256份dist同字节。

`.cache/grindstone-production-01/{FINAL.json,smoke.json,identity.json,RESULT.md}` 首轮40项生产辅助检查通过、无重试，不计新增正式用例。覆盖39槽、source labels / 六sprites / 三models / 五实际耐久条、输入 / 背包 / focus / result guard、GUI4字形回退与GUI5恢复、全paint关闭后DOM回退 / 恢复、三recipe状态、实际take→empty、close / reopen及desktop / 390px局部pan。实际SwiftShader仅认证生产组合与交互。

8个HTTP HTML / assets与site逐字节相同，main-EwAYoO_F.js SHA256 `5a0c653f3a521dc880119a50d8275dc93fc8b9cb279511933dfcc013472a9a60`。page / console / render / 非取消网络错误0；raw requestfailed16项全部ERR_ABORTED，六个distinct取消字页另HTTP200并与site同字节，未把raw失败记为0。生产FINAL SHA256 `f871742df1a43f7bb93ffd5b5d594b3b3354491d5dc32a3a480c7ecf6d3ec030`。

最终补文档包需逐条登记与上述已测tarball的身份比较：仅README / docs可变，所有非文档payload必须同字节，实际消费认证由该身份链关联。包消费、生产交互和有限native target分别证明各自范围，不代表全部GUI目标完成。
