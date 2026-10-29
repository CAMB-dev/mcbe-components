# 独立合成与熔炼 GUI 验证

2026-10-29，目标是 Bedrock Classic 桌面 profile，游戏安装版本 `1.26.6005.0`，组件 GUI 2，Chromium DPR=1。范围包括工作台的 3×3 合成右面板，以及熔炉、高炉、烟熏炉的右面板。**这不是原生游戏整屏 pixel-perfect 验收。**

## 独立来源

读取用户安装游戏的 `data/resource_packs/vanilla/__brarchive/ui.brarchive` 和 `textures/ui.brarchive`，独立解析目录记录并提取原始 JSON / PNG。原文件没有修改。

公开来源是 [Mojang v1.26.60.5 full archive](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)，压缩包 SHA256：`d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。独立移除 JSONC 注释与尾逗号后，`resource_pack/ui/{inventory_screen,furnace_screen,blast_furnace_screen,smoker_screen}.json` 的完整 parsed 对象与本机对应定义相同。PNG 则逐字节相同。

| 原始图像 | 分辨率 | SHA256 |
| --- | --- | --- |
| `arrow_active.png` | 22×15 | `37c7da283f77fc1c175696c7a479aa4afaad17d7e68d4f114b54b7ba439aedee` |
| `arrow_inactive.png` | 22×15 | `9c549ac5595bc65cbc5ca9bacfc8486b0a2961118152460878c4926ffc3c2457` |
| `flame_full_image.png` | 13×13 | `2cf0471cb2a0aa060c209f3a0dfd866caf795135dbd594ac1768273725aee196` |
| `flame_empty_image.png` | 13×13 | `9b04056628f93cfba11f4d4de35370d903dadd4f9f77c71dcd2137f4b1c9cecc` |
| `arrow_large.png` | 22×15 | `c0b27d51e084d0018365a94905e53e8661cf0f05448145c71402ff16844fe1b6` |

箭头 active PNG 包含 alpha=35 的半透明像素，不能用任意纯白形状或不透明蒙版替代；火焰也应保留原图的透明空隙。哈希测试固定原始 PNG，不从生产 skin manifest 或生成 SVG 反推期望。

## 原始布局计算

坐标相对 `common.root_panel`，单位是游戏 UI pixel。根尺寸176×166，GUI 2 时 CSS 坐标和尺寸都乘2。以下数值在测试里直接由原始嵌套锚点计算，没有读取生产 CSS 作为期望。

熔炉的 `furnace_panel_top_half` 尺寸为 `[100%, 50%-12px]`，即176×71，位于 `(0,7)`。输入半区88×71，内部16×16面板右中对齐；其中心控制物料、燃料和火焰。高炉和烟熏炉的源定义只继承 `furnace.furnace_screen`，没有另一套槽位布局。

| 熔炼区域 | 原始逻辑矩形 `(x,y,width,height)` | GUI 2 CSS 矩形 |
| --- | --- | --- |
| 物料输入 | `(50,14.5,18,18)` | `(100,29,36,36)` |
| 燃料槽 | `(50,52.5,18,18)` | `(100,105,36,36)` |
| 火焰 | `(52.5,36,13,13)` | `(105,72,26,26)` |
| 箭头 | `(77,35,22,15)` | `(154,70,44,30)` |
| 结果槽 | `(108,29.5,26,26)` | `(216,59,52,52)` |
| 标题 | top-middle，offset `(0,-3)`，相对根 y=4 | 横向中心176，y=8 |

这里的半像素是源定义算式的结果。不能搬用 Java 版常见整数坐标，也不能为了凑整而单独调整输入、输出或箭头。

工作台来自 `crafting.crafting_panel_top_half` → `work_bench_panel_3x3`：工作台面板 offset `(29,0)`；带标签的合成网格再 offset `(0,5)`，网格自身再 offset `(0,11)`。

| 工作台区域 | 原始逻辑矩形 |
| --- | --- |
| 合成网格 | `(29,16,54,54)`，3×3，每格18×18 |
| 标签 | `(14,5,84,10)`，原始居中对齐 |
| 大箭头 | `(90,35.5,22,15)` |
| 结果槽 | `(123,30,26,26)` |
| Inventory 标签 | `(8,72)`；这里是工作台自己的标签，不是通用 `(7,76)` |
| 玩家背包27格 | 起点 `(7,86)`，9列3行，步长18 |
| 快捷栏9格 | 起点 `(7,143)`，步长18 |

26×26结果槽内的物品 renderer 仍为16×16；GUI 2 的52×52大槽内部物品保持32×32，居中偏移10，而不是将物品一起放大。合成材料的空格、物品数量、耐久显示与结果交互由调用方数据驱动，组件不是游戏的配方或熔炼引擎。

## 进度裁切与层次

原始 `furnace_arrow_empty_image` 使用 `arrow_inactive`，layer=1；full 使用 `arrow_active`，layer=3，`clip_direction="left"`，`#furnace_arrow_ratio` 绑定到 `#clip_ratio`。火焰 empty/full 的 layer 分别为2/3，full 的 `clip_direction="down"`，绑定 `#furnace_flame_ratio`。

公共组件 `progress` 表示可见的完成比例或剩余燃料比例：箭头从左向右显示，火焰保留底部区域并向上显示。测试将两张原 PNG 放入独立的固定尺寸 `<img>` 控制样本，按 GUI 2 最近邻采样，先画 empty，再用 `overflow:hidden` 视口裁切 full；生产实现使用 `clip-path`。期望只读取原 PNG 和上述源尺寸，不 import 生产 CSS / manifest，不使用 CSS 变量生成期望。0、50%、100%共6个状态逐像素比较，容差为0。**完整纹理必须保持原尺寸，裁切窗口变化；把 full 图像缩放为进度宽高是错误实现。**

alpha=35 的原图 shadow 像素还单独检查 alpha 通道。最初手算 `round(source*alpha+background*(1-alpha))` 得到背景红通道35，但同一原 PNG 经 Chromium 合成得到34；active arrow50%和100%因此分别有44/84个像素差1。改用原PNG独立浏览器控制样本后，完整 RGBA 比较为0差，没有放宽通道或像素容差。这里确认的是 **Chromium 的预乘 alpha 合成一致性**，不是原生游戏 GPU 的量化结果。

另一处测试夹具差异是自然文档流中 specimen 的 fractional screen top，加上自动滚动后，Playwright 会把30px高的DOM区域向外取整截成31px。因此 canonical helper 先单独核对44×30或26×26的DOM尺寸，再放到固定整数 screen plane 取样；原始完整GUI布局和未遮罩截图没有被测试代码移动或取整。独立平面的皮肤零差与原样GUI组合布局是两项不同证据。

这些测试证明公共 API 指定比例下的图像组合，不能证明引擎 `#furnace_*_ratio` 数值与公共 API 数值的逐值转换。原始 JSON 没有给出 binding 的引擎实现。50%火焰的26 CSS pixel高度恰好裁切13 CSS pixel，也没有擅自按2 CSS pixel取整；原生引擎的裁切量化仍需要实际游戏截图。

## 焦点与状态

测试只将原始 JSON 的显式 focus override 当作源事实：熔炉输入 Up 停止、燃料 Right → 结果、结果 Left → 燃料、结果 Right 停止；工作台右下合成格 Right → 结果、结果 Right 停止。

空结果使用 `aria-disabled` 加行为 guard 保留可聚焦性，不用 native `disabled` 破坏源定义中指向结果的焦点路径。通用网格方向键属于浏览器组件交互实现；原生自动空间导航完整算法没有在这些 JSON 中定义。工作台源中指向 `armor_item_head/legs` 的左边缘目标不在这个独立3×3右面板内，不能假造为“已完整复刻”路径。

源 `furnace.right_panel` 和 `crafting.player_inventory` 的 `common_panel` 均明确 `$show_close_button=false`。消费者可以自行提供关闭动作，但额外关闭按钮不是这两个原始右面板的验收内容。

## 验证与边界

新增 [processing-fidelity.spec.ts](../tests/processing-fidelity.spec.ts)，覆盖原始资源哈希、可选本机 archive 检查、4种完整组件的组合布局、所有玩家背包/快捷栏槽位、大结果槽物品尺寸、6个精确图像裁切状态，以及空结果的显式焦点路径。未遮罩浏览器截图输出到 `.cache/processing-qa/*-unmasked.png`，它们是**当前实现的实际图像，不是原生游戏期望截图**。

执行 `npx playwright test --config .cache/processing-qa/playwright.config.mjs`：**12/12 PASS，12.3s**。配置使用独立临时端口5184；结束后确认该端口对应的 Node/Vite 进程已退出。集成配置中归属 `pixels` 项目，可用 `npx playwright test --project=pixels tests/processing-fidelity.spec.ts` 复跑。原PNG参考由项目的 `fetch-references.mjs` 准备；本机 archive 检查在没有用户游戏安装时明确 skip，其余测试不依赖安装目录。

以上记录限定于原右面板与可复用基础件。后续新增的完整工作台组合 CraftingScreen、RecipeBook / RecipeBookEntry / RecipeFilterToggle，以及工作台原生截图与布局比较，单独记录于 [CRAFTING_SCREEN_QA.md](CRAFTING_SCREEN_QA.md)。引擎normal字体的完整像素、最终像素吸附、裁切量化、gamepad helper与全屏原生零差仍未完成；不能将局部PNG零差、DOM布局通过或测试数量当作整个游戏GUI零差的证据。熔炉族此处仍为右面板范围。
