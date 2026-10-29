# Bedrock 组件范围

当前导出 117 个组件，目录 117 项均为 implemented；另有 3 份可复用 renderer 数据和 2 个 glint 纯渲染函数，不计作组件。这个数字是工作清单，不表示已经穷尽所有游戏版本中的 GUI。实现状态不等于整屏像素验收通过。

## 已实现

| 分类 | 组件 |
| --- | --- |
| 文字与表面（18） | Text、BitmapText、PixelIcon、Image、NineSlice、BlockPreview、BannerPreview、Panel、Separator、Progress、Spinner、Tooltip、Dialog、Alert、Badge、Toast、ScrollArea、ScrollBar |
| 输入与设置（16） | Button、IconButton、Checkbox、RadioGroup、Switch、Slider、TextField、TextArea、Select、Combobox、ToggleButton、SearchField、Tabs、NavigationList、SettingRow、KeybindingField |
| 物品与容器结构（27） | ItemSlot、ItemImage、ItemCount、DurabilityBar、ItemTooltip、InventoryGrid、PlayerInventory、WorkstationFrame、InventoryScreenFrame、RecipeGrid、RecipeSelectionGrid、RecipeSearch、RecipeFilterToggle、RecipeBook、RecipeBookEntry、RecipeCategoryTabs、InventoryToolbar、ProcessingArrow、FuelIndicator、BrewingIndicator、BeaconEffect、TradeOffer、ArmorSlot、ResultSlot、SlotPlaceholder、CrafterSlot、ContainerFrame |
| 工作站与容器（25） | Grindstone、EnchantingTable、CraftingTable、CraftingScreen、Furnace、BlastFurnace、Smoker、BrewingStand、Anvil、SmithingTable、Stonecutter、Loom、CartographyTable、Beacon、Chest、Hopper、Dispenser、Dropper、ShulkerBox、Crafter、TradingScreen、PlayerInventoryScreen、SurvivalInventoryScreen、CreativeInventory、MountInventory |
| 附魔部件（4） | EnchantmentOption、EnchantingRunes、EnchantingBook、ItemGlint |
| HUD（17） | Hotbar、HealthBar、HungerBar、ArmorBar、AirBar、ExperienceBar、BossBar、Crosshair、ChatMessage、ChatPanel、Scoreboard、StatusEffect、ActionBar、TitleOverlay、HeldItemTooltip、PlayerList、TouchControls |
| 页面与列表组合（10） | PauseMenu、SettingsPanel、WorldList、ServerList、PlayerCard、PackList、PackCard、DeathScreen、LoadingScreen、AchievementToast |

`EnchantingBook` 使用真实材质，默认视角和分面光照已通过本机无损 PNG 校准，网格及翻页仍是重建；`EnchantingRunes` 需要调用方提供原版字图集。已有部分工作站的同版本原生局部截图证据，完整状态与整屏差异仍需逐项核对。

`ItemGlint` 使用真实光效纹理和已核对的着色公式，接收显式 UV、颜色、采样与混合参数。`shadeItemGlint` / `renderItemGlint` 可用于自定义渲染流程；原生时间和 draw-state 仍未认证，组件不自行启动动画。

HUD 使用原始图像，生命 / 饥饿 / 护甲 / 氧气的行排列属于 custom renderer 的 Web 重建。制图台 description 的栈锚点与字体比例尚待原生校准；锻造装备预览接受调用方 renderer。这些限制独立于 PNG、JSON 与浏览器图像测试。

## 验收边界

当前目录中的 117 项均已提供组件，不代表穷尽所有游戏版本、平台或未来新增 GUI。游戏规则、世界 / 服务器数据、原生角色和特效 renderer、字体栅格及整屏动态状态仍有独立边界；源码、资源相同与 Web 测试通过不能替代真实游戏逐屏验收。

## 复用方式

按“原始材质和字体 → 基础控件 → 可复用 GUI 部件 → 完整 GUI”组织。完整 GUI 通过共享部件组合，保留各自原版坐标、纹理、焦点路径与交互状态。

例如熔炉、烟熏炉和高炉共享物品槽、结果槽、燃料指示、处理箭头和玩家物品栏；附魔台共享容器框、库存、物品槽、附魔选项、符文和书本。数量、耐久和物品图像从 ItemSlot 内部拆出后，也可以单独用于快捷栏和交易项。

BrewingIndicator 拆出箭头、气泡与燃料三种完整原图裁切；酿造台组合它们与五个槽位。现代三输入锻造台、制图台复用 ItemSlot、ResultSlot、WorkstationFrame 和 PlayerInventory。ScrollArea 将原生滚动视口与受控 ScrollBar 组合，保留触屏、滚轮和文本选择。

CraftingTable 与 PlayerInventoryScreen 保留可复用右面板；CraftingScreen / SurvivalInventoryScreen 分别组合配方书与合成 / 生存背包右面板，复用 InventoryScreenFrame 的 recipe-book / survival 工具条。公开 Frame 接收 book 与 children 两个 ReactNode 槽，两个布局均保留 326×166 game 外框；survival 仅隐藏书页并将右面板居中。内部 InventoryScreenFrameBase 不公开导出。

Furnace / BlastFurnace / Smoker 仍仅为原版熔炼右面板。原生熔炉 compact 会缩成 176 game 根宽，配方书还有无 count/group 的独立分支，不能套用这个固定宽度 Frame 冒充完整熔炉屏幕。上述完整合成 / 生存组合也不代表所有原生状态或整屏像素已经验收。

RecipeBook 接收宿主已筛选、展开的 entries 与受控 categoryId / query / craftableOnly，复用 RecipeSearch、RecipeCategoryTabs、RecipeFilterToggle 和 ScrollArea。RecipeBookEntry 将 craftableCount 与物品堆叠数量分开，背景 binding、group modifier 和 primary / secondary / tertiary 动作均由宿主提供；零 craftableCount 不清空物品，recipe 计算和分组展开不由组件猜测。

SmithingTable / CartographyTable 同样只包含原始主面板，关闭入口属于尚未提供的外部 toolbar。Hotbar 仅管理组件内部的焦点和激活，全局数字键 / 滚轮游戏输入由调用方绑定。

UI 组件接收物品、配方、进度、选择状态与操作回调；合成、交易、附魔等游戏规则由使用方提供。可机读状态见 [component-catalog.json](./component-catalog.json)，像素验收边界见 [FIDELITY.md](./FIDELITY.md)。

Stonecutter / Loom 共用 RecipeSelectionGrid 和原生滚动视口，旗帜 / 方块预览由调用方提供 renderer。CrafterSlot 将禁用槽恢复操作与普通物品操作分开；BeaconEffect 复用真实效果按钮，金字塔等级、有效选择和支付规则由调用方控制。

设置控件分别提供切换、搜索、导航、标签关联和物理键捕获；SettingRow 使用 render prop 将 id / aria / disabled 传给控件。Tooltip / Toast 使用原版图层，定位、关闭和计时属于明确的 Web 组合。聊天、标题与效果组件接收内容和可见状态，游戏网络、命令、计时及完整原生 renderer 不由组件库模拟。

WorldList / ServerList / PackList 共享原始列表图、Image、Button 与 ScrollArea；PackCard 和 PlayerCard 也能单独使用。SettingsPanel 组合 NavigationList 与保留挂载的内容页面，LoadingScreen 复用 Spinner / Progress，AchievementToast 复用 Toast 的稳定 live region。

BlockPreview / BannerPreview 使用 45 份官方原始 PNG / TGA 材质，网格、视角、光照和染色仍是可配置重建。bannerPatternIds（42 个原图 ID）、bannerDyeColors（16 个 Web 色彩预设）、loomPatternIds（原生截图观察的 32 个基础图案顺序）为三份数据导出；后者不作为跨版本 engine registry。

InventoryToolbar 将三种背包布局与帮助 / 关闭入口拆为独立受控组件；CreativeInventory 默认包含完整 chrome，可显式 chrome=none 保留 pane。DeathScreen 默认采用当前 HBUI source profile，classic 保留 JSON UI 版本；LoadingScreen 默认采用世界加载 modal，compact 保留原组合。字体与背景场景的边界分别记录。

PlayerInventoryScreen 的 needsCraftingTable 默认 false；显式启用时，由 craftingTablePreview 接入原生模型预览位置，不生成假工作台图或推算配方资格。
