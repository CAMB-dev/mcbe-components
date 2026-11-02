# Manifest Validation

本家族按固定 Bedrock 样本的 `manifest_validation_screen.json` 拆为六个可复用部件。当前公开 253 组件／271 运行时值（253 组件、6 数据值、12 函数），展示入口 `#manifest-validation`。源码存在、材质字节一致和界面可交互分别记录，不视为原生整页像素认证。

| 组件 | 内容 |
| --- | --- |
| `ManifestValidationScreen` | 独立的报告窗口、关闭请求、可选 Web 翻页键适配及 modal 生命周期 |
| `ManifestValidationContent` | 原始滚动区、一个包摘要、标题和纵向问题工厂 |
| `ManifestPackSummary` | 包图标、标题／大小／描述、ID／版本／位置，以及文字刷新／删除按钮 |
| `ManifestValidationIssues` | 完整 `pack_errors` 集合快照，保留显式 capacity、稳定 ID 与 index |
| `ManifestValidationIssue` | 类型标题、复制按钮和问题正文 |
| `ManifestValidationButton` | 复制、文字／图标刷新、文字／图标删除五种源按钮；转发真实 button ref |

其余五个部件转发 `HTMLDivElement` ref。具体输入、具名子节点 refs 和回调类型从入口导出；私有计划器与材质表不增加公开运行时数量。API 示例数据见 `demo/manifest-validation-data.ts`，它是可序列化的宿主快照。

## 来源和组合

固定来源为 `v1.26.60.5-full`，主文件 35,591 字节，SHA256 `0bf65eb9846e9d0d7abbf38b21b84c5098e1ccf1788ce20271bd25a7c13f1ecc`。独立审计核对 31 个自有定义、7 份完整 JSON，以及默认根的实例和工厂路径。来源账本见 [manifest-validation-source.json](manifest-validation-source.json)。

默认路径静态可达 24 个定义：摘要使用两颗 **文字** 按钮，每个问题标题使用复制按钮。图标刷新／删除及其加载辅助等 7 个声明没有从该默认路径到达，库提供独立部件供显式组合。源文件中注释掉的 `file_error`／`file_label` 分节不成为活动 UI。`_ui_defs` 登记仅证明来源注册，不证明当前游戏正在使用这条路由。

`#error_grid_dimensions` 绑定工厂的 `#collection_length`；该工厂实际是纵向 stack。API 要求完整条目快照，容量与记录及索引一致，不根据文字推导容量或拼出二维网格。全局 `#has_errors_or_warnings` 同时控制每条问题的复制按钮、分隔线和正文，独立于各条类型、内容和集合容量。

`isWorking` 决定五种源按钮的 enabled；图标部件中的 `isDeleting`、`isDoneValidating` 单独选择原图或加载条。它们互不推导，也不代表库执行了操作。加载图使用完整 640×8 原图、64×8 UV、16×8 显示尺寸，显式 frame 为 0…9；库不启动计时器。

操作回调携带 pack/run 身份、可选 `pack_errors` 行身份、真实 control/event 及原始 target：`button.copy_to_clipboard`、`button.refresh_manifest`、`button.delete_manifest`。库发出宿主请求；服务、文件和剪贴板由宿主实现。原生事件取消、移除／隐藏／inert、最新提交的身份和禁用状态参与延迟请求校验。

## 布局与字体边界

原始 panel 的 `100%c`、`100%cm`、默认 anchor 和字体固有尺寸不是固定行高。摘要内名为 `stack_panel` 的外层实际是 **panel**：固定 50 高标题区与底部 metadata panel 不应被硬算成一个垂直 stack。`summaryHeight`、`panelHeight`、`metadataHeight`、三行高度与标签宽、问题 header/body/outer 高度均由宿主提供有限预算。示例预算是 Web 预览配置，不是原生默认值。

保留源 44×44 包图、80 宽按钮列、20 高文字按钮、25×25 复制按钮、metadata Smooth 1.1 与问题类型 Smooth 1.2 字体角色、Ten 字体标签及显式偏移。图标原图不消费 `$glyph_color`，不附加通用着色。按钮按源使用 inset1 背景、inset3 内容；按下只将内容移动 1 单位。

在 420×300 逻辑 viewport 中，窗口为 370×250、内容为 354×219。滚动外框宽350／x2，pane349，mouse viewport340、内 stack336／x2；touch viewport349、stack345。源 mouse 预留9单位，pane 还独立减1。只由内部 ScrollArea 滚动，隐藏 UA scrollbar；字体由宿主提供已有字体映射，未恢复原生 glyph、AA、bearing 或 CM 求值。

背景不能直接照搬包设置页：Manifest 声明 `$screen_background_alpha:.65`，但经过 `full_screen_background` 的实例属性 `alpha:$fill_alpha`，静态局部作用域模型选择默认 `.8`。主窗口内部另有局部 fill1。`backgroundOpacity` 是显式宿主覆盖；该模型尚非原生变量作用域或最终混合认证。已有 Pack Settings 则由 `$screen_bg_content` 走直接 `alpha:.65` 的另一子树，其 `.65` 保持不变。

## 材质与验证

核心及声明部件使用 20 个材质 key，全部复用现有完整原图：16 项别名复用、4 项已有文件 URL；14 份原始 metadata、6 项明确不存在 metadata。没有新增或重绘 PNG。另 6 项 touch／紧凑关闭、初始化生命周期或被覆盖默认材质单列在 [manifest-validation-assets.json](manifest-validation-assets.json)，不冒充默认活动画面。原始许可继续适用；私有游戏字体和捕获文件不随包分发。

| 验证 | 当前状态 |
| --- | --- |
| 固定源／实例／绑定／材质身份 | 两份独立 CPU 审计完成；静态来源证据 |
| 共享来源提取器 | 12 项 Node 守卫通过，覆盖新7／旧14文件、坏缓存保留及路径边界 |
| 六部件最终 Node／SSR | 新部件35项＋来源守卫12项；含相邻家族的最终批次129／129通过 |
| Source 浏览器／展示页／键盘／Axe | 组合批次221／222通过，唯一剩余320px溢出修复后桌面／手机2项通过；最终专属54项＋字体2项＋响应式2项单批58／58通过；旧失败保留 |
| 实际 React18／19 包和默认安装矩阵 | 全部253／271导出、既有家族、SSR与类型通过；新家族每个peer为23组SSR、24负向类型、20原材质；当前CSS的独立安装开发／生产四组合通过 |
| 生产展示 | 4173实际构建HTML字节一致；桌面／手机均通过四种独立部件、报告开关、740×500面板、全局标记、无文档横向溢出；字体就绪后逐项测量示例标签预算并检查截图 |
| 三图标完整材质平面 | 严格6／18一致，12个FAIL_RGBA保留；不是原生像素认证 |
| 当前原生活动路由、字体和整页像素 | 未认证 |

完整图标平面按 scale1／2／3、黑／白背景覆盖复制、删除、刷新三张原图。独立 Node／Python 参考的63,392个RGBA字节一致，使用显式目的像素中心／floor最近邻、编码sRGB的straight-alpha及half-up取整，阈值始终为0。这是公开Web参考约定，尚非原生采样规则。

18个实际浏览器平面共15,848像素，6个刷新平面共7,056像素完全一致；复制和删除的12个平面有790个差异像素，全部位于源texel边界平分点。14,128个非平分点像素完全一致，未观察到原调色板之外的颜色或alpha通道差异；三张原图只有0／255 alpha，不能据此认证partial-alpha取整。没有移动UV、拟合采样偏移、改原图或放宽阈值。

实际修复包括按钮保持显式尺寸的 `flex-shrink:0`、示例Switch长标签的局部换行，以及既有Progress展示页file input的320px网格宽度。生产截图检查另发现示例metadata标签预算不足，已将宿主宽度设为80逻辑单位，固定30单位问题前缀使用可容纳的 `Info`；未改源部件几何或字体角色。签名／身份、IME、延迟取消和ref清理均保持独立检查。

原版Minecraft 1.26.6005.0已实际打开并进入“设置→全局资源”，展开活跃列表。保存了经窗口／进程身份和剪贴板序列校验的2568×1400无损PNG；此前Computer Use JPEG只作结构参考。采集后已结束Computer Use，保留用户打开的游戏和4173预览。该截图没有证明Manifest报告当前可达，也不替代字体、scope、shader或原生整页对照。

本机详细收据位于 `.cache/manifest-validation-qa-01`、`.cache/manifest-validation-installed-02`、`.cache/manifest-validation-material-diagnostic-20261102-01` 和 `.cache/native-resource-packs-20261102-01`。早期包账本漂移、安装fixture目录EEXIST、测试选择器／负零假设、响应式及严格像素失败均保留；修正测试假设和产品修复分别记录。私有截图不打入发布包。

此前资源包材质的92／120一致与28个取整／采样边界失败仍原样保留；它们与本家族6／18、12失败是两套独立语料，未重记为通过。更广的 Bedrock GUI 覆盖与完整 pixel-perfect 目标仍未完成。
