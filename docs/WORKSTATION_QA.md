# 独立工作站 GUI 验证

2026-10-29。目标是 Bedrock Classic 桌面 profile、安装版本 `1.26.6005.0`、GUI 2、浏览器 DPR=1 的附魔台和砂轮。**当前不能判定整个 GUI 为 pixel perfect。** 已验证逻辑布局、部分原图像素及资源来源；原生游戏整块画面的最终栅格对照仍缺失。

## 来源与方法

- 可公开复验的 UI 定义：[Mojang v1.26.60.5 full archive](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)，SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。使用 `resource_pack/ui/ui_common.json`、`grindstone_screen.json`、`enchanting_screen.json`、`_global_variables.json`，并与本机归档中的完整 parsed JSON 对象比较。
- 字体度量另外从用户自有原始 `Mojangles.ttf` 的 cmap / hmtx 得到；没有读取生产 CSS 得出期望字宽。原字体 SHA256 `3d4cdf2752075d28c6ebf0ba44a61157ec6eb38f8db0ebdc3205aec056760be5`，1000 units/em。
- 新测试 [workstation-fidelity.spec.ts](../tests/workstation-fidelity.spec.ts) 自己保存原始尺寸、锚点、百分比和 RGBA 数值并计算期望；不把生产 CSS、生成的 skin manifest、`workstation-geometry.json` 或上一张浏览器截图当作期望。
- 实际像素素材检查读取原始 PNG；物品审计现读取schema2的26个素材记录，直接核对公开merged-release ZIP和本机base/version-overlay候选。候选存在不证明客户端激活或覆盖顺序。
- 公开 [UI element reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_element?view=minecraft-bedrock-stable) 说明了 size / offset / anchor / renderer 属性，但没有给出本次所需的原生字体 normal 点数、最终像素吸附、纹理采样与自定义 3D renderer 的完整算法。不能把文档未给出的行为补成既定事实。

## 已发现并修正的偏差

| 等级 | 位置 | 原实现 | 当前修正与证据 |
| --- | --- | --- | --- |
| P1 | 附魔选项整体 | `124,28,212,122`，三行硬编码 `40,42,40` | 原 JSON 推导为 `123.2,28.2,212.8,121.6` CSS px，行高约 `40.533333px`；保留百分比算式。测试单独核对 options 和三行 |
| P1 | 附魔选项内部 | 英文 12px 上沿标签、缺少外围 inset；文本 / 图标位置没有组合验证 | 补真实 inset；dust / rune box / cost 的位置来自原锚点和 offset。新增未遮罩 main 页面组合检查，而不是只测隐藏内容后的按钮皮肤 |
| P1 | 消耗颜色 | 成功 `#b5e58c`，失败 `#a95050` | 源色分别为 `[.5,1,.125]` 与 `[.54,.37,.36]`。测试仅允许源 float 相邻的两个 UNORM 字节值；精确 native 字节量化仍需原生截图 |
| P1 | ItemSlot / 材质 | 自画物品 SVG；另一类 slot 纹理；选中仅外加白框 | 改为真实 container cell 和原始物品 PNG；物品区域 16×16 game px；selected / hover / focus 各有来源。现有26个demo PNG选用official merged release，并独立核对安装包候选；不推断运行时pack激活 |
| P2 | 关闭按钮 | Demo 未传 onClose，整个工作站缺按钮；普通 / compact 模式未区分 | Demo 现显式提供关闭 / 重开行为；source 中附魔台为 compact 关闭图像，砂轮为普通关闭图像 |
| P2 | 结果槽导航 | 空结果使用原生 disabled，破坏 JSON 中指向结果槽的显式 focus override | 使用 aria-disabled 与回调 guard，保留 native focus；测试 input Down / Right、additional Up / Right、result Left，空结果仍可聚焦 |
| P1 | 附魔书本 / 符文 | 原创书本图标、英文代替符文 | 已移除图标占位；预览接入真实 book atlas 的 WebGL 重建和真实 SGA atlas 的 rune glyph。**书本 mesh / 相机仍为重建，不能列为原生 renderer 通过** |

## 独立逻辑布局验算

下列坐标相对 `common.root_panel`，单位为 game UI pixel；当前 GUI 2 的 CSS 坐标为其两倍。

| 区域 | 原始推导 / 期望 |
| --- | --- |
| 根 | 176×166 |
| 槽位 / 物品区域 | 18×18 / 16×16 |
| Inventory label | (7,76) |
| 三行背包 | (7,86)，9×3，每格18 |
| 快捷栏 | (7,143)，9×1，每格18 |
| 砂轮标题 | (8,8) |
| 砂轮两输入 | (43,28)、(43,49) |
| 砂轮结果 | (115,38.5) |
| 砂轮箭头 | (77,40)，22×15 |
| 附魔标题 | (12,3) |
| 附魔书本 renderer box | (13,10.5)，40×40；这只是 box，不是 3D 投影证据 |
| 附魔 item / lapis | (13,47.5)、(33,47.5)，各18×18 |
| 附魔 options | 宽 `176*.65-8=106.4`，高 `(166*.5-12)*.8+4=60.8`；起点(61.6,14.1) |
| 每个选项 | 原 source `33.333333%`；不用自选整数行高替代 |
| 每行 dust | (3, (rowHeight-11)/2)，13×11 |
| 每行 rune box | (18, (rowHeight-16)/2+4)，84×16；shadow=false |
| 消耗文字 | 距右 / 下边缘各2；shadow=true |

Chromium 布局按 1/64 CSS px 存储。选项的百分比高度本身会量化，后续行再累计 track 的量化：当前全局第三行相对 raw double 数值差约 0.0479 CSS px。测试先验证 options 的原始几何，再在 options 自身坐标系验证各行；普通几何误差预算 ≤0.02 CSS px，累积行坐标 ≤3/64 CSS px。这个预算依据浏览器布局单元，不是放宽 RGBA 像素测试，更不能解释为游戏最终画面的零差异。

## 验证结果

首轮独立 Chromium 1280×1000、DPR=1、关闭 hover 状态，临时端口5184：**9/9 PASS，12.2s**。后续已将旧单一base归档材质检查替换为下面两项schema2审计；不能用首轮结果为运行时资源选择背书。

1. 四个原始 UI PNG 固定 SHA / 尺寸及 cell 的 logical density。
2. 砂轮整块区域、标题、输入、结果、箭头的相对布局。
3. 两个工作站每一格 27+9 库存坐标及物品区域。
4. 附魔 raw 百分比和三行。
5. main 页面未隐藏的 dust / rune box / cost 位置、source 色与 shadow。
6. GUI 标题的原 Mojangles advance：Repair & Disenchant=10200、Inventory=5000、Enchant=4000 font units；按实际字号换算。
7. 物品示例已加载真实 img，未残留物品 SVG。
8. 全部26个demo PNG的SHA256、尺寸、字节数与schema2 official-merged-release记录一致。
9. 原始public ZIP中26个对应条目与demo逐字节相同；58个本机base/version-overlay候选分别核对archive哈希、entry哈希、大小及matchesSelected标记。每项选中图至少有一个安装候选匹配；不选择运行时pack或推断覆盖优先级。
10. 砂轮显式键盘 focus 路径与空结果保留聚焦。

本轮新增/替换的材质审计两项已单独实跑**2/2 PASS**；原始ZIP读取使用独立标准ZIP解析和Node zlib，不调用准备素材的脚本作为oracle。CI没有用户自有字体时第6项跳过；没有原public ZIP或游戏候选时第9项明确跳过，第8项仍执行全部26图记录检查。候选审计通过也不能写成当前客户端实际激活纹理已认证。

未遮罩的实际浏览器 frame：`.cache/independent-qa/grindstone-unmasked.png`、`.cache/independent-qa/enchanting-unmasked.png`。这两张是 **实现截图**，不是原版期望图。

## 仍不可签收的部分

| 等级 | 缺口 | 要完成的验收 |
| --- | --- | --- |
| P1 | 没有相同版本和状态的原生整块 GUI 截图验收 | 早期启动曾遇Xbox Live 0x80004005，后续已进入游戏继续采集；仍需固定 desktop profile、语言、GUI scale、窗口分辨率、物品 / 数量 / 耐久 / XP / 三档附魔内容、book 开合和鼠标状态，捕获原图后与未遮罩实现做同尺寸差异计数 |
| P1 | 书本 renderer 不是原生实现 | 真 atlas 已接入，但 native hardcoded mesh、相机、灯光、翻页方程和状态仍未取得。`data-fidelity=renderer-reconstruction` 的 canvas 必须继续保持这个身份，不应称为原生零差异 |
| P1 | JSON float 与最终 native pixel snapping 的关系未知 | 保留 raw float 修正了逻辑布局错误；CSS 分数坐标的边缘采样仍可能与游戏 GPU 不同。最终 raster oracle 缺失前不能凭数值接近宣布整图一致 |
| P2 | 原生 font_size=normal 与文字 baseline / 换行 | 原始 Mojangles advance 已核对，但不等于已证明 native normal=20 CSS px；没有 native 字号 / baseline / rune wrapping 的整块截图证据 |
| P2 | 草方块图标使用真实 UI category 预渲染图 | `icon_recipe_nature.png` 是17×17的官方 GUI 图像，整数2倍34px可避免扭曲；它不是原生 inventory_item_renderer 的3D方块结果。需要在原生 target 截图中确认对应物品结果 |
| P2 | 物品 glint / durability / tooltip 原生 renderer | 假紫色矩形已经移除；具体 shader、耐久颜色、tooltip 组合仍不可仅用贴图 / CSS 验收 |

**撤回此前“本机当前运行时剑与公开sample差22像素”的结论。** 227 bytes、SHA `f8094529776d45b66ec2318c152ca90a669b7956c311017fa1f05ed8afc19da9`仅是`vanilla` base条目；198 bytes、SHA `cf75a6e96b2d3e06bf078dbc28367febf01f03dcec177ceb64ca80608aa2ad94`是official v1.26.60.5 merged-release选中图，本机`vanilla_1.16`和`vanilla_1.21.90`候选也包含完全相同字节。22像素仅表示base条目与merged图的RGBA差异，不能证明当前客户端用base图，也不能仅凭候选目录名或文件存在证明某overlay已经激活。Demo现在统一使用公开merged-release素材；运行时pack选择仍需独立游戏证据。

## 验收层级不能互相替代

1. **规范尺寸皮肤**：例如216×38整数背景的 PNG / 九宫格，RGBA要求0差异。适合证明图像和解码规则。
2. **生产 GUI 的逻辑布局与组件组合**：本文件的独立 source 数值、格子、dust / cost / rune box / real materials 检查。适合发现错锚点、错百分比和占位图。
3. **原生整块 GUI 的最终栅格**：同版本、同状态游戏截图与生产 GUI。现在仍未具备。

把原来失败的 float 截图测试移到独立整数皮肤 fixture，是有效分层；若随后用该 fixture 的0差异替代第3层，并称“整 GUI pixel perfect”，就会隐藏真正的组合 / 栅格差异。下一步应取得第3层原图并固定其状态，继续校准仍列出的 renderer 和字体差异。
