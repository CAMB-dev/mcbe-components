# mcbeui

创建可发布的 React + TypeScript UI 组件库，复刻 Minecraft: Bedrock 的方角、像素字体、双层倒角、绿色交互状态和凹陷式控件。

## 范围

- 以 Bedrock Classic / JSON UI 为首版视觉基准，不把 Java Edition、Ore UI 与经典界面的细节混为一种规范。
- 类型完整、支持受控/非受控表单、转发 ref、原生表单提交、键盘操作、SSR 导入安全。
- Button、IconButton、Panel、Text、TextField、TextArea、Checkbox、RadioGroup、Switch、Slider、Combobox、Select、Tabs、Dialog、Badge、Progress、Alert、Separator、ItemSlot、PixelIcon。
- 用户明确“所有组件”以 Bedrock 实际已有控件 / GUI 为边界，可复用的都下拆。docs/component-catalog.json 当前梳理 120 个组件（含公共 ContainerFrame、InventoryToolbar、BitmapText、RecipeBook、InventoryScreenFrame、GuiImageLayer、GuiLayer 与完整生存背包 / 工作台组合），覆盖基础控件、容器零件、工作站、背包 / HUD 和游戏页面组合；另有4个数据、10个渲染 / 几何 / 纹理函数，共134个值导出。implemented 只代表导出，不代表像素验收通过。
- 用户指定附魔台、砂轮等游戏已有 GUI，需要逐个从原版 JSON / 纹理提取依据，以组件形式提供。ItemSlot 重做为共用容器槽位，保留物品、数量、耐久、选中、聚焦、提示和操作事件。
- 设计令牌、独立 CSS、可选自托管字体、可交互展示页、API 文档、ESM 和声明文件。
- 查找并实际接入字体：MCBE Pixel 基于 Monocraft 用于英文，MCBE CJK 基于 Fusion Pixel 12px 用于中文；保留原版 Mojangles 自定义接入及原始开源字体。

## 验收

- 构建、真实浏览器交互测试、无障碍自动检查、桌面与手机截图检查通过。
- 从 Mojang 官方样本提取边框和颜色基准，记录来源、采样方法和字体许可。
- 展示 default / hover / pressed / focus / disabled 状态，遵循各原生分支的倒角、圆角、渐变和像素采样方式；不把 Classic JSON 与当前 HTML UI 的规则混用。
- 像素级还原是目标；只有固定游戏版本、屏幕、GUI scale、语言、DPR 和原版字体，逐像素对比之后才能声称零偏差。开放字体的字宽差异必须公开记录。
- npm pack 后在独立消费项目验证导入、类型、CSS 及字体路径。发布到注册表不在本任务范围。

## 进度

- [x] 建立目标，确认 React + TypeScript
- [x] 查找官方纹理参考与开源中英文字体
- [x] 从本机 Bedrock 安装中找到原版 Mojangles，接入可选本地预览
- [x] 实现 20 个组件及设计令牌，包括独立 Text 与原版样式 Combobox
- [x] 完成交互展示页与 API / 字体 / 视觉基准文档
- [x] 接入 MCBE Pixel 开源字体与本地 Mojangles 原字形，补齐 Text / Input 硬边阴影
- [x] 读取本机 1.26.6005.0 的 Classic 布局与纹理，68 个参考条目一致
- [x] 面板、弹窗、三态关闭图像、完整纹理裁切进度条按原版资源校准
- [x] 100 项浏览器测试：46 项交互、45 项皮肤零像素差异、5 项进度合成、3 项原始字体轮廓与阴影对照、1 项中文边缘检查
- [x] 实际 tarball 在 React 18.3.1 / 19.3.1 下的类型、SSR、CSS、字体验证
- [x] 已建立并推送 https://github.com/CAMB-dev/mcbe-components 的 main 分支
- [x] 重做 ItemSlot，加入 ItemTooltip、InventoryGrid、PlayerInventory、WorkstationFrame、Grindstone、EnchantingTable，目前共 26 个导出
- [x] 多 agent 完成原版源几何审计、真实物品材质替换、SGA 原图字形、附魔书本重建与独立验证；新增 EnchantingRunes / EnchantingBook，共 28 个导出
- [x] 本轮 126 项检查全部通过；28 导出的 React 18 / 19 包消费与生产预览通过；整理原生组件和复用范围清单
- [x] 拆出物品图像 / 数量 / 耐久 / 占位 / 结果槽、附魔项与配方 / 进度 / 燃料部件，加入工作台与熔炉系列主面板，共 41 个导出
- [x] 修正附魔书本厚页块 / UV、经验彩色阴影与青金石底层；独立附魔 QA 5/5、集成 169/169、41 导出 React 18 / 19 包消费与生产预览通过
- [x] 加入铁砧与箱子 / 漏斗 / 发射器 / 投掷器 / 潜影盒，拆出 ContainerFrame、Image、NineSlice，目前共 50 个导出
- [x] 本轮独立容器 / 铁砧 QA 18/18、Image / NineSlice 7/7，集成 214/214、50 导出 React 18 / 19 包消费及生产预览通过
- [x] 加入酿造、锻造、制图、ScrollArea / ScrollBar 与七个 HUD 组件，共 63 个导出；目录共 103 项，40 项仍计划中
- [x] 新增 26 个皮肤映射，累计 97 个；22 张公开 merged 物品素材与本机版本候选逐项审计
- [x] 取得本机 26.60 简体中文 Classic GUI 5 附魔台三种状态无损截图，校准书本仰角 / 分面光照和经验字色 / 阴影；完整区域仍非零差
- [x] 全套 301 项：300 PASS / 1 预期 desktop touch SKIP；随后原生空锻造 / 制图三处窄修正，special 16/16 与完整 typecheck 通过
- [x] 最终 63 导出在 React 18.3.1 / 19.3.1 实际 tarball 的 SSR / 类型 / ref / CSS / 字体 / 许可验证及生产预览全部通过
- [x] 加入石切机 / 织布机 / 信标 / 合成器、八个 HUD 浮层、五个设置控件和 Spinner / Tooltip / Toast，并拆出 RecipeSelectionGrid / CrafterSlot / BeaconEffect；累计 86 个组件，目录 106 项
- [x] 取得原生石切机、织布机、信标、合成器空状态与合成器禁用槽无损截图；依据截图修正 selector 滚动条、居中及 fold 层级
- [x] 本轮450项整合后精准修复2个旧定位并复验，新增说明色 / Panel无障碍3项通过；当前453项清单含2个预期desktop触控跳过
- [x] 86导出 React 18.3.1 / 19.3.1 真实tarball消费、SSR / ref / 类型 / CSS / 字体 / 许可及最终生产预览全部通过
- [x] 实现清单内其余 20 项 Bedrock 控件、可复用结构和 GUI 组合，另拆出 BlockPreview / BannerPreview / InventoryToolbar；109 个组件与 3 个数据导出已接入
- [x] 完成本轮统一浏览器回归：682 个唯一用例中 677 通过、5 预期跳过（完整运行＋最终相关范围复验）；109 组件 / 112 值的实际 React 18 / 19 包消费和生产预览通过
- [x] 按实际内置 HTML UI 修正当前死亡页，按原生加载分支修正加载页，并保留明确的旧版 / 紧凑配置
- [x] 原生六行字节确认符文主色；以本机 DXBC 候选照明同时降低打开 / 关闭书本完整区域误差，独立复核通过，相关91/91测试通过；累计684唯一用例中679通过、5预期跳过（分批覆盖）
- [x] 用1×1 Paint新画布复测原生PNG外围标记，排除旧大画布残留；保留客户区来源未确认的限制
- [x] 附魔修正后的实际React 18 / 19包消费、完整构建 / 类型、112导出与生产预览再次通过；公开原生来源元数据与只读材质核验脚本
- [x] 新增原生GUI4附魔参考，与GUI5独立核对相同符文的物理像素边缘；固定参数书本在新scale仍改善，附魔12/12及后续1/1通过，累计686唯一用例中681通过、5预期跳过；已恢复100%并暂停游戏
- [x] 新增 ItemGlint，使用真实光效 PNG 与独立核对的 UIGlint SM4/SM5 公式；110组件 / 3数据 / 2函数共115值，显式控制参数且不冒充原生动画默认值
- [x] 取得同物品两次hover与无提示底图，按配对证据修正 ItemTooltip 平色填充、紫边、阶梯轮廓及行距；加入鼠标跟随、焦点恢复，正文仅使用宿主名称/lore
- [x] 独立原始指令验证544数值与96整图；Tooltip独立硬边候选完整6496像素零差，原生边缘/字体仍非零差；最终实际React18/19消费和生产预览通过
- [x] 新增11个glint、14个双端Tooltip交互及1个独立轮廓用例；校准页局部滚动保留原规格，相关范围复验完成；累计712唯一用例中707通过、5预期跳过，0未解决失败（历史与最终相关批次合并）
- [x] 确认已测原生中文采用基础 Unicode 位图设计，新增 BitmapText 与物品提示文字渲染入口；111组件 / 116公共值，字体图页由调用方提供，本地10字符样本不分发
- [x] BitmapText 13项与物品提示相关38项通过；正式配置下字图及原生布局合同16/16通过，累计734唯一用例中729通过、5预期跳过；原生GUI5高覆盖阈值仍各5像素差、完整RGBA仍非零，未算作原生像素认证
- [x] 实现完整 Classic 工作台和生存背包，共享 Frame / RecipeBook / Entry / Filter，117组件、122公共值；库存相关109项及书本15项最终批次通过，实际React18/19 tarball消费验证通过
- [x] 经授权安装 PIX 并采集真实附魔台GPU帧；恢复书本与tooltip字体draw的实际纹理、VB/IB、shader、矩阵、UV及混合，完整2570×1402目标在限定NVIDIA后端的条件式重放RGBA零差
- [x] 将实际书本网格、UV及shader迁入组件，新增caller rendererState；实际组件显式捕获状态全目标RGBA零差，默认动态姿态和旧PNG非零差继续保留
- [x] 将验证过的字体GPU绘制链迁入可复用renderBitmapGlyphs与BitmapText可选后端；真实8draw及原背景在限定NVIDIA后端全目标/字段/halo零差，组件多底色Web合同独立通过；CPU默认保留，正式新7+旧13共20项通过，123值React18/19消费通过
- [x] 统一13处Select与Combobox可见实现，修复reset/hidden/事件兼容；Dialog按显式尺寸裁切无自动滚动；核对原版经验六图比例及不同轮廓，新增13项与相关双端回归、React18/19消费和4173生产19项检查通过
- [x] 新增显式共享GPU字体后端，48实例仅1个Offscreen上下文，实际8draw及独立混合实例完整像素零差；正式27/27、React18/19包消费与生产40实例25项检查通过，取消/报错/最后卸载均释放资源
- [x] 增加同目标 image / text / sprite / model 合成及显式原图 atlas 装配；固定 GUI5 附魔台观察 target 的实际 React 完整画面 RGBA 零差，依赖调用方原字页及明确观察配置，不推广成默认字体、所有 GUI、动画或跨 GPU 认证；见 docs/GUI_MODEL_QA.md
- [x] 砂轮复用 ResultSlot，修复空数量 / 非有限数量仍触发领取的问题；新双端16项与相关40项共56/56通过，React18/19实际包通过；新增砂轮不兼容状态的原生GPU捕获与无损BMP，仅建立参考，不作为整页零差认证
- [x] 实现Grindstone可选imageRender / 三profile类型与39槽原图组合，复用私有工作站source helper，23原PNG / 24keys保留旧图身份；独立准备砂轮8页原glyph，原默认字体不变。修后22正式合同、旧附魔46项原profile回归、React18 / 19实际包与40生产辅助检查按各自范围通过，组件120 / runtime134不变。
- [x] 校准砂轮close自身父hitbox偏移并完成独立 / native完整target复验；保留首300像素残差与首11共同漏检。明确host原字体 / projection / 另供dim .4背景时，一个GUI5 UI target完整3,603,140像素RGBA0；默认CSS仍非零，不泛化world / Present、所有driver或所有工作站整GUI零差，见docs/GRINDSTONE_IMAGE_QA.md。
- [ ] 完成默认字体与原生整GUI的最终合成 / Present / 窗口映射验证；共享GPU文字的draw批处理与总显存预算仍待完善
- [x] 完成本轮有限Anvil普通DOM失焦名称验收：源clipper /右锚min-width label、Blink156子行与真实input /React值独占；正式57 /57、7浏览器field plane72,800px0、真04e65 React18 /19包、产品六C对照 /四source RT与171生产辅助通过，617pins /257dist绑定。普通Classic native仍49,631 /52,998 /34,886 /38,081；原ref /reject产品bug、caret工具错误与旧包身份保留，不推广默认AA /全字体 /真实OS IME /其他engine /动态 /其它GUI /Present。
- [x] 完成本轮有限Classic原cell DOM字体（189 /189 /95glyph）、root scope /portal /Input、cost /tooltip角色、导航 /包 /生产验收；plus /7-space约束、owned输入修复与473 /949结构独立核对，uniform900 /−100与构字8game分开。首批133 PASS /1旧skip、最终受影响16项及147生产辅助通过；257dist /260非文档payload同02cf真实React18 /19包，private字体变后只重建site、未重跑consumer。CSS保24px行高；完整scene改善伴inventory+21 /recipe+19真退化，AA /shadow /long未0，不勾广义pixel-perfect /完整Unicode /真实IME /Present。
- [x] 验收本轮共享BitmapText有限持久GPU资源 /跨Document 256MiB payload ledger、512leases /16MP呈现与私有loadTexture LRU（64entries /32MiB resident）；最终kernel Node11、loader Node22 /browser首5、正式65与03实际React18 /19包通过各自范围，固定8draw新native与48完整矩阵复验、生产115辅助通过。payload记账不等于OS总VRAM，默认字体 /Present /多实例draw batch仍未完成。
- [x] 完成本轮Anvil可选imageRender四文字角色、真input编辑切换及39槽组合的有限阶段验收；四个有限GUI5状态经耐久修复完整native UI target RGBA0，React18 /19包及Anvil35＋旧回归103按整文件GPU profile共138项通过。生产首轮73辅助检查通过。首invalid40像素残差 /旧oracle漏检 /非唯一候选保留；真实OS IME、active-editor native pixels、任意ratio、crossGPU、world /Present /默认字体及所有GUI广义目标未完成。
- [ ] 对照游戏渲染器完善附魔书本动态算法、符文、方块 / 旗帜 / 装备预览、物品 tooltip / glint、工作站完整页面
- [ ] 固定目标游戏版本、页面、GUI scale、语言和分辨率，完成原版截图逐像素对照与差异修正

Goal 保持进行中：首版组件库已实现，严格的游戏画面对照验收尚未完成。当前可通过 `npm run preview -- --port 4173` 打开展示页。
