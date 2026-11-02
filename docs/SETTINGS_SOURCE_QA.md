# Settings 源码部件验证

2026-11-03。本阶段公开 `SettingsFrame`、`SettingsNavigation`、`SettingsFields` 与纯函数 `layoutSettingsFrame`。实际命名空间为 **261 组件＋6 数据＋13 函数＝280 个运行时值**。API 见 [SETTINGS_SOURCE.md](SETTINGS_SOURCE.md)。完整 `WorldSettingsScreen` 未实现，整页原生像素未认证。

## 来源与范围

固定官方 ZIP 为 `bedrock-samples-v1.26.60.5-full.zip`，commit `15701fa9c13923f12662984c32c124327e40e3d3`，SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。Frame 的源几何字面量记录在 [settings-frame-geometry.json](settings-frame-geometry.json)，导航素材记录在 [settings-navigation-assets.json](settings-navigation-assets.json)。复用完整源 PNG 和原始 metadata，没有新增绘制 PNG。

三部件提供双栏框架、导航、14 种字段结构。字体、行高、尺寸、安全区、intrinsic、可见性、原始绑定值及 slider 的 Web 数值域均由宿主显式给出。原文 `textures/ui/White` 的 exact-case 文件在固定 ZIP 中缺失；示例明确声明 `host-resolved`，不把既有白图别名升级为精确源证明。

World 源拓扑另按原始顺序记录 Game69 直属控件／Multiplayer8 直属控件及有限导航依赖，见 [world-settings-source.json](world-settings-source.json)。私有生成描述符不导出到公共 barrel，也不是完整页面实现或运行中的引擎 binding evaluator。

## 最终功能候选的检查

本机证据目录为 `.cache/settings-screen-qa-20261103-01/`，不随 npm 发布。

| 检查 | 实际结果与证据 |
| --- | --- |
| Node | `node-final03.log`：43/43，0失败、0跳过；Frame9、Navigation16、Fields18 |
| 源浏览器 | `browser04.json`：60/60；desktop／Pixel7 的36交互检查及24独立原材质平面；0重试 |
| 原材质 | GUI1／2 背景、顶栏、分隔线、开关、输入框及GUI2导航状态，共1,180,296像素，RGBA严格0差；不是原生整页截图 |
| 实际安装包 | `package02.log`：React18.3.1／19.3.1 两个新消费者；280导出、SSR、声明、原生ref／inert、服务调用0、警告0；各9组Settings合同及14个负类型合同 |
| 资源与CSS | 每peer验证49个去重完整文件：33PNG、10原metadata、6许可；7个CSS依赖文件与源码字节一致；不含私有原字体／shader／本机截图 |
| 实际安装运行 | `installed02/INSTALLED.json`：两peer × 默认Vite开发／生产四组合；14字段kind、受控文本、导航、content_area弹层、Escape、late veto、inert、native dialog、ref释放；无source alias／optimizer override |
| 正式展示页 | `built02.json`：desktop／Pixel7及320宽检查共8/8（Settings4、相邻WorldActions4）；4173实际返回HTML与本轮site/index.html字节相同 |
| 有限无障碍 | `axe03.json`：设置示例范围0违规／27通过／1需人工判断；不是整页或整库WCAG认证 |
| 开发／生产图像 | installed02的16次完整520×340框架比较，共2,828,800像素，RGBA严格0差；比较的是相同Web实现的两个构建模式 |

测试过的功能包为 `package02-tested.tgz`，7,081,485字节，SHA256 `9422c63bb12b3d6e8b0c00227d163c74befa1842df6bfb92335d265f951eed68`。最后的说明文件更新后另行 `npm pack --ignore-scripts`，逐成员证明所有非文档成员与该候选完全相同；身份记录保存在同目录 `DOC_IDENTITY02.json`。不以重新打包替代功能候选的实际安装检查。

## 保留的问题与修正过程

- `browser01` 的31通过／5失败保留。真正的CSS问题是共享 `ScrollArea` 的后置规则覆盖相同specificity的Frame列定义，把显式8单位滚动条预算变为6或0。Frame规则增加自身祖先限定后，隐藏绘制不会默默回收鼠标占位；`reserve`／`when-visible` 均为显式政策。
- 原移动端交互 fixture 以520宽放入412宽设备，视觉视口横移影响点击。交互fixture改为显式设备可用宽度；独立的520几何检查仍保留，没有改变组件自动缩放规则或放宽像素阈值。
- 早期模型检查的浮点差异来自百分比求值顺序与fill预算代数重写。保留原失败，按原child占位顺序求预算；没有加入坐标四舍五入或native量化猜测。
- `preview-audit01` 为私有Axe harness未创建显式context的工具用法错误，未作为产品通过。`axe02.json` 随后真实发现 `label-content-name-mismatch`：dropdown仅用选项标题命名，遗漏可见当前值。Root将默认名称包含字段标题和当前值，权限dropdown同样修正；显式宿主名称保留。源浏览器新增可访问名称断言，并完成最终43Node、60源浏览器、两peer包及四安装运行回归。原Axe失败和第一轮包均保留。
- 原始Fields实现的agent收据仍标识修正前源码；Root最终源码与验证的hash以本阶段最终收据为准，不改写旧证明。

## 原版采集边界

本轮窗口／进程检查未发现Minecraft；确认本机已安装1.26.6005.0后，通过Computer Use对已安装可执行程序作一次启动尝试，返回 `accessibility window-opened handler did not become ready`，随后窗口列表仍无目标。没有应用输入或新原生截图，Computer Use会话已重置关闭。两个独立probe收据均保留。

旧字体采样、ResourcePacks／Manifest等原生差异仍按各自阶段记录。以上源PNG、浏览器、DPR、包和计数结果不能认证字体栅格化、引擎默认几何、provider、完整World GUI或全部Bedrock GUI。下一步为具名完整Game／Multiplayer快照、真正源挂载点的组合及可取得的原生对照。
