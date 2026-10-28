# Bedrock 组件范围

当前导出 86 个组件；当前目录 106 项，20 项待实现，包含本轮拆出的 RecipeSelectionGrid、CrafterSlot 和 BeaconEffect。这个数字是工作清单，不表示已经穷尽所有游戏版本中的 GUI。实现状态不等于整屏像素验收通过。

## 已实现

| 分类 | 组件 |
| --- | --- |
| 文字与表面（15） | Text、PixelIcon、Image、NineSlice、Panel、Separator、Progress、Dialog、Alert、Badge、ScrollArea、ScrollBar、Spinner、Tooltip、Toast |
| 输入与设置（16） | Button、IconButton、Checkbox、RadioGroup、Switch、Slider、TextField、TextArea、Select、Combobox、Tabs、ToggleButton、SearchField、NavigationList、SettingRow、KeybindingField |
| 物品与容器结构（18） | ItemSlot、ItemTooltip、InventoryGrid、PlayerInventory、WorkstationFrame、ContainerFrame、ItemImage、ItemCount、DurabilityBar、SlotPlaceholder、ResultSlot、RecipeGrid、ProcessingArrow、FuelIndicator、BrewingIndicator、RecipeSelectionGrid、CrafterSlot、BeaconEffect |
| 工作站与容器（19） | Grindstone、EnchantingTable、CraftingTable、Furnace、BlastFurnace、Smoker、Anvil、BrewingStand、SmithingTable、CartographyTable、Chest、Hopper、Dispenser、Dropper、ShulkerBox、Stonecutter、Loom、Beacon、Crafter |
| 附魔部件（3） | EnchantmentOption、EnchantingRunes、EnchantingBook |
| HUD（15） | Hotbar、HealthBar、HungerBar、ArmorBar、AirBar、ExperienceBar、Crosshair、BossBar、ChatMessage、ChatPanel、Scoreboard、StatusEffect、ActionBar、TitleOverlay、HeldItemTooltip |

`EnchantingBook` 使用真实材质，默认视角和分面光照已通过本机无损 PNG 校准，网格及翻页仍是重建；`EnchantingRunes` 需要调用方提供原版字图集。已有部分工作站的同版本原生局部截图证据，完整状态与整屏差异仍需逐项核对。

HUD 使用原始图像，生命 / 饥饿 / 护甲 / 氧气的行排列属于 custom renderer 的 Web 重建。制图台 description 的栈锚点与字体比例尚待原生校准；锻造装备预览接受调用方 renderer。这些限制独立于 PNG、JSON 与浏览器图像测试。

## 待补范围

- 容器部件：RecipeSearch、RecipeCategoryTabs、TradeOffer、ArmorSlot。
- 工作站与容器：TradingScreen、PlayerInventoryScreen、CreativeInventory、MountInventory。
- HUD：PlayerList、TouchControls。
- 游戏页面组合：PauseMenu、SettingsPanel、WorldList、ServerList、PlayerCard、PackList、PackCard、DeathScreen、LoadingScreen、AchievementToast。

## 复用方式

按“原始材质和字体 → 基础控件 → 可复用 GUI 部件 → 完整 GUI”组织。完整 GUI 通过共享部件组合，保留各自原版坐标、纹理、焦点路径与交互状态。

例如熔炉、烟熏炉和高炉共享物品槽、结果槽、燃料指示、处理箭头和玩家物品栏；附魔台共享容器框、库存、物品槽、附魔选项、符文和书本。数量、耐久和物品图像从 ItemSlot 内部拆出后，也可以单独用于快捷栏和交易项。

BrewingIndicator 拆出箭头、气泡与燃料三种完整原图裁切；酿造台组合它们与五个槽位。现代三输入锻造台、制图台复用 ItemSlot、ResultSlot、WorkstationFrame 和 PlayerInventory。ScrollArea 将原生滚动视口与受控 ScrollBar 组合，保留触屏、滚轮和文本选择。

目前 CraftingTable / Furnace / BlastFurnace / Smoker 实现原版容器右面板；配方书、筛选和外部 toolbar 仍待补齐，不能将这些主面板等同于完整游戏屏幕。

SmithingTable / CartographyTable 同样只包含原始主面板，关闭入口属于尚未提供的外部 toolbar。Hotbar 仅管理组件内部的焦点和激活，全局数字键 / 滚轮游戏输入由调用方绑定。

UI 组件接收物品、配方、进度、选择状态与操作回调；合成、交易、附魔等游戏规则由使用方提供。可机读状态见 [component-catalog.json](./component-catalog.json)，像素验收边界见 [FIDELITY.md](./FIDELITY.md)。

Stonecutter / Loom 共用 RecipeSelectionGrid 和原生滚动视口，旗帜 / 方块预览由调用方提供 renderer。CrafterSlot 将禁用槽恢复操作与普通物品操作分开；BeaconEffect 复用真实效果按钮，金字塔等级、有效选择和支付规则由调用方控制。

设置控件分别提供切换、搜索、导航、标签关联和物理键捕获；SettingRow 使用 render prop 将 id / aria / disabled 传给控件。Tooltip / Toast 使用原版图层，定位、关闭和计时属于明确的 Web 组合。聊天、标题与效果组件接收内容和可见状态，游戏网络、命令、计时及完整原生 renderer 不由组件库模拟。
