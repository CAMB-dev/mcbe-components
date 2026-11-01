# Progress 源族实施与验证记录

记录日期：2026-11-02。**本文件保留私有实施阶段的证据快照（当时196／214）。随后六个组件已进入公开入口；当前公开接入与验收范围见 [PROGRESS_QA.md](PROGRESS_QA.md)，不能把这里的私有阶段结果当成新增公开包资格。** 本文记录已写代码及具名验证范围，不认证 Progress 全族或原生整页像素一致。

## 固定源与实施范围

源为 Bedrock Samples v1.26.60.5 完整归档，169569258 bytes，SHA256：

```text
d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf
```

其中 `resource_pack/ui/progress_screen.json` 为72699 bytes，SHA256：

```text
2453144b1e4d98bcc56d63c014034dae50172f5e15989589a8dca2676599ee80
```

只读研究重新解析206个UI JSON，枚举本文件101个定义和15条继承到 `common.base_screen` 的根路由，并逐字节核验完整原件。15路由是注册／继承入口，不计作15个组件；共享模板的静态依赖闭包也不等于实际同时可见节点或新增组件数。

|源入口|保留的内容与条件|
|---|---|
|`progress_screen`|默认继承空内容；显式宿主 source-helper 选择另记来源；全局 `button.menu_cancel → button.menu_exit`|
|`modal_progress_screen`|204×140有取消区的源模态内容|
|`delete_progress_screen`|继承modal，覆盖为进入／退出四个fade；不自动删除或关闭|
|`realms_stories_loading_progress_screen`|Realms世界进度内容、标题原图、区域文字／动态图标及背景分支|
|`world_loading_progress_screen`|world-convert内容，不擅自选择维度背景|
|`experience_world_loading_progress_screen`|继承world-loading，没有据名称自动选择thick bar|
|`overworld_loading_progress_screen`|world-loading及主世界原图背景|
|`nether_loading_progress_screen`|world-loading及下界原图背景|
|`theend_loading_progress_screen`|world-loading及末地原图背景|
|`world_saving_progress_screen`|教育版且cloud-save开时云上传，否则普通world-save|
|`fetching_edu_cloud_worlds`|教育版且cloud-save开时云fetch，否则继承空内容|
|`edu_cloud_download_progress_screen`|教育版且cloud-save开时云download，否则继承空内容|
|`fetching_edu_servers`|教育版时server-fetch，否则继承空内容|
|`joining_edu_server`|joining内容及ok／retry组合，源动画列表清空|
|`world_convert_modal_progress_screen`|world-convert内容，保留独立注册入口|

源研究与完整字节、JSON pointer及继承链保存在本地 `.cache/progress-source-study-02/`；这些是研究证据，不是运行时图像或npm依赖。

## 已编写的私有模块

|模块|已编写内容|当前边界|
|---|---|---|
|types／data／route|全族数据合同、纯快照、预算、47个源绑定名、15路由／gate／空回退、5个资源factory矩阵|纯数据／路由，不是引擎注册或原生layout evaluator|
|assets|69个完整原件；43个按内容哈希复用已有完整文件／完整data URL；新增26PNG、11原始sidecar及许可证|不复制整个保守依赖闭包；缺失精确literal未自行重画|
|indicators|wave、spinner、fancy、thick、custom、autosave及cloud-upload父子组合；静态帧、显式clip policy|不推断current／total→clip；不猜动画phase、端点停留或原生时钟|
|layout／actions／panels|模态／world／generic基础组合、66×26源动作、真实字体角色、完整frame、维度背景、branding／mobile／Realms辅助层|源 `%content` 和默认尺寸需显式有限Web profile；背景gradient／缺base模板有资格门槛|
|packs|required／optional独立grid及checkbox、有序显示、5个factory、确认按钮矩阵、source-once采样|真实下载、许可确认、流量及服务由宿主处理；已完成具名浏览器交互检查；真实下载仍未实现|
|cloud|upload／fetch／download／server-fetch及timeout、独立error、one／two-button、错误码／外链、独立conflict factory三选择及TTS文字组|没有真实云服务、网络超时算法、存档覆盖或合并|
|Screen|已写具体组合、全叶preflight、单owner请求队列、独立modal stack、逻辑controller请求及显式transition输入|具名浏览器合同已分批通过，完整原生整屏仍未认证；不能由叶子SSR或材料结果推定已通过|

旧公开 `LoadingScreen`、`Progress`、`Spinner` 与 `StorageSharingProgress` 继续保留原合同。新模块复用其有依据的原件／基础机制，不将通用 `value/max` 或旧loading二选一逻辑充作完整源族。

## 可复现的CPU与SSR检查

当前持久测试可以在仓库直接运行，无需先有研究ZIP、旧cache报告、游戏或测试服务器：

```sh
node --test tests/progress-model.node.test.mjs tests/progress-panels.node.test.mjs tests/progress-indicators.node.test.mjs tests/progress-packs.node.test.mjs tests/progress-cloud.node.test.mjs tests/progress-screen.node.test.mjs
```

本文编写时实际运行结果为 **73通过、0失败、0跳过**。各文件的范围分别如下，不将它们合并为原生或整屏通过率。

|测试文件|当前项数|证明的范围|
|---|---:|---|
|`progress-model.node.test.mjs`|37|固定独立源oracle的60路由／gate样本在两个source profile共120次求值；64独立flag组合；5factory矩阵；opaque身份、深快照、getter拒绝及记录／文字／图像／几何预算|
|`progress-panels.node.test.mjs`|12|源模态／world几何、branding、mobile／Realms、动作目标／独立显隐、缺intrinsic／字体／材料先拒绝、准确resource Escape；按钮hook CPU模拟及当前安装React的15路由真实SSR|
|`progress-indicators.node.test.mjs`|7|64flag组合、实际尺寸／offset／layer／ratio、完整原图帧窗口、显式clip policy、可见未恢复custom拒绝、latent输入与无SSR任务／回调|
|`progress-packs.node.test.mjs`|7|grid容量／opaque身份、required锁定及受控选中状态、5factory按钮矩阵、显式c-percent／总数文字、min-max、latent preflight、无SSR副作用及精确Escape回归|
|`progress-cloud.node.test.mjs`|10|四个云面板、64indicator组合、cancel-visible选择timeout、独立upload／download error、按钮矩阵、active-only缺失材料、conflict三选择／TTS、preflight及物理预算、无SSR副作用|

历史独立base阶段另用真实React18.3.1／19.3.1各渲染15路由，分别72次glyph回调，refs／语义回调／服务尝试／警告均为0。此阶段记录在 `.cache/progress-panels-01/phase-02/RESULT.json`；持久panel测试使用当前安装peer，不依赖本地历史消费目录，不能把它写成每次运行都验证两peer。

初始packs阶段 `REPORT.json` 记录6项；后续增加精确Escape回归后，当前文件为7项，以上73项重新执行包含该回归。历史报告保持原样，不倒写成同批7项。早期转写fixture曾漏sink／branding，另有SSR属性顺序断言问题，均保留各阶段范围；未以修改源预期来隐藏产品偏差。

按钮hook CPU使用模拟DOM所有权，只证明该有限调度／guard合同。真正pointer、native input、文档最终veto、焦点、modal、滚动、once与controller的整屏组合仍由浏览器验证。

## 十二个完整Web材料平面

根代理实际测量 `.cache/progress-browser-01/measure-03/RESULT.json`：**12个预声明完整平面、240600个RGBA像素，差异0，最大通道差0**。报告SHA256：

```text
913250ac397ba96e1ca8ec09c8037548e6bd005e68b39e620d2fa532aaa5c284
```

冻结协议为 `.cache/progress-material-oracles-01/PROTOCOL.json`，SHA256：

```text
854f02de23e2a675b47847ac862c3dfae84d439a7473a29f7fb59aacc7077d39
```

|材料／状态|完整平面|
|---|---|
|spinner帧0／5／9|各200×100|
|autosave帧0／4／8|各200×100|
|fancy ratio0／0.5／1|各200×101|
|thick ratio0／0.5／1|各200×100|

每个完整平面与冻结expected文件及完整decoded RGBA哈希核对；无ROI裁剪、像素mask或容差。fancy的nub仅按预先声明的材料隔离协议隐藏绘制，保留原几何，因此结果不认证nub或完整自然进度条。此前measure-01／02含失败，原报告保留；不声称三阶段一次全绿。measure-03记录page errors与failed requests均为空，浏览器已关闭。

这些是实际Chromium与独立源材料预期的有限Web比较，**不是新的Minecraft整屏捕获、引擎shader证明、字体证明或完整Progress GUI零差**。wave、动作按钮、面板、文字、背景及自然组合也不能借这12个平面获得资格。

## 源Escape、状态与宿主职责

资源factory准确使用 **`modal.escape`**：`progress_screen.json` 的simple popup显式映射，以及 `popup_dialog.json` 的selector父模板均给出该literal。它不同于另一个共享模板 `popup_dialog.modal_input_panel` 的默认 `popup_dialog.escape`。私有target类型、叶子handler、Screen路由及持久回归统一使用 `modal.escape`，不保留错误旧literal兼容。

root `button.menu_cancel → button.menu_exit`、资源 `modal.escape`、云conflict `button.close_edu_cloud_conflict_resolution_popup` 彼此独立。focused pointer／keyboard／controller动作按readonly抑制；根全局退出／top-factory escape按明确Web modal策略可在readonly时请求，disabled仍阻止。所有这些只产生可否决通知，不自动导航、关闭、重试、下载或修改游戏世界。

raw sink由Screen唯一owner在完整原生事件传播后处理，保留最终document veto、稳定currentTarget及最新run／factory／DOM所有权复核。库不将逻辑controller请求伪造为trusted硬件输入。并存resource／conflict factories使用明确宿主Web层序，不能猜引擎焦点仲裁。

required／optional集合分别保存grid与选中状态；required的源默认选中不会覆盖宿主实际false值。包计数、总大小、区域、错误码、日期和链接文字都是宿主字面数据。Opaque payload保持引用身份，不遍历、不序列化、不冻结内部对象或调用其getter；库只复制自己拥有的显示字段。

## 显式profile及尚未恢复部分

- 八个font角色、实际family／字号／lineHeight／测量来源必须显式提供。普通源文本的未指定font_type不是某个默认CSS字体证明；smooth角色也不能随意套用另一字体。glyph-only渲染保留可访问字面文本，面板及文本框仍由库拥有。
- `%c`、`c%`、`%cm`、`%sm`、`default`、safezone及同级测量未native恢复。各模块保留原式／pointer，要求特定intrinsic键；不会把 `70c%` 等改写成普通CSS百分比，或猜字宽、默认高度来缩减分支。
- current／total／percentage与Web clip彼此独立。可见 `progress_bar_renderer` 没有恢复原生算法时拒绝native路径；显式Web clip是有来源声明的替代政策，不认证为引擎ratio。source gradient同样需要显式Web政策，不能把CSS方向冒充原生shader。
- 原动画帧数／step／fps／reversible字段保留，spinner未指定reversible就保留unspecified。静态frame与宿主驱动elapsed／screen events不等于已恢复原生phase、端点停留或动画时钟；没有推定超时秒数或自动完成。
- 缺失精确 `textures/ui/icon_external_link`、`progress.realms_loading_screen_background` 及desktop button-state literal均显式管理。相似图、Whole host leaf、明确Web state policy必须标记其边界，不能改名宣称找到了原件。仅active分支才要求相应材料，但必须在任何glyph回调前完成该分支的全部检查。
- branding依赖平台／教育版分支；desktop不等于win10。需要时提供有明确sourceVariant／box／来源的单个whole-image leaf，不接受whole-screen renderer替代完整内容。
- 真实云存档、下载、网络ping、URL导航、平台识别、TTS、游戏操作、screen注册及引擎provider由宿主负责。此处没有真实服务验收。

## 原图与许可

图像始终引用完整原始PNG；raw nineslice元数据（包括重叠cuts）原样保留，不重画、裁图、纠正base_size或归一化sidecar。复用按完整内容SHA判断，不因basename相同认作同一素材。研究缓存的完整原件也不作为运行时截图使用。

`src/assets/progress/LICENSE.md` 保留归档原始Mojang许可文本。原游戏／样本材质有其自身权利及EULA来源；库代码的MIT许可不将这些素材重新许可为MIT。字体沿用库现有可分发字体／宿主显式私有字体策略，不把原版字体或shader二进制混入本批。

## 尚待补充的整合验收

最新完整整合批 `.cache/progress-screen-browser-05.json` 的11项全部通过，包含新增纯 branding 快照后的实际行为复核。此前 Screen 实际 Chromium 检查：`.cache/.cache/progress-screen-browser-03.json` 的10项全部通过，新增五factory／conflict三按钮／外链矩阵在 `progress-screen-browser-04.json` 单项通过（同目录）；不称一次11全绿。覆盖15根路由实际挂载、源退出目标、readonly／disabled、最终document click／keydown否决、最新回调、close→reopen／unmount／factory replacement旧事件失效、双factory显式层序和各层焦点恢复、受控选中拒绝／接受、source-once、显式out_cubic和iframe owner-document。初轮3个harness失败及第二轮1个harness失败保留：测试初值误写400而profile为500；Playwright禁止点击aria-disabled按钮；React checkbox的原始可取消事件是click而非不可取消change；overflow:clip仍可报告被裁掉的源extent，滚动禁止应测scrollTop不能移动，不能要求scrollHeight等于clientHeight。没有降低源尺寸或改产品来配合这些测试。

`tests/progress-screen.node.test.mjs` 最新11项CPU／实际SSR通过，覆盖60路由gate组合、五factory及两层序、全叶预检、无副作用、源动画及根DOM约束。完整源码declaration检查曾发现TS4058，已通过导出私有TextLeaf名称修复，公共barrel未变。

尚未据此宣称完整自然截图零差、新族packed React18／19默认Vite四组合或原生整屏资格。私有fixture的字体、intrinsic和缺图替代是明确的测试输入，不能当生产默认值。

后续须逐项核对15路由及gates、五资源factory、独立两error／conflict、真实滚动与checkbox受控拒绝、once生命周期、source动作／全局退出区别、最终native veto、双modal层序、refs与跨Document、实际文字／字体、宽窄尺寸、独立完整材料平面和最终包消费。完整目标不因节点数量、纯测试或局部RGBA零差而缩小。

最终持久CPU批 `.cache/progress-node-final-01.log` 同次89／89通过：Progress 六份Node测试及资源检查器5个正反例。公共源图资源校验改为从 `src/index.ts` 的真实依赖闭包扫描（147个非声明模块、617个原字节引用），不通过硬编码忽略新族；一旦私有模块被公共入口引用，其素材必须参与校验。字节损坏、残留URL及越界路径仍失败。公开包在React18.3.1／19.3.1的原有消费门禁通过；该包仍未导出Progress新族，不能借此声称新族packed消费已通过。
