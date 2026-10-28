# Bedrock 组件范围

当前导出 28 个组件；首轮目录 101 项，73 项待实现。这个数字是工作清单，不表示已经穷尽所有游戏版本中的 GUI。实现状态不等于整屏像素验收通过。

## 已实现

| 分类 | 组件 |
| --- | --- |
| 文字与表面（8） | Text、PixelIcon、Panel、Separator、Progress、Dialog、Alert、Badge |
| 输入与设置（11） | Button、IconButton、Checkbox、RadioGroup、Switch、Slider、TextField、TextArea、Select、Combobox、Tabs |
| 物品与容器结构（5） | ItemSlot、ItemTooltip、InventoryGrid、PlayerInventory、WorkstationFrame |
| 工作站（2） | Grindstone、EnchantingTable |
| 附魔渲染部件（2） | EnchantingRunes、EnchantingBook |

`EnchantingBook` 使用真实材质，网格和相机仍是重建；`EnchantingRunes` 需要调用方提供原版字图集。整套工作站仍待原游戏同版本、同状态截图对照。

## 待补范围

- 基础：Image、NineSlice、Spinner、Tooltip、Toast、ScrollArea、ScrollBar。
- 输入与设置：ToggleButton、SearchField、NavigationList、SettingRow、KeybindingField。
- 容器部件：ItemImage、ItemCount、DurabilityBar、RecipeGrid、RecipeSearch、RecipeCategoryTabs、ProcessingArrow、FuelIndicator、EnchantmentOption、TradeOffer、ArmorSlot、ResultSlot、SlotPlaceholder。
- 工作站与容器：CraftingTable、Furnace、BlastFurnace、Smoker、BrewingStand、Anvil、SmithingTable、Stonecutter、Loom、CartographyTable、Beacon、Chest、Hopper、Dispenser、Dropper、ShulkerBox、Crafter、TradingScreen、PlayerInventoryScreen、CreativeInventory、MountInventory。
- HUD：Hotbar、HealthBar、HungerBar、ArmorBar、AirBar、ExperienceBar、BossBar、Crosshair、ChatMessage、ChatPanel、Scoreboard、StatusEffect、ActionBar、TitleOverlay、HeldItemTooltip、PlayerList、TouchControls。
- 游戏页面组合：PauseMenu、SettingsPanel、WorldList、ServerList、PlayerCard、PackList、PackCard、DeathScreen、LoadingScreen、AchievementToast。

## 复用方式

按“原始材质和字体 → 基础控件 → 可复用 GUI 部件 → 完整 GUI”组织。完整 GUI 通过共享部件组合，保留各自原版坐标、纹理、焦点路径与交互状态。

例如熔炉、烟熏炉和高炉共享物品槽、结果槽、燃料指示、处理箭头和玩家物品栏；附魔台共享容器框、库存、物品槽、附魔选项、符文和书本。数量、耐久和物品图像从 ItemSlot 内部拆出后，也可以单独用于快捷栏和交易项。

UI 组件接收物品、配方、进度、选择状态与操作回调；合成、交易、附魔等游戏规则由使用方提供。可机读状态见 [component-catalog.json](./component-catalog.json)，像素验收边界见 [FIDELITY.md](./FIDELITY.md)。
