# Bedrock 组件范围

当前导出 140 个组件，目录 140 项均为 implemented；另有 4 份数据（3份 renderer 数据与 guiIconNames 图标名称目录）、7 个纯函数（2个glint、4个layout / model几何与assembleGuiTextureAtlas纹理装配）及3个浏览器GPU函数（renderBitmapGlyphs / renderGuiImages / renderGuiLayer），共 154 个源运行时值导出；这些数据和函数不计作组件。这个数字是工作清单，不表示已经穷尽所有游戏版本中的 GUI。实现状态不等于整屏像素验收通过。

书写类新增 BookReader / BookEditor / BookPage / BookPageTurnButton 与 SignTextSurface / SignEditor。Book 的30项独立客户端合同、此前138值React18 /19消费及27项公开预览辅助检查保留其范围；Sign的29项客户端合同及140值新包已通过，旧Dialog12项与修后完整导航6项分别通过，公开预览50项辅助检查通过。首批旧导航失败与修复后的范围分别保留，不合称单轮全绿或增加重复用例。五份书本及普通 /悬挂牌面采集已保存，有限混排字页与两oak背景分析完成；产品整页原生像素核验仍待进行。使用与边界见 [BOOK_QA.md](BOOK_QA.md) / [SIGN_QA.md](SIGN_QA.md)。

后续正文度量 /编辑布局修订不新增runtime：Book editable逐页字体模式与Sign共用有限Han候选，恢复common居中 /clip分离和normal /large行距；Reader静态与签名title /author保持独立。25不同ASCII及26个宽字 /非ASCII共128正文实例的CPU quad关系相符、两caret仍各差1game。公开样本fallback促使补齐两demo字符，最终206字集完整79项（Book39 /Sign30 /Classic10）、React18 /19新包及37项公开辅助检查通过，整6项导航另通过；194批与公开首败保留，不重计相同用例。旧几何断言按源与native证据明确纠正，完整native DOM栅格仍未认证。

以下历史阶段的120组件 /134值验证保留原受测范围，不扩充为新增书写组件的验证：

Anvil阶段接入可选imageRender /三个profile类型、39槽及title /inventory /name /cost四独立文字角色，当时导出总数为120组件 /134runtime。28完整原PNG /29keys与本机私有字体用于正常source输入。有限host profile四GUI5状态完整native UI target RGBA0，首invalid40像素耐久残差保留；修后React18 /19包通过；Anvil35＋旧回归103按整文件GPU profile共138独立用例通过，生产首轮73辅助检查通过，各项证据保留受测范围，见 [ANVIL_IMAGE_QA.md](ANVIL_IMAGE_QA.md)。

本轮Grindstone新增imageRender及三个profile类型，runtime仍134、组件仍120。原frame / label / slot / item命令与ready-gated呈现提到私有shared helper，共用23完整原PNG / 24keys，旧18图字节不变。砂轮为39槽，有显式labels / itemImages / itemModels及原子CSS回退；字体用独立私有8页准备，不改变默认字体。首11合同共同漏掉close父布局，native300像素残差揭示后修正；修后22正式通过（11新＋11旧），旧附魔46项原profile回归、React18 / 19包与40项生产辅助检查通过。显式host原字体 / 投影 / dim .4背景的一个GUI5场景完整3,603,140像素native RGBA0；默认CSS仍有残差。见 [GRINDSTONE_IMAGE_QA.md](GRINDSTONE_IMAGE_QA.md)。

本轮source model新增layoutGuiModel / createGuiCuboidModel两个纯函数、GuiLayer `kind:'model'`与显式itemModels适配，含纯assembleGuiTextureAtlas后为10函数 / 134值，由React18 / 19实际包确认，组件数仍120。新source模型 / 显式projection不替换旧BlockPreview CPU renderer；验证范围及更广待验收边界见 [GUI_MODEL_QA.md](GUI_MODEL_QA.md)。

另已接入显式source atlas装配；它接受完整原PNG和调用方packing坐标，不接受native atlas作为普通输入，也不恢复自动packing。该固定GPU / actualGUI的验证范围单列，barrel源导出或实际包通过不代表更广像素认证。

本轮公开model / atlas正式17项与实际组件12项已通过；固定已观察GUI5 postUI完整target的source-atlas组合全帧RGBA0，standalone原PNG仍32非零。只认证显式host配置与该帧，不代表旧BlockPreview默认、全部camera / GUI / 动画已精确；实际包 / 生产65辅助检查与973多批累计分别记录。

## 已实现

JigsawEditor与可复用JigsawPriorityFields保留六字段draft和宿主验证 /操作边界；完整27项客户端合同与128 /142值React18 /19实际包消费已通过。优先级原wrapper16 /host32、joint Web映射与原生未验界限见 [JIGSAW_QA.md](JIGSAW_QA.md)，旧126 /140验证不扩写为该阶段结果。

CommandBlockEditor、CommandInput与CommandOutputPanel的source API见 [COMMAND_BLOCK_QA.md](COMMAND_BLOCK_QA.md)：分别复用完整表单、同一真实textarea展开及独立输出快照；Cancel /track两个body flag与Header Close分开，不执行世界命令或直接读取剪贴板。glyph tint修正后的33项客户端合同、新样式包实际消费及新公开61项辅助通过；80项书写回归 /6导航保留其未改源的原范围。原32 /公开02的61为before-tint历史，不重计旧批或转移为原生GUI认证。

StructureEditor与XYZVectorInput的source API及宿主预览 /raw draft边界见 [STRUCTURE_EDITOR_QA.md](STRUCTURE_EDITOR_QA.md)。当前133 /147实际React18 /19新包、Structure32＋Command34整66项、Book83与6导航、公开64辅助分别通过；首批失败与历史范围保留，不重计相同用例，也不以原图 /静态源或SSR替代原生验收。

ServerActionForm /ServerCustomForm的source API与typed schema范围见 [SERVER_FORMS_QA.md](SERVER_FORMS_QA.md)。它们对应LongForm /CustomForm，区别于ServerList，不提供第三MessageForm或后端协议；第四完整37项与当时149值实际消费者通过，Book85 /6导航及公开64辅助各保范围。该阶段覆盖表仅更新server_form一个源族，不将相同row /field模式视为全部服务端协议恢复。

NPC新增NpcPortrait /NpcSkinPicker /NpcActionEditor /NpcDialogue /NpcEditor五个组件，source与宿主边界见 [NPC_QA.md](NPC_QA.md)。第二完整44项客户端合同、154值React18 /19实际新包及56项公开辅助通过；旧ServerForms37项与6导航另通过，首37 /7失败与修复范围保留。本次覆盖表仅npc_interact_screen.json从E更新为有限A，其他205行不变；人物renderer、student原生content sizing和整页像素仍未认证。

| 分类 | 组件 |
| --- | --- |
| 文字与表面（21） | Text、BitmapText、PixelIcon、GuiIcon、Image、NineSlice、GuiImageLayer、GuiLayer、BlockPreview、BannerPreview、Panel、Separator、Progress、Spinner、Tooltip、Dialog、Alert、Badge、Toast、ScrollArea、ScrollBar |
| 输入与设置（16） | Button、IconButton、Checkbox、RadioGroup、Switch、Slider、TextField、TextArea、Select、Combobox、ToggleButton、SearchField、Tabs、NavigationList、SettingRow、KeybindingField |
| 物品与容器结构（27） | ItemSlot、ItemImage、ItemCount、DurabilityBar、ItemTooltip、InventoryGrid、PlayerInventory、WorkstationFrame、InventoryScreenFrame、RecipeGrid、RecipeSelectionGrid、RecipeSearch、RecipeFilterToggle、RecipeBook、RecipeBookEntry、RecipeCategoryTabs、InventoryToolbar、ProcessingArrow、FuelIndicator、BrewingIndicator、BeaconEffect、TradeOffer、ArmorSlot、ResultSlot、SlotPlaceholder、CrafterSlot、ContainerFrame |
| 工作站与容器（25） | Grindstone、EnchantingTable、CraftingTable、CraftingScreen、Furnace、BlastFurnace、Smoker、BrewingStand、Anvil、SmithingTable、Stonecutter、Loom、CartographyTable、Beacon、Chest、Hopper、Dispenser、Dropper、ShulkerBox、Crafter、TradingScreen、PlayerInventoryScreen、SurvivalInventoryScreen、CreativeInventory、MountInventory |
| 附魔部件（4） | EnchantmentOption、EnchantingRunes、EnchantingBook、ItemGlint |
| HUD（17） | Hotbar、HealthBar、HungerBar、ArmorBar、AirBar、ExperienceBar、BossBar、Crosshair、ChatMessage、ChatPanel、Scoreboard、StatusEffect、ActionBar、TitleOverlay、HeldItemTooltip、PlayerList、TouchControls |
| 页面与列表组合（10） | PauseMenu、SettingsPanel、WorldList、ServerList、PlayerCard、PackList、PackCard、DeathScreen、LoadingScreen、AchievementToast |
| 书本与告示牌（6） | BookReader、BookEditor、BookPage、BookPageTurnButton、SignTextSurface、SignEditor |
| 源表单编辑（7） | JigsawEditor、JigsawPriorityFields、CommandBlockEditor、CommandInput、CommandOutputPanel、StructureEditor、XYZVectorInput |
| 服务端表单（2） | ServerActionForm、ServerCustomForm |
| NPC对话与编辑（5） | NpcPortrait、NpcSkinPicker、NpcActionEditor、NpcDialogue、NpcEditor |

`EnchantingBook` 的mesh、UV及着色路径现来自实际Bedrock GUI书本draw；显式 `rendererState` 的已捕获打开姿态在测试NVIDIA后端与完整API-after target零RGBA差。默认open/pageFlip仍是受控重建，native CPU动画、其他姿态和完整GUI不由这一draw认证；旧Java/候选照明与PNG数字保留为历史。实际PSO795着色程序不等于旧Entity/MeshFallback文件字节，材质字符串名仍未知。`EnchantingRunes` 需要调用方提供原版字图集。

`GuiImageLayer` 接收实际物理frame、guiScale与已求值GLOBAL rect，按源image / nine-slice几何和UI/Blit GPU profile绘制；layoutGuiImages为无GPU几何函数，renderGuiImages为有GPU副作用的函数。outputRect只截取输出，不改变全frame投影；不是JSON布局引擎或响应式DOM替代。底层16项和附魔台集成13项已验证，实际包 / 生产亦通过；完整GUI仍非零，implemented不代表原生整GUI认证。见 [GUI_IMAGE_QA.md](./GUI_IMAGE_QA.md)。

`GuiLayer` 将有序 image / text 源命令绘制到同一RGBA8目标；新增纯文字几何函数layoutGuiText与浏览器GPU函数renderGuiLayer。字体页、glyph度量、GLOBAL paint origin、采样、shader及颜色由宿主明确提供；prepared内部接口不公开。EnchantingTable可选imageRender.text接入同层文字，默认CSS与旧GuiImageLayer / BitmapText不变。公开源输入 / GPU / React正式17项已通过；固定绘制阶段的完整目标为RGBA零差，实际附魔台完整ROI仍有10,155 / 747,600像素不同。组件与发布验证分别记录，不能据此称整GUI零差。见 [GUI_LAYER_QA.md](./GUI_LAYER_QA.md)。

本轮同一GuiLayer另增 `kind:'sprite'` 与GuiSpriteGeometry类型，复用image几何并声明RGBA8顶点颜色；UI/Sprite Transparent的顶点alpha只选ceil分支，不是透明度。EnchantingTable可选 `imageRender.itemImages` 接普通物品PNG，自定义icon / 3D保持宿主DOM；展示scale在支持时采用布局zoom。公开shader13项与实际组件11项分别通过；完整ROI当前4,928 / 747,600像素仍不同，仅在三格3D hotbar，整GUI未达零差。实际包 / 生产验证另列；组件 / runtime计数不变。见 [GUI_SPRITE_QA.md](./GUI_SPRITE_QA.md)。

`GuiIcon` 提供150张完整原版 PNG，guiIconNames 为第4份数据导出；按原图尺寸整数缩放，默认装饰，可显式命名。它保留原字节，不自动切换状态、tint或套用原生使用框；旧16个 PixelIcon 保持兼容。来源 / 状态 / 使用引用见 [gui-icons.json](./gui-icons.json)，素材一致不代表整GUI验收。

`BitmapText` 默认 `renderer="cpu"` / `profile="atlas-rect"` / `layout="visual"`；可选advance逻辑占位保留视觉外溢，费用宿主需明确display:block以避开inline strut；工作站renderText保留canonical原文，见 [WORKSTATION_TEXT_QA.md](./WORKSTATION_TEXT_QA.md)。显式 WebGL 支持 atlas-rect 与 bedrock-unicode 完整字格 profile，background 为 GPU clear 色。公开 `renderBitmapGlyphs` 接收原始页及顺序 runs，默认返回预乘 framebuffer 数据；它需要 GPU，属于有副作用的函数。真实捕获8个 draw 的固定背景复现不等于透明 DOM 或默认 CPU 认证；webgl 每实例独立 context，新增 webgl-shared 在同一 Document 内复用 Offscreen WebGL 会话并向每实例 bitmaprenderer 转移 ImageBitmap。两者仍有设备与 bitmap 预算限制，共享路径的新验收范围单列。见 [BITMAP_GPU_QA.md](./BITMAP_GPU_QA.md) 与 [BITMAP_SHARED_QA.md](./BITMAP_SHARED_QA.md)。

`ItemGlint` 使用真实光效纹理和已核对的着色公式，接收显式 UV、颜色、采样与混合参数。`shadeItemGlint` / `renderItemGlint` 可用于自定义渲染流程；原生时间和 draw-state 仍未认证，组件不自行启动动画。

HUD 使用原始图像，生命 / 饥饿 / 护甲 / 氧气的行排列属于 custom renderer 的 Web 重建。制图台 description 的栈锚点与字体比例尚待原生校准；锻造装备预览接受调用方 renderer。这些限制独立于 PNG、JSON 与浏览器图像测试。

## 验收边界

当前目录中的 140 项均已提供组件，不代表穷尽所有游戏版本、平台或未来新增 GUI。游戏规则、世界 /服务器数据、原生预览与特效 renderer、字体栅格及整屏动态状态仍有独立边界；源码、资源相同与Web测试通过不能替代真实游戏逐屏验收。

[完整GUI覆盖清单](BEDROCK_GUI_COVERAGE.md) 提供全部206个实际UI文件、198个声明screen root /128个相关文件、八种文件状态与13个命名族缺口。140组件与26个scoped命名源文件均不等于完整原生GUI数量；共享 /可选 /未知文件也不自动要求新建组件。

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

Select / Combobox 共用内部 ComboboxBase 的 Classic trigger / popup，Select 保留 HTMLSelectElement ref、原生 onChange 和 form / reset / required / multiple。Dialog 的 width / height 为 border-box 尺寸，style 优先；显式高度解除默认 maxHeight，root / body 默认 clip，长内容由调用方显式嵌入 ScrollArea。附魔经验粉保留三档不同的原版13×11轮廓，CSS26×22；六状态原图对照不等于原生整屏认证。详见 [CONTROLS_CONSISTENCY_QA.md](./CONTROLS_CONSISTENCY_QA.md)，Select / Dialog 本轮正式结果按首批与取景修正后的定向复跑记录，不称单次全绿。

设置控件分别提供切换、搜索、导航、标签关联和物理键捕获；SettingRow 使用 render prop 将 id / aria / disabled 传给控件。Tooltip / Toast 使用原版图层，定位、关闭和计时属于明确的 Web 组合。聊天、标题与效果组件接收内容和可见状态，游戏网络、命令、计时及完整原生 renderer 不由组件库模拟。

WorldList / ServerList / PackList 共享原始列表图、Image、Button 与 ScrollArea；PackCard 和 PlayerCard 也能单独使用。SettingsPanel 组合 NavigationList 与保留挂载的内容页面，LoadingScreen 复用 Spinner / Progress，AchievementToast 复用 Toast 的稳定 live region。

BlockPreview / BannerPreview 使用 48 份官方原始 PNG / TGA 材质，其中新enchanting-table预设使用三原PNG、12高与侧UV crop；网格、视角、光照和染色仍是可配置重建，原生相机未认证。bannerPatternIds（42 个原图 ID）、bannerDyeColors（16 个 Web 色彩预设）、loomPatternIds（原生截图观察的 32 个基础图案顺序）为三份数据导出；后者不作为跨版本 engine registry。

InventoryToolbar 将三种背包布局与帮助 / 关闭入口拆为独立受控组件；CreativeInventory 默认包含完整 chrome，可显式 chrome=none 保留 pane。DeathScreen 默认采用当前 HBUI source profile，classic 保留 JSON UI 版本；LoadingScreen 默认采用世界加载 modal，compact 保留原组合。字体与背景场景的边界分别记录。

PlayerInventoryScreen 的 needsCraftingTable 默认 false；显式启用时，由 craftingTablePreview 接入原生模型预览位置，不生成假工作台图或推算配方资格。
