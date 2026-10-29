# 原生耐久条：源声明与五把木剑观察

本记录针对 Bedrock `1.26.6005.0` 的 Classic 库存耐久条。源 JSON、原生截图、Script API 值和当前 Web 重建分别记录；有限样本支持连续 hue 配置，但没有恢复原生完整数值绑定或取整算法，这些观察匹配数不计入自动化测试统计。

## 已核对的源声明

本机 `vanilla/__brarchive/ui.brarchive` SHA256 为 `8d13e053654e3a832c7a99fe6f4ef53af1798ae474731036a127fef17638b1c5`。其中 `ui_common.json` 原始条目 SHA 为 `1de0c736edeeb6c6fbf1baf398a1c92e4d00b91b8fb44c81193e9c6cc5a421ec`。

`common.durability_bar` 声明 `progress_bar_renderer`、默认尺寸 `12×1` game、中心偏移 `[0,5]`，并设置 `drop_shadow`、`is_durability`、`round_value` 为 true。可见性与 current/total 均来自集合绑定。JSON 没有给出颜色曲线、RGB、纹理、damage/remaining 单位、分母或满耐久隐藏公式。

普通 `18×18` 槽位按源锚点换算，前景逻辑左上为 `[3,13.5]` game；GUI2 为 `[6,27,24,2]` CSS px。`26×26` 结果槽对应 `[14,35,24,2]` CSS px。HUD 外层 `20×22` 中有居中的 `18×18` 父容器，不能把其原点直接当成库存槽原点。Pocket 的 `18×1`、偏移 `[0,8]` 和 grabbed 的百分比宽度是不同分支，不由本次 Classic 样本认证。

源审计保留于忽略目录 `.cache/durability-study/source`；`source-summary.json` SHA 为 `d36126f007063dc67df08789fa76d6f8c95999c75616cf5ed1a433c63919e724`。材料审计未找到可识别的耐久颜色或 CPU renderer 语义；这不证明可执行文件中不存在相关代码。

## 五把木剑的原生观察

原图 `.cache/tooltip-native/wood-five-gui5.png` 为 `2568×1400` 原始 PNG，SHA256 `7353df9c55cd71086a48fe33fccd4ded1c15e7e45328f01d986283ab1d8e150a`。采集条件由操作方记录为 Classic、GUI5、100%、AA16，Alt+Print 剪贴板经 Paint 保存，未缩放。坐标是原 PNG 物理坐标，未认证客户端原点。

以下 data 最初只是生成物品时请求的命令参数。后续只读 stable Script API `2.11.0` 探针经 `/scriptevent mcbeui:durability read`，在原生聊天两段输出中确认槽位 4…8 均为 `minecraft:wooden_sword`、amount1，实际 damage 分别为 1/15/30/45/58，maxDurability 均为 59。槽位3钻石剑对照为 damage0、maxDurability1561。

API 原始截图 `.cache/tooltip-native/wood-five-api-read.png` 为同尺寸 `2568×1400` Alt+Print→Paint PNG，SHA256 `1a23d078067e4e3168d9621ecff0f9d320d59f4ac15a2c50dfdf54e6294b5e44`。操作方已查看两段输出；本次文档核对了原文件 SHA 和尺寸。**API max=59 已确认，原生 progress renderer 实际使用的分母仍未读取。**

| 请求 data | 快捷栏索引 | 原图前景核心 RGB | 几何前景宽 / game | 几何宽 / 物理 px | 纯色核心宽 / 物理 px |
| --- | --- | --- | ---: | ---: | ---: |
| 1 | 4 | 9,255,0 | 12 | 60 | 59 |
| 15 | 5 | 130,255,0 | 9 | 45 | 44 |
| 30 | 6 | 255,251,0 | 6 | 30 | 29 |
| 45 | 7 | 255,121,0 | 3 | 15 | 14 |
| 58 | 8 | 未观察到饱和彩芯 | 0 observed | 0 observed | 0 |

四个非空前景均覆盖五行物理像素。边界有混色列，因此纯色核心宽度不能代替几何宽度。五槽的黑色可见包络均为 `65×10` 物理像素，即 `13×2` game；相对最长 `12×1` game 前景，右侧和下方各多 `1` game。零彩芯样本仍有黑包络，但单张图不能排除亚像素或完全被遮挡的前景。

相对槽位的黑包络观测位置为 `[15,68,65,10]` 物理像素。`68/5=13.6` 是截图栅格地标，不是新的逻辑 offset；保留源的 `13.5` game，不能为贴图而改成 `13.6`。完整五个 `110×110` 槽位加 halo ROI、每行每列的原始 RGBA runs 和边界混色保存在独立报告中。

独立记录 `.cache/durability-study/independent/wood-five-native-observations.json` SHA 为 `d22e58d90d2a74293e273b45edd91264ee61f724b15d15078342e6250ef42ef1`；原图和裁图不随 Git 或 npm 分发。

## Web 实现与剩余边界

本轮的黑包络修复：meter/前景仍为 GUI2 的 `24×2` CSS px，使用向右、向下、右下各 `2px` 的黑色扩展得到 `26×4` 包络。它是与本次观察相符的 Web 实现，不说明原生内部也使用这三层 shadow；扩展背景、平移 shadow 加未填充 track 等实现都可能产生相同可见结果。

独立候选审计以 API 确认的 damage/max 提出 `r=(59-damage)/59`，在 Chromium `156.0.8078.4` Canvas2D 和精确有理数 RGB 中核对。候选没有导入生产实现或 CSS。对四个有彩芯样本：

| 候选 | 真实 Chromium Canvas 核心 RGBA 匹配 |
| --- | --- |
| M59，连续 `H=120r`，不预先取整 hue | 4/4 |
| M59，先将 hue 四舍五入成整数 | 1/4 |
| M60，连续 hue | 0/4 |

M59 连续候选的精确有理数 RGB 按最近整数也匹配四组核心。不能把理想 RGB half-up 结果与实际浏览器颜色转换混为一谈；例如整数 hue 的中间通道可能恰落半值，二者结果并不总相同。这里满饱和 HSV 与 `HSL(S=1,L=.5)` 的 RGB 相同，不能从这些样本确定引擎采用哪个颜色空间名称。

因此 Web 默认颜色移除 hue 的整数预取整，采用连续 `H=120*ratio`；这由四个实测核心支持，不能认证其他物品、绑定或全范围算法。调用方仍可用 `color` 覆盖。data58 没有彩芯，计算出的候选颜色只是假设输出，不是第五个已观察颜色。

最近整数的 `12r` game 宽度匹配全部五个观察值，但 M59/M60 都会得到相同五个宽度；宽度不能单独识别分母。M59 的整数 damage 状态不落在精确半游戏像素宽度 tie 上，因此不能宣称 half-up、ties-to-even 或其他 tie 规则已证。源中的 `round_value:true` 也不证明量化阶段、最短长度或具体 JavaScript 算法。

`value/max` 仍是库的显式剩余比例合同，`hideWhenFull` 仍是 Web 行为，原生可见性集合绑定公式没有恢复。独立候选记录在 `.cache/durability-study/independent/wood-five-candidate-audit.json`；这些 4/4、5/5 是有限观察匹配数，不是新增测试总数或完整画面零差统计。

实际 damage/max 已由探针确认；current/total 绑定语义、renderer 分母、边界采样、内部 shadow 和通用算法仍未恢复。不能只凭五个样本将候选称为原生公式。当前证据不认证边界混色、完整原生到 Web RGBA 零差，或其他物品、GUI scale、Pocket/HUD/抓取状态的通用一致性。
