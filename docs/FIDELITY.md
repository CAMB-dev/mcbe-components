# 视觉基准与还原边界

目标为 Minecraft: Bedrock Classic / JSON UI；当前已有可独立复验的控件表面和字体像素证据，整页游戏画面对照仍在进行中。

## 参考与版本

固定 Mojang 官方 [bedrock-samples commit 46ba6ea](https://github.com/Mojang/bedrock-samples/tree/46ba6ea985fb5a92d79a9419198f10dda14c199d)，资源版本 `1.26.50.4`。另只读解析本机 Bedrock `1.26.6005.0` 的 JSON UI 与纹理归档：68 个相关 PNG / JSON 条目与固定参考一致，差异 0。安装版本、归档 SHA256、原版布局事实见 [local-reference.json](local-reference.json)。这只证明所比较的条目一致，不代表两版游戏的全部 UI 一致。

原始资产缓存于忽略目录 `.cache`。45 个重建皮肤的来源、尺寸、九宫格参数和 SHA256 见 [classic-skins.json](classic-skins.json)，嵌入式 PNG 由 `scripts/prepare-classic.py` 生成。来源权利说明见 THIRD_PARTY_NOTICES.md。

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
| ItemSlot | 原始 18×18 皮肤按 2 倍显示，hover 原始皮肤；selected 白色外轮廓为组件显式选择反馈 |
| Slider | 原始灰色 / 绿色拇指表面；整个 track 和 fill 组合布局尚未独立逐像素验收 |
| Panel | common.dialog_background_opaque 16×16、slice=4；8px 九宫格、浅灰底与阶梯倒角；inset 采用 edit_box_indent；文字按浅灰底使用 #4c4c4c |
| Dialog | common.dialog_background_hollow_3 18×33，九宫格 [left=8, top=23, right=8, bottom=8]；GUI 2 的标题区域 46px、侧边 16px；#090909 内部，50% 黑色遮罩；标题采用原始 [9,9] 游戏像素偏移；关闭命中区 42×42、图像 30×30，default / hover / pressed 使用原始三张皮肤 |
| Progress | common.progress_bar 的 5 游戏像素高灰色纹理；GUI 2 高 10px。完整宽度的填充纹理按进度裁切，不把填充纹理缩到百分比宽度；Web 实现按 2 CSS px 向下取整裁切边界。空、半满、全满、小数和窄屏均有独立原图合成对照 |

45 个皮肤状态及 5 个进度合成状态直接与独立读取的原始 PNG 九宫格渲染比较，要求 RGBA 差异像素为 0。禁用透明度由独立原图图层对照浏览器合成结果。图像、差异图和计数保存到 `.cache/pixel-comparison`。表面测试隐藏文字，不把它算作文字校准。Dialog 的框架、关闭图像通过不代表所有内容排版已逐像素验收。

## 字体与 shadow

- npm 默认英文为 MCBE Pixel，基于 OFL Monocraft v4.2.1，原始轮廓和字宽不变，重命名并增加 COLR v0 前景色图层。18px 使字体像素网格落在整数坐标。它仍是等宽替代字体，与 Mojangles 字宽不同。
- 中文默认为 MCBE CJK，基于 Fusion Pixel 12px proportional zh_hans 添加前景色 COLR 层、重命名并保留原始轮廓与字宽；原始上游 WOFF2 和许可仍保留。示例采用 24px，另检查中文字形和阴影没有彩边或半透明边缘。未声称它匹配游戏中文字形。
- 本地预览使用用户自有 Mojangles：原始 SHA256 `3d4cdf2752075d28c6ebf0ba44a61157ec6eb38f8db0ebdc3205aec056760be5`，1000 units/em，250 个 Unicode 映射，原版比例字宽；按 20px 使用。COLR 包装保留轮廓与 advance，避免本机 Chromium / Windows 上观察到的彩边。原版字体及转换结果不进入 npm 包。
- 独立脚本从原始 TTF 轮廓按非零环绕规则栅格化 “Minecraft”，不读取网页截图生成期望图。浏览器 Text 无阴影、Text 带 2px 阴影、Input 带 2px 阴影均与该栅格逐像素相等。advance=96px，带阴影墨迹范围为 96×16。证据在 `.cache/font-oracle`。
- 按本项目需求，Text / Input / 常用控件默认启用无模糊硬边文字阴影。原始 Classic new_button_label 模板的 shadow=false，因此这里属于明确的可配置偏好；可用 `Text shadow={false}`、`--mc-text-shadow: none`、`--mc-dark-text-shadow: none` 关闭。字号与阴影采用整数像素，不做平滑 scale 动画。

## 尚待验收

Alert、Badge、部分扩展状态以及 Panel / Dialog 的任意内容排版仍包含本项目的布局和配色选择。Progress 目前采用 common.progress_bar 模板，游戏生成世界页面使用的自定义绿色 renderer 是另一个模板。展示页是组件文档，小岛、图标和物品为原创插画，未复刻某个完整游戏页面。独立控件对照通过不等于整套游戏全界面零偏差。

本机游戏启动遇到 Xbox Live 登录错误 `0x80004005`，未进入可截图的实际游戏页面。当前没有固定分辨率、语言、GUI scale 的全屏游戏截图叠加证据；该项仍列入 GOAL。浏览器证据覆盖 Chromium 桌面 / 手机模拟，真实设备、Firefox / Safari、其他 DPR 与系统缩放仍待验证。

## 复验

`npm test` 会缓存固定参考并运行交互、45 项皮肤、5 项进度合成、3 项原版字形对照和 1 项中文边缘检查。原版字形测试需要用户自有字体；未提供时仅这 3 项跳过。字体准备步骤见 README。

可选工具：`python scripts/prepare-classic.py` 重建皮肤，`python scripts/read-local-ui.py` 读取已安装游戏布局事实，`python scripts/prepare-pixel-font.py` 生成 COLR 字体，`python scripts/prepare-font-oracle.py` 生成原始轮廓期望图。普通消费和构建无需 Python 或本机游戏。
