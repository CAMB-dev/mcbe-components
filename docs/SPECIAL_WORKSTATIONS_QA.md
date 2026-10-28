# 锻造与制图工作站独立 QA

2026-10-29。目标是 Bedrock Classic 桌面profile、安装版本 `1.26.6005.0`、GUI 2、Chromium DPR=1。现代锻造采用三输入的 `smithing_table_2`，制图采用大视口176×220 profile。本次源布局/素材验证不认证custom3D预览或原生整屏pixel perfect。

## 来源与推导假设

独立读取本机原始archive与 [Mojang v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)：`smithing_table_2_screen.json`、`cartography_screen.json`完整parsed对象相同，另查legacy两输入smithing定义以防混用。公开ZIP SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。

本机原文件SHA256分别是 `06affd3fbfe40828c31bf5993d7fc57c8170b8d37881e5f6dc1f0bd512644e85` 和 `9c567c1dbca2287961ebdc87621750c805ea3286611d6b3c20376e5357d5b987`。涉及的PNG全部与公开包逐字节相同。[special-workstations-fidelity.spec.ts](../tests/special-workstations-fidelity.spec.ts) 自己保存源值/公式/图片哈希，不从生产CSS、生成manifest或上一张实现截图反推。

以下坐标为相对根的游戏UI pixel，GUI 2时乘2。涉及默认grid/span锚点和normal字体高度的部分是明确的浏览器profile模型；没有原生游戏截图就不能把它们全部叫最终原生栅格事实。

## 现代锻造

根176×166；top panel162×69位于 `(7,7)`。recipe panel占top后60%，为 `(7,34.6,162,41.4)`；9列grid宽162、高recipe的90%，每列宽18。

| 区域 | 逻辑矩形 |
| --- | --- |
| smithing图标 | `(7,7,30,30)` |
| 模板槽 | `(7,46.3,18,18)` |
| 装备槽 | `(25,46.3,18,18)` |
| 材料槽 | `(43,46.3,18,18)` |
| 结果槽，grid第5列 | `(97,46.3,18,18)` |
| 箭头/叉 | `(69.982,49.3,18,12)` |
| 自定义装备预览容器 | `(131.5,42.8,25,25)` |

`yields`在第3列并声明宽22.2%；当前模型按grid162的22.2%得到35.964，再将18宽箭头居中，因此left=69.982。预览内部25×25、offset `[2,0]`，源renderer名为 `equipment_preview_renderer`，旋转x=30/y=-30。测试只核对容器和renderer来源标记，不对调用方preview图像认证。省略preview时留空而非编造原生角色。

锻造结果槽保持普通36×36 CSS，物品32×32。内部关闭按钮在源common panel中隐藏，toolbar属于额外屏幕结构，不纳入独立main panel认证。

占位纹理是**横向多帧atlas**，每帧16×16，源动画1fps：

| 纹理 | 原图尺寸 | 帧数 |
| --- | --- | --- |
| templates_slot_overlay | 32×16 | 2 |
| armors_slot_overlay | 64×16 | 4 |
| armors_and_tools_slot_overlay | 192×16 | 12 |
| smithing_material_slot_overlay | 112×16 | 7 |
| ingot_image | 16×16 | 1 |

不能把长条压成32×32 CSS，也不能按纵向atlas裁切。独立测试分别冻结frame0/1，对模板、装备/工具和全部材料三种strip裁切原始16×16，比较实际32×32 CSS输出，严格RGBA容差0。测试的固定UV状态不证明原生动画相位或计时一致；reduced-motion允许停动画。

显示条件源自`#show_input_overlay_*` / `#show_material_overlay_*`，由调用方状态决定。JSON没有给这些值的条件表达式，当前可见性API和underlay组合不能替代原生引擎对这些binding值的运行时推导。后续真实空状态截图确认仅template占位可见，因此默认`templateOverlay=true`、`baseOverlay=null`、`materialOverlay=null`。宿主按实际模板/backend状态显式启用其他原图。

校准页将`smithing-empty-native`默认空状态与`smithing-atlas-frame0/1`素材检查分开；后者显式启用装备/工具、材料占位，仅用于UV裁切验证，不作为原生空状态预期图。

## 制图大视口profile

原根的size是 `[100%-44px,100%]`，max176×220。独立组件选取大视口上限；不是证明所有屏幕尺寸下的原生缩放行为。top stack164×130，normal文字高度按10game的现有profile处理：`6+title10+4+MapName10+input20+4+main66+description10=130`，fill剩余0。

| 区域 | 逻辑矩形 |
| --- | --- |
| 标题 | `(6,6,164,10)` |
| Map Name输入框 | `(6,30,164,20)` |
| main | `(7,54,162,66)` |
| 输入槽，真实空状态修正 | `(7,58.5,18,18)` |
| 加号 | `(9.5,80.5,13,13)` |
| 第二输入槽，真实空状态修正 | `(7,97.5,18,18)` |
| 左箭头 | `(32,80.5,16,13)` |
| 地图原图容器 | `(55,54,66,66)` |
| 右箭头 | `(124,80.5,16,13)` |
| 结果槽 | `(143,74,26,26)` |

这里使用真正 `arrow.png`16×13，不是arrow_large。地图empty/copy/map/zoom/glass五原图均66×66，GUI 2保持132×132。分别验证none、clone、rename、basic、locator、extend、locked七种绑定语义对应图像，rename/basic/locator共用map原图。制图结果槽是52×52 CSS，内部物品仍32×32。

真实GUI5空状态修正：57game输入stack在66game高main中居中得到y58.5，第二槽接在18+21game之后得到y97.5。原JSON的子项offset`+1/-1`在该stack主轴上没有按普通panel方式应用；此前只按字面相加所得59.5/96.5被原生截图否定。Map Name标题应与输入框左边缘对齐，而非居中。

根高220会让背包标签/网格/hotbar相对普通工作站下移54game：y130/140/197。所有格逐一验算，不能沿用普通根的76/86/143。

`output_description_label`在stack内同时设 `anchor_from=bottom_middle`、`anchor_to=top_middle`。官方[UI element参考](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_element?view=minecraft-bedrock-stable)说明from是parent、to是自身，但未给出stack主轴分配是否忽略childanchors的完整算法。当前description使用普通stack行的profile位置并显式标记 `data-fidelity="stack-anchor-unverified"`。**本测试不把description的y110、y120或其他解释当作已证原生坐标**；该项留待原生截图校准。

## 焦点与验收

源显式锻造路径：模板Right→装备；装备Left→模板、Right→材料；材料Left→装备、Right→结果；结果Left→材料。制图路径：输入Down→第二输入、Right→结果；第二输入Up→输入、Right→结果；结果Left→第二输入。空结果保留focus，用aria-disabled/动作guard约束领取。

新增15项独立测试：原图hash、native源检查、两种组合布局/profile、全部背包/快捷栏、显式focus、2个UV帧场景和7种地图模式。PNG比较的期望是独立原图`<img>`+裁切视口，生产是CSS背景；仅校准素材sample移动到整数屏幕平面，main未遮罩组合截图保持原样。

修正前执行 `npx playwright test --config .cache/special-qa/playwright.config.mjs`：与酿造联合 **31/31 PASS，1.7m**，其中special15项全部通过；2个UV场景各3条strip，以及7个地图模式均严格RGBA零差。临时5184 Node/Vite在结束后确认退出，`.last-run.json`为passed。该源模型回归没有发现后来真实截图揭示的默认binding与stack偏差，不能用于认证这些旧预期。集成配置可运行 `npx playwright test --project=pixels tests/special-workstations-fidelity.spec.ts`。

`.cache/special-qa/*-unmasked.png` 是当前实现的实际图，不是原生期望图。还缺native normal字体度量、grid跨列/stack最终像素吸附、description锚点、原生装备3D renderer和tooltip、toolbar及同状态整屏截图，不能把素材零差或profile通过扩张为整个游戏GUI认证。

## 后续取得的原生参考与局部复核

2026-10-29 在同一本机26.60、简体中文、Classic GUI 5测试世界补拍两张2568×1400无损PNG，原图仅存忽略目录 `.cache/native-gui/`：

- `smithing-empty-native-lossless.png`，SHA256 `08aeeac425a0647520583b5498b7ca57f613a3d49ee149549ce22ce942786013`。
- `cartography-empty-native-lossless.png`，SHA256 `84fd59694c2acd030a731f4afdde855109037e3b7af2c686cafe9201b64ac1ce`。

只读原PNG逐行像素复核：制图66game地图为330screen pixels，左上约`(1126,417)`，与面板origin约`(851,147)`、GUI5大视口profile相符。第一输入槽top440、第二输入槽top635，吻合未应用主轴offset的58.5/97.5game与原生像素取整；原59.5/96.5模型会预测约445/630，各差5screen pixels。名称框左上约`(881,297)`、结果槽`(1566,517)`、背包网格`(886,847)`、hotbar`(886,1132)`等明显主结构与当前模型相符。Map Name中文标题与名称框左侧对齐。这里的边缘测量允许原生半像素边界取整，**不是RGBA整屏相等比较**。

锻造空状态确实只有template占位，base/material为空；组件默认值已据此收窄。JSON只暴露显示binding名称，仍不宣称得到了所有占用/无效模板状态的引擎计算规则。

空截图没有描述文本，故description锚点继续标记unverified。这两张图仅支持上述空状态可见性和局部布局修正，没有把31项源图/几何检查升级为原生整屏零差认证。字体基线、其他状态、原生自定义renderer与外部chrome不由本轮局部复核认证。

## 原生差异修正后的定向验证

使用独立5189 Vite和`.cache/special-native-followup/`输出，只重跑special测试与完整类型检查，不重复301项整合套件。新增默认空状态仅template占位断言；保留2帧×3strip和7模式的原图RGBA零差检查；槽位期望改为原生支持的58.5/97.5game，并断言Map Name左对齐。

执行 `npx playwright test --config .cache/special-native-followup/playwright.config.mjs`：**16/16 PASS，28.3s**。完整 `npm run typecheck` 同时通过。输出位于该独立目录的`results/`与`captures/`，默认空状态和atlas样本保持分离；本次验证仍只认证记录中的空状态局部差异修正与原图裁切，不认证原生整屏相等。
