# Classic 生存背包与共享外框

2026-10-29，Minecraft for Windows `1.26.6005.0`。本轮新增 `InventoryScreenFrame` 与 `SurvivalInventoryScreen`，当前公开117个组件、3份数据、2个函数，共122项值导出。`InventoryScreenFrameBase` 只供模块内部组合，不公开导出。本文区分源声明、浏览器合同与原生验收，不声称完整native RGBA零差。

## 来源与共享依据

公开来源为 Mojang `v1.26.60.5` full release、commit `15701fa9c13923f12662984c32c124327e40e3d3`，ZIP SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。只读研究直接比较本机归档与公开来源的十二份完整JSON，parsed对象均相等，保留42个原始控件定义、行号及原始字节哈希。

`inventory_screen.json:2582` 的生存背包与`:2571`的工作台均选择 `crafting.recipe_inventory_screen_content`，仅将右上半面板分别指定为 `survival_panel_top_half` / `crafting_panel_top_half`。这是抽出共享Frame的源依据；它不包含整个引擎的堆叠拆分、飞行物品、控制器辅助或原生renderer。

忽略目录证据：`.cache/inventory-composition-study/SOURCE_PLAN.md` SHA `df39501f59c2d3e39b10611737b408b1de56ebd08fbc61bb0a4cdaa8661bfa24`；`source-facts.json` SHA `7b81420cafd92ede50e4f505f4a70777ad489d975c373e28fa8b884c1a1ed069`。配方书既有来源另见 [CRAFTING_SCREEN_QA.md](CRAFTING_SCREEN_QA.md)。

## 原始几何

以下为逻辑game pixel；库的GUI2合同乘2得到CSS像素。切换布局不是浏览器宽度断点，窄屏保留原尺寸并局部横滚。

| 区域 | recipe-book布局 | survival布局 |
| --- | --- | --- |
| 固定根 | 326×166 | 326×166 |
| book槽 | [0,0,146,166] | 隐藏 |
| fold | [146,0,4,166] | 隐藏 |
| 右面板 | [150,0,176,166] | [75,0,176,166] |
| 工具栏，显示关闭入口 | [227,−20,99,20] | [152,−20,99,20] |

survival布局在176宽右面板两侧各保留75逻辑像素，并不把326根缩成176。隐藏关闭入口时工具栏减15宽；关闭图像15×15不等于其21×21命中区。

生存右面板为176×166：armor `[7,7,18,72]`，offhand `[79,61,18,18]`，preview外框 `[25,7,54,72]`、内部黑区 `[26,8,52,70]`；2×2输入 `[96,18,36,36]`、输出 `[152,26,18,18]`；下方27格库存 `[7,86,162,54]` 与9格hotbar `[7,143,162,18]`。普通箭头为 `[134,29,16,13]`。不额外绘制源中没有的Inventory标题行。

`#needs_crafting_table` 为显式宿主状态，默认false。true时用 `[134,28.5,16,16]` 的调用方renderer位置替换普通箭头，不改输入或结果；该位置来自源offset、16²尺寸和默认中心锚点。`craftingTablePreview` 未提供时保留有名称的空区域，不生成假工作台图；有输入不等于自动推断该状态。这个替代分支尚无新的原生截图验收。

公开Frame接收 `title`、`book` 与右面板 `children`，ref为实际section；`SurvivalInventoryScreen` 组合 RecipeBook 与 PlayerInventoryScreen，默认标题Inventory、布局recipe-book。旧CraftingScreen保留API及部件class hooks并复用相同实现。配方集合、搜索/过滤、分组、选择、输入/结果和角色模型都由宿主提供。

## 本轮验证

正式配置 `pixels` 项目运行 `survival-inventory.spec.ts`、`crafting-screen.spec.ts`、`inventory-screens-fidelity.spec.ts`，同批 **109/109 PASS**，0 skip、0 unexpected、0 flaky，耗时124.857秒。其中新增Survival22项、既有工作台23项、既有库存64项；109不是新增用例数，也不是整库单次全绿。

原报告 `.cache/survival-canonical.json` SHA `d514c4e269cd151769101116ea157a09350bee06003635f8c1367a668843e6bb`，独立输出目录 `.cache/survival-canonical-artifacts`。22项覆盖源几何/原图字节、两布局、36个下方槽位、required-table的有/无renderer与默认false、宿主回调/索引、跨armor/offhand/合成/结果/help焦点、受控布局、关闭入口移除后的焦点回退、Tooltip先消费Escape、真实section ref和移动端局部pan/axe。

普通箭头完整40×34区域（含4 CSS px halo）、fold完整40×364区域（含两侧外扩）、空preview完整116×152区域分别与独立原PNG组合RGBA零容差比较，无mask；这些是同一浏览器里的源图合同，不是原生整屏零差。默认与显式false的完整右面板也直接比较，未隐藏箭头、空preview或文字。

本轮 `npm run verify:package` 的React18.3.1 /19.3.1实际tarball消费者已通过117组件、122值导出、SSR、严格TSX/ref/API及新增Frame CSS检查。最终包哈希与发布字节身份由本轮发布记录单独保存，不复用旧115组件消费包身份。

展示页辅助记录 `.cache/survival-demo-smoke.json` 保留真实盔甲/副手、2×2输入结果、过滤/分组、帮助/关闭恢复及局部滚动检查，页面错误为空；它不计入上述正式用例数。额外示例物品是未修改的官方原图，来源与候选见 [survival-inventory-demo-materials.json](survival-inventory-demo-materials.json)，demo-only、不进入npm；候选存在不证明运行时资源包优先级。

## 保留边界

原生熔炉的根是内容自适应：展开326×166、compact缩为176×166，且其book有独立分类、filter皮肤与无count/group装饰的条目分支。不能用这个固定326的Frame冒充完整Furnace/BlastFurnace/Smoker；现有三个组件仍是右面板。

Pocket、手柄辅助、自动空间导航、原生角色/工作台模型与完整GUI动态状态仍未认证。部分源声明和既有原生图可以支持局部几何，但本轮没有新增生存背包native整图零差证据；字体、书本、边缘采样的既有残差不被109项合同PASS消除。PIX目前仅成功GPU launch，尚未取得GPU frame capture，实际draw绑定仍未知。
