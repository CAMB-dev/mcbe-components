# Resource Pack header: native draw evidence

后续组件集成见 [标题图像采样配置](RESOURCE_PACK_HEADER_IMAGES.md)：真实 Section／Manager 已可使用显式 whole-frame profile，减号原生细条也取得独立 draw 证据。下文保留先前各阶段的限定与失败记录。

当前仍为 **253 组件／271 运行时值**。GPU 采集阶段（`bd8eec9`）没有修改组件、采样内核、原图、旧参考图或误差阈值；补上了真实原版绘制证据和可重复测试。有限结论是：**给定捕获派生的宿主位置及原生 before 图层，现有公开 GPU 接口可以准确重画两颗 plus**。这不是资源包整页布局或字体复刻完成。

## 采集与原图身份

从 Minecraft 1.26.6005.0 的“设置→全局资源→展开活跃列表”采集一个 Present-to-Present 帧。正常退出普通菜单后，经 PIX 2610.28 以 GPU Capture 模式启动，未强制 D3D11On12；计数0→1。捕获库须在首次 D3D12 调用前加载，见 [Taking a Capture](https://devblogs.microsoft.com/pix/taking-a-capture/)。采集后正常退出游戏、PIX并关闭Computer Use。仅对保存文件运行官方 [pixtool](https://devblogs.microsoft.com/pix/pixtool/) 和既有分析工具，没有编译或执行生成的C++。

原始 `.wpix` 与分析副本均为62,956,034字节，SHA256 `3a4254736d4b9b904fb24d3be6be70482697deebbe7a98691f17181fc904a3d5`。固定公共 `v1.26.60.5-full` ZIP SHA256为 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。当前安装的5份相关完整UI文件与该ZIP解析后的对象／数组相同，但安装文件已压缩排版，**原始JSON字节不同**。安装、ZIP和库内 `plus.png` 则完整字节一致：123字节，SHA256 `965fa4c152e09cdd8d61ead15b5eb2ecefd9e1c78cd49a9b652b84b78bf55f9f`。

静态路径为 `available_packs_title_button → common_buttons.light_content_button`，内容继承 `selected_packs_title_content`；plus消费完整11×11原图、10×10逻辑尺寸、offset[-2,0]和 `$text_color`，default／locked角色声明`.3`。静态链与实际draw、原图身份分别验证，未把源码登记当运行时绑定求值证明。

## 实际绘制及无损读回

63条draw与实际API XML的完整顺序和参数逐项相同，索引命名空间独立保留。G81对应queue0/event515、CL506、`DrawIndexedInstanced(12,1,49400,0,0)`，两颗plus合批：

| 输入 | 实际证据 |
| --- | --- |
| 源纹理 | bound SRV R298，11×11、RGBA8、sample1；全部121 texel／484 RGBA字节与原PNG一致 |
| 顶点／索引 | 8个12字节float16 XYZW／UNORM16 UV顶点、12个16位索引；全图UV端点0／65535 |
| GLOBAL边界 | [442.5,153]…[452.5,163]；[442.5,179]…[452.5,189] |
| 采样／着色 | POINT／CLAMP；PS常量Hud全1、Tint RGB为float32(.3)、alpha1；既有UI/Blit shader身份一致 |
| 输出 | R19，2570×1402、RGBA8、sample1；未以其后的sample8 R13代替UI层 |

顶点和常量沿实际修改块及 `CopyBufferRegion` 链恢复，没有把旧initial页当current。事先声明的一块61,557,888字节CPU解压只执行一次、只在内存存在；仅保存216字节几何／常量及独立小shader片段和块哈希，没有解压整个资源容器。

同G81的真实before／after全帧中，只有2336像素改变，全部为 `[198,198,198,255] → [76,76,76,255]`。两颗图标各1168像素，两个完整50×50区域外零变化，前后全帧alpha均255。另在G94合成前读回最终UI层，全部3,603,140像素与本次PIX无损截图一致；没有把最终UI当G81的before背景。

这关联了该白色原图、实际float32(.3)和输出76，**不建立任意颜色、`.7`、partial-alpha、字体顶点或通用量化规则**。

## 36像素差异的原因

原图是中央3行／3列的11×11十字。实际GLOBAL X442.5在GUI5下名义物理落点为2212.5，Y153对应765。相对于像素中心，X取样相位为整数k，Y为k+.5；已知几何下POINT竖条宽13、横条高14，面积 `13×50 + 14×50 − 13×14 = 1168`。

此前将真实 `ResourcePackSection` 的完整图像对齐到整数BCR作对照，产生14×14条宽和1204个不透明像素，恰好多出 `50−14=36` 像素。颜色已一致。该整数对照仍保留为严格失败，不能把它的phase当原版几何，也不能加入UV epsilon或通用半像素偏移。**GLOBAL X如何由JSON布局及intrinsic算出仍待独立恢复。**

另将真实DOM家族的两颗图标BCR设到已知的2212.5／765与2212.5／895，两个浏览器启动配置下仍各有全帧128个形状差异，颜色仍只76／198。其中28个差异落在原生50×50区域右侧，已完整计入，未以局部裁切隐藏。此负例保留在 `.cache/native-plus-css-phase-20261103-01`：简单给CSS加半像素位移不是修复；源几何的GPU重放和浏览器图片取样不能混为一条路径。

## 公开接口验证与限制

`renderGuiImages`、`renderGuiLayer` 的webgl／top-left两条路径，均使用完整原图、字面量Tint(.3)、Hud1、2570×1402／GUI5和已知GLOBAL矩形；背景为真实G81 before快照。没有输入捕获的VB、IB或MVP，没有改shader。三路径×SwiftShader／NVIDIA D3D11两后端的6个完整输出均RGBA零差，未挑选更接近oracle的后端。此观察不建立两种rasterOrigin在所有场景等价。

真实 `GuiImageLayer` 再以原PNG URL挂载，两后端的live framebuffer及完整DOM截图也均零差；同一个原始123字节Blob进入 `createImageBitmap`，解码选项为none／none／none。Playwright的200但空body合并传输观察保留；审计实际消费的Blob，没有重下载、替图或按预期哈希挑响应。最初仅因空body断言失败的记录仍保留。

纯布局生成的8个XY／UV和索引匹配捕获；MVP的Z对角项不同。顶点均z=0，因此有效clip XY／W相同，**没有声称16个矩阵元素或完整矩阵字节一致**。

背景含原生字体及其他控件，实际新画的只有两颗图标、2336像素，不能将复制背景的面积算成新完成的字体或整页复刻。正式测试实际3／3通过、0skip／retry：

```sh
npx playwright test tests/resource-pack-header-native.spec.ts --project=pixels --workers=1
```

测试依赖本机 `.cache/resource-pack-native-gpu-20261103-01` 私有捕获。它们、字图和GPU dump不随库分发；缺少时明确跳过该有限原生profile，不生成替代参考。证据还包括 `.cache/resource-pack-pix-plus-independent-20261103-01/AMENDMENT-01…04`、`native-header-web-20261103-01`、`native-plus-public-replay-20261103-01`、`native-plus-mounted-20261103-01/02`。

此前资源包92／120与28个严格失败、Manifest6／18与12个严格失败仍分别保留。另对冻结的6个普通宿主frame／18个图标plane运行现有GPU路径：软件12／18符合旧理想POINT约定，NVIDIA为6／18；没有对应图标的直接原生draw，故未以较高通过数决定正确采样规则。默认DOM家族整页布局、字体、其他比例／状态／材质及完整Bedrock GUI仍未认证。

## 后续源码布局及状态修正

独立重新读取固定 ZIP 后，发现此前 DOM 实现遗漏了 `new_ui_button_panel.button_content` 的 `[100%-6,100%-6]`，它与 `selected_packs_title_content` 自己的 `[100%-6,15]` 是两层。现在复原外层3单位内边距，标题继续保留内层宽度扣减；15高的标题不被14高的外层面板裁切，文字本身仍负责溢出处理。中间未声明尺寸的 panel 在此 Web 实现中采用填满父层的布局；这尚不是对原生缺省尺寸、anchor、`100%c` 或舍入语义的恢复证明。

同时恢复 light button 的 pressed 内容 offset `[0,1]`，并把 locked 文字从误用的 dark button `.7` 改回 `$light_button_locked_text_color` 的 `.3`。诊断按钮保留源码的 pressed offset `[0,0]`，独立 underline 实现也不套用此位移。`.3` 在 CSS computed style 中为77，前文有限原生图像绘制输出为76；本次不把二者混作原生字体颜色认证。

新增四种缩放（1／2／3／5）的真实按钮测试，分别检查 default、hover、pressed、disabled 和 readOnly 的内容盒、标题盒及颜色。桌面／移动端 Resource Packs 回归92项和既有原生profile3项，实际合计95项通过，无跳过或重试；构建通过。旧参考图、采样阈值及失败记录保持原样。绝对 GLOBAL origin、最终 CSS 取样及整页原生认证仍待完成。
