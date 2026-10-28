# Bedrock 组件范围

当前导出 50 个组件；当前目录 102 项，52 项待实现，包含本轮拆出的公共 ContainerFrame。这个数字是工作清单，不表示已经穷尽所有游戏版本中的 GUI。实现状态不等于整屏像素验收通过。

## 已实现

| 分类 | 组件 |
| --- | --- |
| 文字与表面（10） | Text、PixelIcon、Image、NineSlice、Panel、Separator、Progress、Dialog、Alert、Badge |
| 输入与设置（11） | Button、IconButton、Checkbox、RadioGroup、Switch、Slider、TextField、TextArea、Select、Combobox、Tabs |
| 物品与容器结构（14） | ItemSlot、ItemTooltip、InventoryGrid、PlayerInventory、WorkstationFrame、ContainerFrame、ItemImage、ItemCount、DurabilityBar、SlotPlaceholder、ResultSlot、RecipeGrid、ProcessingArrow、FuelIndicator |
| 工作站与容器（12） | Grindstone、EnchantingTable、CraftingTable、Furnace、BlastFurnace、Smoker、Anvil、Chest、Hopper、Dispenser、Dropper、ShulkerBox |
| 附魔部件（3） | EnchantmentOption、EnchantingRunes、EnchantingBook |

`EnchantingBook` 使用真实材质，网格和相机仍是重建；`EnchantingRunes` 需要调用方提供原版字图集。整套工作站仍待原游戏同版本、同状态截图对照。

## 待补范围

- 基础：Spinner、Tooltip、Toast、ScrollArea、ScrollBar。
- 输入与设置：ToggleButton、SearchField、NavigationList、SettingRow、KeybindingField。
- 容器部件：RecipeSearch、RecipeCategoryTabs、TradeOffer、ArmorSlot。
- 工作站与容器：BrewingStand、SmithingTable、Stonecutter、Loom、CartographyTable、Beacon、Crafter、TradingScreen、PlayerInventoryScreen、CreativeInventory、MountInventory。
- HUD：Hotbar、HealthBar、HungerBar、ArmorBar、AirBar、ExperienceBar、BossBar、Crosshair、ChatMessage、ChatPanel、Scoreboard、StatusEffect、ActionBar、TitleOverlay、HeldItemTooltip、PlayerList、TouchControls。
- 游戏页面组合：PauseMenu、SettingsPanel、WorldList、ServerList、PlayerCard、PackList、PackCard、DeathScreen、LoadingScreen、AchievementToast。

## 复用方式

按“原始材质和字体 → 基础控件 → 可复用 GUI 部件 → 完整 GUI”组织。完整 GUI 通过共享部件组合，保留各自原版坐标、纹理、焦点路径与交互状态。

例如熔炉、烟熏炉和高炉共享物品槽、结果槽、燃料指示、处理箭头和玩家物品栏；附魔台共享容器框、库存、物品槽、附魔选项、符文和书本。数量、耐久和物品图像从 ItemSlot 内部拆出后，也可以单独用于快捷栏和交易项。

目前 CraftingTable / Furnace / BlastFurnace / Smoker 实现原版容器右面板；配方书、筛选和外部 toolbar 仍待补齐，不能将这些主面板等同于完整游戏屏幕。

UI 组件接收物品、配方、进度、选择状态与操作回调；合成、交易、附魔等游戏规则由使用方提供。可机读状态见 [component-catalog.json](./component-catalog.json)，像素验收边界见 [FIDELITY.md](./FIDELITY.md)。
