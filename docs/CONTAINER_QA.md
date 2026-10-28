# 容器 GUI 独立 QA

2026-10-29，范围是 Bedrock Classic 桌面 profile、安装版本 `1.26.6005.0`、组件 GUI 2、Chromium DPR=1 的小/大箱子、漏斗、发射器、投掷器和潜影盒。逻辑布局通过不等于原生游戏整屏 pixel-perfect 认证。

## 来源与独立方法

直接解析本机 `data/resource_packs/vanilla/__brarchive/ui.brarchive`，提取 `chest_screen.json` 与 `redstone_screen.json`，与 [Mojang v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip) 中对应文件去除 JSONC 注释和尾逗号后的完整对象比较：相同。公开 ZIP 的 SHA256 为 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。

本机原始文件 SHA256：`chest_screen.json` 为 `ee9b4c0506a7774ff994010cf783998c601be8a0b11b6edd17a85ae2ab15a891`；`redstone_screen.json` 为 `4867d980c29300d8b434de14a6f9f34e35200e1fa5c72da04c68cdd947c06cee`。公共 JSON 的空白/注释不同，因此比较 parsed 对象，不要求原始字节相同。

[container-fidelity.spec.ts](../tests/container-fidelity.spec.ts) 自己保存原始尺寸、锚点与算式，不读取生产 CSS、生成的 geometry / skin manifest 或当前实现的浏览器截图生成期望。

## 源规格

下表坐标和尺寸均为相对根容器的游戏 UI pixel，GUI 2 时乘2成为 CSS pixel。物品槽18×18，物品图像区域16×16。

| 容器 | 根尺寸 | 存储格 | 存储网格原点 | 标题 |
| --- | --- | --- | --- | --- |
| 小箱子 | 176×166 | 9×3 | `(7,21)` | `(7,11)` |
| 大箱子 | 176×220 | 9×6 | `(7,21)` | `(7,10)` |
| 潜影盒 | 176×166 | 9×3 | `(7,21)` | `(7,11)` |
| 漏斗 | 176×133 | 5×1 | `(43,18.25)` | `(7,7)` |
| 发射器 | 176×166 | 3×3 | `(61,15.5)` | top-middle，y=5 |
| 投掷器 | 176×166 | 3×3 | `(61,15.5)` | top-middle，y=5 |

潜影盒的源 `shulker_box_panel` 直接继承 `chest.small_chest_panel`，不是另一套彩色外框。漏斗/发射器/投掷器的实际定义位于 `redstone_screen.json`。

漏斗网格原点的 y 来自：根高133 → `redstone_panel_top_half` 高 `133/2-12=54.5`，上移入根 y=7；18高网格居中，再应用 `[0,-7]`，得到 `7+(54.5-18)/2-7=18.25`。发射器/投掷器同理得到 `7+(71-54)/2=15.5`。这些小数是原始逻辑布局结果，没有为了凑整数预先四舍五入。

`Chest rows=1/2/4/5` 等可定制行数是库扩展。原始本次来源直接定义的是3行小箱和6行大箱，不能将其他行数的高度插值宣称为逐项原生认证。参数归一化、选择、回调和窄屏交互由另一个交互测试文件验证。

## 背包必须跟随各自高度

`common.inventory_panel_bottom_half_with_label` 高93并 bottom-left 对齐；Inventory 标签相对其起点偏移 `(7,3)`。内部 `inventory_grid` 是162×54、bottom-middle 对齐再偏移 `[0,-26]`；hotbar162×18、bottom-middle 对齐再偏移 `[0,-5]`。

| 根高度 H | Inventory 标签 y=`H-90` | 背包3行起点 y=`H-80` | 快捷栏 y=`H-23` |
| --- | --- | --- | --- |
| 133，漏斗 | 43 | 53 | 110 |
| 166，小箱/潜影盒/发射器/投掷器 | 76 | 86 | 143 |
| 220，大箱 | 130 | 140 | 197 |

这意味着漏斗和大箱不能直接复用固定的普通工作站 y=76/86/143。测试逐格核对全部存储格和6个容器各自的27格背包、9格快捷栏；占用槽内部物品区域仍是32×32 CSS pixel。

## 验证与边界

新增8项独立测试：1项可选本机归档源定义检查、6种规格的完整组合布局/标题/全部存储格，以及1项所有玩家背包/快捷栏位置检查。未遮罩实际截图输出到 `.cache/container-qa/*-unmasked.png`，它们是当前实现的证据，不是原生游戏期望图。

执行 `npx playwright test --config .cache/container-qa/playwright.config.mjs`：与铁砧10项联合 **18/18 PASS，45.1s**，其中容器8项全部通过。使用独立5184端口，结束后确认该端口对应的 Node/Vite 进程已退出。集成配置可运行 `npx playwright test --project=pixels tests/container-fidelity.spec.ts`。

本次没有获得相同版本、相同GUI缩放和固定状态的原生游戏截图。源标签的 normal 字体最终基线、引擎像素吸附和鼠标/手柄自动空间导航完整算法没有由本次源材料充分定义。组件的可访问性网格交互不是新增原生导航认证；源 UI 中没有本次容器专用的显式 focus override。面板/槽位的PNG零差检查另在基础皮肤测试中，不能用本次DOM几何通过替代整屏RGBA比较。
