# mcbeui

创建可发布的 React + TypeScript UI 组件库，复刻 Minecraft: Bedrock 的方角、像素字体、双层倒角、绿色交互状态和凹陷式控件。

## 范围

- 以 Bedrock Classic / JSON UI 为首版视觉基准，不把 Java Edition、Ore UI 与经典界面的细节混为一种规范。
- 类型完整、支持受控/非受控表单、转发 ref、原生表单提交、键盘操作、SSR 导入安全。
- Button、IconButton、Panel、Text、TextField、TextArea、Checkbox、RadioGroup、Switch、Slider、Combobox、Select、Tabs、Dialog、Badge、Progress、Alert、Separator、ItemSlot、PixelIcon。
- 用户明确“所有组件”以 Bedrock 实际已有控件 / GUI 为边界，可复用的都下拆。docs/component-catalog.json 当前梳理 110 个组件（含公共 ContainerFrame、InventoryToolbar 与三个材质渲染器），覆盖基础控件、容器零件、工作站、背包 / HUD 和游戏页面组合；另有 3 个数据和 2 个纯渲染函数导出。implemented 只代表导出，不代表像素验收通过。
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
- [ ] 对照游戏渲染器完善附魔书本、符文、方块 / 旗帜 / 装备预览、物品 tooltip / glint、工作站完整页面
- [ ] 固定目标游戏版本、页面、GUI scale、语言和分辨率，完成原版截图逐像素对照与差异修正

Goal 保持进行中：首版组件库已实现，严格的游戏画面对照验收尚未完成。当前可通过 `npm run preview -- --port 4173` 打开展示页。
