# 视觉基准与还原边界

主要基准为 Minecraft: Bedrock Classic / JSON UI；当前死亡页另按安装版实际使用的 HTML UI 分支实现，显式保留旧 Classic 配置。当前已有可独立复验的控件表面和字体像素证据，整页游戏画面对照仍在进行中。

当前公开117个组件、3份数据及2个函数，共122项值导出。新增共享 InventoryScreenFrame 与完整 SurvivalInventoryScreen；历史阶段的组件数量及验证结果仍按各自范围保存，不能作为本轮原生整屏验收结论。

## 本轮物品提示与附魔光效

`ItemTooltip` 已取得同物品两次悬停及无提示底图三张原生无损 PNG。配对测量支持实心背景 `#1b0c1b`、平色紫边 `#2c0863`、10game 行推进和阶梯轮廓；现按这些证据重建三层轮廓，取消未观察到的默认灰文字阴影和自动耐久文案。鼠标跟随、键盘槽锚点与屏幕避让为显式 Web 行为。padding8px、CSS光标偏移和字体仍是候选；原生部分覆盖边缘、中文栅格与整提示框未达零差，不能把核心色 mask 零差扩大为完整画面零差。见 [ITEM_TOOLTIP_QA.md](ITEM_TOOLTIP_QA.md)。

`ItemGlint` 使用原始 item glint PNG，以及本机 UIGlint SM4/SM5 中独立核对的双层 UV 和着色公式。UV、颜色、采样器、混合必须显式给定，没有默认时钟或自动 `enchanted` 绑定；原生宿主时间与实际 draw-state 仍未知。独立字节码解释器的 544 组数值、96 张完整 RGBA 输出已核对，浏览器半透明 Canvas 存储的1LSB差异也单列记录，没有反调公式抹去差异。详见 [ITEM_GLINT_QA.md](ITEM_GLINT_QA.md)。

## 耐久条的源声明与原生观察

`common.durability_bar` 声明 `12×1` game、中心偏移 `[0,5]` 与 `drop_shadow/is_durability/round_value=true`，没有给出颜色或 current/total 算法。本机 Classic GUI5、100%、AA16 的五木剑原始 PNG 支持最大 `12×1` 前景和 `13×2` 黑包络，右侧、下方各多 `1` game；Web 只据此补齐可见包络，不反推原生内部 shadow 图层。

五把木剑的只读 Script API 已确认实际 damage=1/15/30/45/58、maxDurability=59；几何前景宽为 12/9/6/3/0 observed game，前四个核心 RGB 分别为 9,255,0 / 130,255,0 / 255,251,0 / 255,121,0。纯色核心不含边界混色列，不能用其像素数代替几何宽度；最后一个样本无饱和彩芯，不排除亚像素或完全遮挡前景。

独立审计以 `r=(59-damage)/59` 和连续 `H=120r` 得到四组 Chromium Canvas 核心 RGBA 匹配；旧整数 hue 预取整只匹配一组，M60 连续候选匹配零组。Web 据此取消 hue 的整数预取整。最近整数的 `12r` 宽度匹配五组，但 M59/M60 的这五个宽度相同，且 M59 整数 damage 不命中半宽 tie；不能将 API max 等同 renderer 分母，或称通用颜色/取整算法已恢复。源逻辑 y=13.5game 保留，不能将截图地标 68/5=13.6 当成新 offset。完整证据和限制见 [NATIVE_DURABILITY_QA.md](NATIVE_DURABILITY_QA.md)；不把有限核心匹配扩大为 HUD/Pocket、其他物品/GUI scale 或整图 RGBA 零差认证。

## 参考与版本

固定 Mojang 官方 [bedrock-samples commit 46ba6ea](https://github.com/Mojang/bedrock-samples/tree/46ba6ea985fb5a92d79a9419198f10dda14c199d)，资源版本 `1.26.50.4`。另只读解析本机 Bedrock `1.26.6005.0` 的 JSON UI 与纹理归档：131 个相关 UI PNG / JSON 条目与固定参考一致，差异 0。安装版本、归档 SHA256、原版布局事实见 [local-reference.json](local-reference.json)。另将官方 v1.26.60.5 full release 的 4 份工作站相关 UI JSON 与本机逐份核对，解析后完全相同；原始 SHA 见 workstation-geometry.json。这只证明所比较的条目一致，不代表全部资源或整套游戏 UI 一致。

UI 原始对照图缓存于忽略目录 `.cache`。97 个重建皮肤的来源、尺寸、九宫格参数和 SHA256 见 [classic-skins.json](classic-skins.json)，嵌入式 PNG 由 `scripts/prepare-classic.py` 生成。展示物品与可选书本另用真实 PNG，来源权利说明见 THIRD_PARTY_NOTICES.md。

## 已校准细节

采用 GUI 2 倍的整数 CSS 像素基准，DPR=1。原版 10×10 的 checkbox / 方形 radio 显示为 20×20；switch 30×16 显示为 60×32；滑块拇指 10×16 显示为 20×32。九宫格填充与纹理均使用 pixelated 采样。

| 控件 | 对照依据与状态 |
| --- | --- |
| Button | 原始 4×4 九宫格；灰底 #c6c6c6、高光 #f7f7f7、暗边 #656465；绿色 hover、pressed 反向倒角、白色交互外框、disabled；按压文字下移 2 CSS px |
| TextField / TextArea | edit_box_indent 6×6、slice=2；4px 凹陷边，内部 #5e5e5e，顶暗边 #464446、底亮边 #b2b2b2；hover / focus 白框；readonly 保留表面，disabled 半透明 |
| Checkbox / Radio | 原始默认、选中、hover 皮肤；选中 checkbox 为白底深色勾，radio 为方形 |
| Switch | 灰色常态、绿色 hover，I/O 标记和拨片按原始像素；禁用半透明 |
| Tabs | 常态选中为灰色凹陷；hover / focus 才变绿；选中标签下移 2px |
| Combobox | 30 游戏像素高触发器、原始箭头；未选中 #6e6e6e、已选中 #4a4a4a、活动项 #1e7a00；活动与已提交选择独立；方形 radio；展开层越过裁剪 |
| ItemSlot | 改用 common.container_item 的 cell_image，36×36 槽位、32×32 物品区。该 PNG 为 10×10，但逻辑 base_size 为 5×5；源 slice=2、显示边宽=2px。选中用蓝色 recipe_book_touch_cell_selected；悬停用 80% highlight_slot，位于物品图下；键盘焦点用 focus_border_white。0 为空、1 隐藏角标，数量采用硬边阴影 |
| Slider | 原始灰色 / 绿色拇指表面；整个 track 和 fill 组合布局尚未独立逐像素验收 |
| Panel | common.dialog_background_opaque 16×16、slice=4；8px 九宫格、浅灰底与阶梯倒角；inset 采用 edit_box_indent；文字按浅灰底使用 #4c4c4c |
| Dialog | common.dialog_background_hollow_3 18×33，九宫格 [left=8, top=23, right=8, bottom=8]；GUI 2 的标题区域 46px、侧边 16px；#090909 内部，50% 黑色遮罩；标题采用原始 [9,9] 游戏像素偏移；关闭命中区 42×42、图像 30×30，default / hover / pressed 使用原始三张皮肤 |
| Progress | common.progress_bar 的 5 游戏像素高灰色纹理；GUI 2 高 10px。完整宽度的填充纹理按进度裁切，不把填充纹理缩到百分比宽度；Web 实现按 2 CSS px 向下取整裁切边界。空、半满、全满、小数和窄屏均有独立原图合成对照 |

51 个皮肤状态及 5 个进度合成状态直接与独立读取的原始 PNG 九宫格渲染比较，要求 RGBA 差异像素为 0。透明度由独立原图图层对照浏览器合成结果。图像、差异图和计数保存到 `.cache/pixel-comparison`。表面测试隐藏文字，不把它算作文字校准。Dialog 的框架、关闭图像通过不代表所有内容排版已逐像素验收。

## 工作站与容器

砂轮与附魔台读取本机 grindstone_screen.json / enchanting_screen.json。共同外框为 176×166 游戏像素；背包 27 格和快捷栏 9 格，GUI 2 下宽 352、高 332 CSS px。砂轮输入 / 结果 / 箭头的位置由 JSON 的嵌套锚点换算。附魔台选项保留原始百分比推导的 [123.2,28.2,212.8,121.6] CSS px，不再任意取整，补齐凹陷框、dust / rune / cost 的源偏移和原色。容器关闭按钮归位，附魔台使用原版紧凑关闭皮肤；空结果保留源方向键焦点关系。

砂轮箭头、附魔选项默认 / hover / disabled 表面已有原始 PNG 独立对比。附魔表面 fixture 使用规范整数尺寸 216×38，仅证明皮肤解码 / 九宫格；它不替代 main 中浮点放置的未遮罩组合。另有 9 项独立源几何 / 材质 / 字距 / 导航检查，不以生产 CSS 或皮肤 manifest 反推期望。两类证据都不证明游戏 renderer 的最终像素取整。完整工作站仍待同版本 / 状态的游戏截图对比。

已删除手绘物品、假 glint 和默认书图。展示页采用官方 v1.26.60.5 full 的 26 张真实物品 / GUI PNG；逐项与本机 59 个 vanilla 目录中的基础包及版本覆盖候选比较。此前把基础包钻石剑作为最终 runtime 材质的结论已撤回：基础包与 merged 图有 22 像素差异，1.16 / 1.21.90 中存在与 merged 相同的图，但候选存在不证明运行时包激活。完整记录见 item-materials.json。SGA 原图字形 AIZ 与独立图集栅格比较 0 差异；图集不随 npm 分发。EnchantingBook 使用真材质，已修正厚页块与 UV，并参考官方 Java BookModel 的七部件结构重建；Bedrock native mesh 仍未获取；已用本机 26.60 的打开 / 关闭无损截图校准默认相机仰角与分面光照，但完整书本区域仍有残差，明确属于重建，不列入 native pixel-perfect 结论。ItemTooltip 与耐久条已有上述局部原生观察；数量基线、耐久颜色/数值算法和 disabled renderer 仍待校准。

工作台从 inventory_screen.json 的 work_bench_panel_3x3 推导，熔炉 / 高炉 / 烟熏炉从炉子源面板及其继承推导。已拆出 RecipeGrid / ProcessingArrow / FuelIndicator / ResultSlot；52×52 结果槽中的物品保持 32×32。炉子输入 y=29、燃料 y=105、结果 y=59 CSS px，保留源半游戏像素位置。CraftingTable 继续提供右面板；CraftingScreen 组合 RecipeBook、书脊、双模式 InventoryToolbar 和该右面板，保留326×166逻辑根及收起布局75像素留白。RecipeBookEntry 使用宿主提供的原始背景、分组角标与独立可合成数量；红背景不等于禁用。完整组合来源和原生对照见 [CRAFTING_SCREEN_QA.md](CRAFTING_SCREEN_QA.md)。原右面板源推导及12项独立检查见 [PROCESSING_QA.md](PROCESSING_QA.md)。其中6个箭头 / 火焰裁切状态与原始PNG独立浏览器控制样本RGBA零差，只证明Chromium合成，不替代引擎ratio与裁切量化验收。

生存背包与工作台的源screen选用同一个固定326×166外层，现共用 InventoryScreenFrame；SurvivalInventoryScreen 组合配方书和既有 PlayerInventoryScreen。两布局都保留固定根，survival右面板位于x75；熔炉compact会缩根至176，且book的count/group分支不同，不能用相同Frame冒充。needsCraftingTable显式状态的renderer位置来自源锚点推导，未提供模型时保留空区域，不根据输入猜测。新增22项及相关109项同批合同检查通过，仍非native整图认证，见 [SURVIVAL_INVENTORY_QA.md](SURVIVAL_INVENTORY_QA.md)。

附魔经验主色与右下锚点来自原 JSON；本机 26.60 无损截图确认成功字色 #7fff1f / 阴影 #204008，失败字色 #895e5b / 阴影 #221717，已修正归一化颜色四舍五入造成的色阶偏差。GUI 5 的可见阴影偏移为 [5,5] 物理像素，对应当前 GUI 2 的 [2,2] CSS 像素；这证明该状态的颜色与位移，不推断引擎通用暗化算法。青金石槽使用不额外淡化的原始 lapis_image，在空槽与有物品时都保留于物品图下层。书本由无厚度平面改为完整封面、书脊、厚页块和翻页结构；目前开合 / 翻页控制、WebGL 正常工作检查与原生 Bedrock 像素验收仍是不同证据层级。

容器和铁砧的原始依据分别在 [container-geometry.json](container-geometry.json) 与 [anvil-geometry.json](anvil-geometry.json)。ContainerFrame 按实际高度锚定玩家物品栏，保留漏斗 176×133、普通箱 176×166、大箱 176×220 游戏像素规格；容器 8 项与铁砧 10 项独立检查覆盖逐格布局、原始浮点坐标、费用状态和焦点路径。铁砧 4 个素材样本与原 PNG 在同一 Chromium 的独立采样平面 RGBA 零差，不替代原生引擎吸附或整屏截图。

Image / NineSlice 将 sourceSize / slice 的物理像素与 destinationBorder / size 的逻辑像素分开，7 项检查包含 6 个完整原 PNG 采样区域零差。调用方样式覆盖、非整数屏幕原点、浏览器合成以及任意资源不由这些固定样本认证；依据与限制见 [image-geometry.json](image-geometry.json)。

## 高级工作站、HUD 浮层与设置控件

新增 Stonecutter / Loom 的326×166游戏像素双面板、Beacon 256×219面板和Crafter Classic红石面板，拆出RecipeSelectionGrid、BeaconEffect、CrafterSlot；31张独立原PNG与6份源JSON的依据见 [advanced-workstations-geometry.json](advanced-workstations-geometry.json)。新拍的GUI 5无损原生PNG揭示了“内容能放下就隐藏滚动条”、7列图案居中和fold背景在面板边框下层的运行时细节；修正不以改变原始图片掩盖。合成器enabled/disabled槽位、付款图和信标主要布局另有局部实拍复核，仍未声称整个页面RGBA零差。

BossBar、ChatMessage / ChatPanel、Scoreboard、StatusEffect、ActionBar、TitleOverlay、HeldItemTooltip保留原纹理、显式透明度与阴影参数。独立完整图比较包含文字及溢出阴影；Title字号和阴影使用公开的Web字体配置合同，不把native extra_large / large枚举擅自映射成已证数字。StatusEffect HUD排列仍属custom renderer重建；native默认运行时alpha / 淡出计时未提取。详见 [HUD_OVERLAYS_QA.md](HUD_OVERLAYS_QA.md)。

ToggleButton / NavigationList保留普通选中灰色凹陷、hover / focus绿色和禁用状态；SearchField采用真实magnifying_glass / close_X_button及原输入框；KeybindingField使用text_label_box和undoArrow，标签白色来自generic_button_text_color；SettingRow拆出源label / description / control结构。宿主按键映射、冲突策略、取消reset事件处理属于Web行为，和原生输入引擎规则分开记录，见 [SETTINGS_CONTROLS_QA.md](SETTINGS_CONTROLS_QA.md)。

Spinner使用原loading_spin十帧 / 10fps，Button.loading复用同组件；通用Tooltip与Toast有真实焦点 / 触屏 / Dialog关闭层级和可控生命周期。Tooltip通用源背景与inventory物品tooltip renderer仍是不同范围，Toast的Web可访问性暂停 / 最短显式时长不是原生计时证据；见 [feedback-geometry.json](feedback-geometry.json)。

## 字体与 shadow

- npm 默认英文为 MCBE Pixel，基于 OFL Monocraft v4.2.1，原始轮廓和字宽不变，重命名并增加 COLR v0 前景色图层。18px 使字体像素网格落在整数坐标。它仍是等宽替代字体，与 Mojangles 字宽不同。
- 中文默认为 MCBE CJK，基于 Fusion Pixel 12px proportional zh_hans 添加前景色 COLR 层、重命名并保留原始轮廓与字宽；原始上游 WOFF2 和许可仍保留。示例采用 24px，另检查中文字形和阴影没有彩边或半透明边缘。未声称它匹配游戏中文字形。
- 本地预览使用用户自有 Mojangles：原始 SHA256 `3d4cdf2752075d28c6ebf0ba44a61157ec6eb38f8db0ebdc3205aec056760be5`，1000 units/em，250 个 Unicode 映射，原版比例字宽；按 20px 使用。COLR 包装保留轮廓与 advance，避免本机 Chromium / Windows 上观察到的彩边。原版字体及转换结果不进入 npm 包。
- 独立脚本从原始 TTF 轮廓按非零环绕规则栅格化 “Minecraft”，不读取网页截图生成期望图。浏览器 Text 无阴影、Text 带 2px 阴影、Input 带 2px 阴影均与该栅格逐像素相等。advance=96px，带阴影墨迹范围为 96×16。证据在 `.cache/font-oracle`。
- 按本项目需求，Text / Input / 常用控件默认启用无模糊硬边文字阴影。原始 Classic new_button_label 模板的 shadow=false，因此这里属于明确的可配置偏好；可用 `Text shadow={false}`、`--mc-text-shadow: none`、`--mc-dark-text-shadow: none` 关闭。字号与阴影采用整数像素，不做平滑 scale 动画。

## 尚待验收

`BitmapText` 新增调用方字图、逐字 advance / offset 与显式 point / bilinear、Bitmap / BitmapSmooth 配置，物品提示可通过 `tooltipTextRenderer` 复用。已测中文在本机基础 Unicode 原页中找到相同字形设计，公开 Fusion / Noto 回退不能冒充这些原字形。原页仅用于本机可选样本，不进入库包；该10字符样本不是完整 Unicode 字体。具体来源与测量见 [NATIVE_BITMAP_FONT_QA.md](NATIVE_BITMAP_FONT_QA.md)。

实际组件完整字段比较：GUI4严格差异1314/15520像素，GUI5 A/B均1573/24300像素；另加2px halo后分别1444/16632及1573/25688。GUI5在`.75`覆盖代理阈值各有5处不一致。原生布局合同测试只认证已观察到的`.25/.5`分类及GUI4额外`.75`分类。最初“三阈值全零”假设的失败被保留；合同通过不能改写为原生覆盖率或RGBA零差。未将诊断滤镜、拟合偏移或未证blend带入生产。ready透明DOM文字层另已修复继承CSS阴影导致的幽灵字，显式canvas阴影仍由调用方配置。

Alert、Badge、部分扩展状态以及 Panel / Dialog 的任意内容排版仍包含本项目的布局和配色选择。Progress 目前采用 common.progress_bar 模板，游戏生成世界页面使用的自定义绿色 renderer 是另一个模板。展示页是组件文档，小岛和项目图标为原创插画，物品使用真实 PNG，未复刻某个完整游戏页面。独立控件对照通过不等于整套游戏全界面零偏差。

2026-10-29 已在本机 1.26.6005.0（界面显示 26.60）、简体中文、Classic GUI 5、新建单人测试世界取得附魔台打开 / 关闭 / 经验不足三张原始无损 PNG（2568×1400）。通过 Alt+PrintScreen 原始剪贴板图像存为 PNG；普通自动截图接口返回 JPEG，仅用于定位，不参与颜色验收。截图 SHA 与未遮罩区域比较见 [enchanting-renderer.json](enchanting-renderer.json) 和 [ENCHANTING_QA.md](ENCHANTING_QA.md)。书本区域仍非零差，整个附魔台及其他工作站的原生逐像素验收继续列入 GOAL。浏览器证据覆盖 Chromium 桌面 / 手机模拟，真实设备、Firefox / Safari、其他 DPR 与系统缩放仍待验证。

## 复验

`npm test` 会缓存固定参考并运行桌面 / 手机交互、无障碍、源 PNG 合成、源布局、字体和渲染器检查。新增酿造、锻造、制图、滚动区及 HUD 独立证据分别见 [BREWING_QA.md](BREWING_QA.md)、[SPECIAL_WORKSTATIONS_QA.md](SPECIAL_WORKSTATIONS_QA.md) 与 [HUD_QA.md](HUD_QA.md)。原版字形、SGA、原版 advance 与原生 PNG 检查需要用户自有资源；缺少时相应项目明确跳过。字体准备步骤见 README。

可选工具：`python scripts/prepare-classic.py` 重建皮肤，`python scripts/read-local-ui.py` 读取已安装游戏布局事实，`python scripts/prepare-pixel-font.py` 生成 COLR 字体，`python scripts/prepare-font-oracle.py` 生成原始轮廓期望图。普通消费和构建无需 Python 或本机游戏。

## 第三轮原生页面与材质对照

新增世界 / 服务器 / 玩家 / 资源包列表、玩家和创造库存、交易和坐骑容器、玩家列表 / 触控 / 暂停 / 死亡页、设置 / 加载 / 成就组合，以及 BlockPreview / BannerPreview。InventoryToolbar 将创造库存右上方的模式 / 帮助 / 关闭操作单独复用。组件导出和原生完整页面认证仍分别计数，不能因目录全部 implemented 就宣布目标完成。

本轮新增原始剪贴板 PNG 均为本机 1.26.6005.0、GUI 5、2568×1400，只保留在忽略缓存；普通自动化 JPEG 不用于颜色基准。样本包含暂停、死亡、玩家 / 创造库存、石头 / 石砖 / 台阶 / 楼梯和白旗加红色图案。`world-loading-state-native-lossless.png` 是过渡帧，左侧仍有上页残留，只支持可见中央加载区域；`save-exit-state-native-lossless.png` 已进入世界列表，不能冒充保存中画面。名为 `loom-white-red-stripe-native-lossless.png` 的图实际选择 stripe_right，依图案和原始掩码匹配确认，不按文件名推断 center。

另在暂停 / 死亡保存图外围发现固定灰白条纹和底角 RGB 标记。保存 PNG 的尺寸尚不能直接等同游戏客户区尺寸，需进一步核实剪贴板位图范围与 Paint 粘贴原点；没有把这些外围像素擅自当成 OS 边框裁掉，也没有据此消除死亡页尚未认证的 1px 位移。当前材质 / 库存测量采用明确登记的完整控件 ROI，不能扩展为整帧客户区认证。

后续已用新建并确认的 1×1 Paint 空画布重复粘贴，仍得到2568×1400对象和相同多像素边缘标记，因此排除旧大画布残留这一解释；仍未确定其是否属于客户区外框或采集路径标记。独立系统浏览器路径未完成，没有把不成功的第二路径当成验证结果。过程、固定字节和PNG哈希见 [native-capture-audit.json](native-capture-audit.json)。

原生死亡页稳定截图显示旧 `death_screen.json` 布局与实际页面不一致。只读审计安装版 HTML UI 的 gameplay JS / CSS，找到原生死亡路由、32rem 列宽、间隔比例、颜色以及 Minecraft Ten / Seven 字体声明；新默认配置据此实现，`variant="classic"` 保留原 JSON 配置。原始私有 bundle、字体和原生截图不随库分发。本机字体桥另外接入 Ten / Seven / Noto Sans SC；公共回退字体的字形差异仍然存在，相关哈希与限制见 [local-hbui-fonts.json](local-hbui-fonts.json) 和 [game-controls-geometry.json](game-controls-geometry.json)。不能把 HTML UI 与 Classic 的文字阴影和按钮规范混为同一组令牌。

加载页依据 `progress` 的原版 modal / fancy loading bars 分支补入真实灰框、内层、绿色图集与标题图，原紧凑组合单独保留。世界全景由宿主提供；没有用手绘背景替代游戏渲染。库存原图检查另修复 preview border 的中心 fill、交易禁用底图的浏览器零切片绘制问题、经验条对应 DOM 图层选择，以及创造库存的标题对齐、搜索宽度和网格居中。世界缩略图的 `%y` 应从自身高度求宽度，早期按父高度的推导已撤回。

BlockPreview / BannerPreview 的 45 份 PNG / TGA 保持原始字节，解码保留 175 / 176 等半透明 alpha，旗帜图案直接使用原始 UV 与掩码。软件网格、相机、光照和染色属于可配置重建；本轮真实截图用于训练和保留样本测量，非零残差必须报告为 NOT EXACT。单个台阶另有无数量角标的新原生样本；旧结果槽数量 2 遮挡不能全部归咎于材质误差。完整证据与独立测量见 [item-renderers-geometry.json](item-renderers-geometry.json) 和 [INVENTORY_SCREENS_QA.md](INVENTORY_SCREENS_QA.md)。

## 附魔照明与符文后续修正

本机 Entity / MeshFallback 顶点 DXBC 的算术依赖提供候选照明系数；在明确的白光 / 强度1 / overlay0假设下，用同一公式替换书本经验权重。材质、UV、模型与相机不变，完整200×165区域的RGB MAE由关闭0.176596→0.165404、打开0.415081→0.343333，差异像素分别1281→656、2239→1683。两个状态都是已知校准样本，不能称盲测；原生材质绑定、uniform、网格、1px宽度差与光栅边界仍未恢复。MSAA、全局LINEAR与高倍降采样在现样本上更差，没有为降低个别误差而启用。

符文默认主色改为原生打开 / 经验不足六行共同确认的104/93/73，即#685d49；关闭无字作为负控。宿主颜色覆盖保留，AIZ原图集在Web的整数展开仍为零差；整个原生字形边界、换行与基线不由主色校准代替。完整记录及本机只读验证脚本见 [ENCHANTING_QA.md](ENCHANTING_QA.md)。

后续取得GUI4无损原图：相同首字竖笔在GUI4/5的混色边界均各1物理像素，RGBA相同，实心核心由4px变3px。这是完整分量含空白halo的原生观察，不证明生产字形已零差，也未据此加入拟合偏移或全局linear。书本固定既有参数，在新scale完整21120像素中RGB MAE为0.660859、差异1409，旧式分别为0.750395、1853；最大差仍198。详情见 [native-rune-sampling.json](native-rune-sampling.json) 和 [enchanting-renderer.json](enchanting-renderer.json)。
