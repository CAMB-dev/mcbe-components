# Progress 公开接入与验收

记录日期：2026-11-02。公开新增六个组件，当前 **202组件／220运行时值**。这是固定 Bedrock Classic 源的有限 Web 实现；原生整页、字体、内容求值、shader 和服务仍未认证。API 见 [PROGRESS.md](PROGRESS.md)，此前私有阶段证据保留在 [PROGRESS_IMPLEMENTATION_QA.md](PROGRESS_IMPLEMENTATION_QA.md)。

## 公开范围

`ProgressScreen` 实际组合15条根路由、独立能力与绑定、资源包／云／错误／冲突分支；`ProgressIndicators`、`ProgressPackGrids`、`ProgressResourceDialog`、`ProgressCloudPanel`、`ProgressCloudConflictDialog` 可独立使用。所有 standalone 部件有真实 DOM ref；语义通知经过所有者窗口任务，复核最终 native-event 否决、最新回调、实例／DOM／受控集合身份。Source buttons 在 readonly 时不通知；独立全局／modal Escape 可以通知，disabled 仍阻止。没有真实下载、云存档、导航或游戏操作。

资源 Escape 的准确目标为 `modal.escape`，不同于主屏 `button.menu_exit` 和冲突关闭。两 factory 并存时 Screen 要求明确 Web 层序；独立部件使用共享 Web modal 所有权。焦点陷阱的 Tab 是早期导航检查，不将语义请求的最终 document veto 保证外推到原生 Tab 默认行为。

普通字体、内容测量、missing exact Realms／external-link provider、裁切／动画／焦点的 Web 选择均为显式输入。展示页实际加载分发的 Pixel／CJK 开放字体，不能冒充 Mojangles。缺图分支提供 whole-image 输入，不用相似图自动替代；测试中的 explicit host provider 只证明输入路径可用。

## 实际检查

|范围|结果及证据|
|---|---|
|持久 CPU／SSR|`npm run test:progress:node` 同批105／105通过，包含 source routes／gates、flags、geometry、actions、opaque payload、预算、前置验证、独立 owner 与 React metadata。`.cache/progress-public-01/node-final-01.log`|
|公开入口与私有 core 组合浏览器|首次35项为34通过／1个测试未等待延迟受控更新；修正测试后 standalone13项通过。首次包含 Screen11项及原12材质全通过，原报告保留；不称一次35全绿。`source-contracts-01.json`、`source-contracts-02.json`（同 cache目录）|
|公开 source 展示|首轮3通过／2失败；15route长批超出30秒、拒绝选择误用要求立即变值的check断言。显式分步且有界90秒、使用click观察受控拒绝后，两项重新实际通过，保留原失败。`demo-source-01.json`／`demo-source-02.json`|
|实际 built 展示|8项桌面／Pixel7 profile检查通过，覆盖实际字体、15 routes、明确whole provider、parts受控拒绝、两个独立dialog、窄页和焦点退出。`demo-built-01.json`。不认证物理设备或 Pocket 原生布局。|
|实际包|`npm run verify:package` 完整通过，React18.3.1／19.3.1各75项 Progress SSR、严格已安装声明正反例、69个原 PNG、37份原始 metadata、许可、7个CSS子路径及递归依赖。既有全部202组件／6数据／12函数门禁亦保留。`package-06.log`|
|资源图闭包|公共入口160个非声明依赖模块、676原字节引用（631PNG／39TGA／6JSON）通过；内部 helpers／planners／bank没有变成公共运行时导出。|

公开 preview 另保留原始 Axe，并在闭／world-modal状态验证报告的图像背板文字；`demo-built-02.json` 实际通过。首报告有新增 h4 跳级，随后改为 h3；最终 source／built复核另记，不据此宣称整站所有状态零违规或 WCAG 认证。上一阶段全站 moderate 地标目标仍有各自边界。

## 真实兼容问题与修复

首个实际 React18 包消费暴露了 nonenumerable `key/ref` warning getter：纯数据校验错误地拒绝 React 框架元数据。现在仅通过 descriptors 识别这两个框架标记，绝不执行 getter；所有其他 accessor 和数据预算继续验证。六个公开入口与需要 ref 的 private CoreResource／CoreGrids 入口均已处理，实际两 peer 消费通过。

另一个失败是测试把合法 Realms PNG base64 中的 `NaN` 子串当成数值错误。素材和画布未改；验证器改为检查真正的几何 style／数值属性，保留不合法数值正反例。后续一次构建还发现新测试 ElementHandle 的类型过宽，已修测试的 Element 类型。原 `package-01` 至 `package-05` 失败日志保留，不能写成首轮全通过。

两个 API 预算缺口已修：Screen-only records 以及 native attribute／CSS string 均纳入有界数据合同。Standalone outer 也前置拒绝其不拥有的 role／tabIndex／modal／label 属性，语义由内部源 dialog 和 labels 提供；`id`、事件、允许的描述和状态属性仍可使用。

## 独立原图平面

|协议|实际结果|范围|
|---|---|---|
|`tests/fixtures/progress-materials`|12份完整平面，240,600像素，RGBA差异0|spinner／autosave各三帧、fancy／thick各三比例；只认证所列 point／clip／frame Web 假设。Fancy nub 按测量前协议隔离绘制，不认证自然组合nub、wave或custom shader。|
|`tests/fixtures/progress-resource-materials`|四factory各500×301完整平面，共602,000像素，RGBA差异0|同一源窗口材料在四个simple factory上的固定 Web 层级；不计作四份独立原生GUI参考。字形与按钮仅按预声明协议隐藏paint，完整几何保留。|

第二份协议在 root 观测对应平面之前独立冻结，SHA256为 `e6fd07719139689dcc95370fa7f0e8b90c80fb8e9c8172a503f5f1d1e9995018`。源 `control` 为layer−10、hollow3 frame为layer2；旧CSS把二者同设−1，使后绘制的fill压住不透明标题材质。已让fill低于frame，保持原图／切片／颜色。完整参考来自原18×33 frame、2×2 control、raw `[8,23,8,8]` cuts，以及明确的500×301 parent和250×209 intrinsic，不使用生产renderer生成期望。

根报告：`.cache/progress-public-01/resource-materials-01.json`。Frame target 的 Web focus outline由组件管理，不能附加浏览器默认环。标题top16／height10保留已声明的源展开，不从header常识改色或猜另一个native位置。

## 仍待原生证明

native 默认字体及glyph／AA／shadow；`%c/%cm/%sm/default`和safezone／anchor求值；custom renderer的真实amount／total转换与shader；gradient；缺失literal／provider；flipbook phase／端点停留；原生focus／factory顺序；所有平台及真实服务。上述有限验收不能替代这些要求，也不将全项目目标标成完成。


## 最后功能包与默认工具链

`package-06.log` 对应源代码最后的资源窗口层级修正与声明检查。该功能包随后冻结至 `.cache/progress-public-01/final-candidate/mcbeui-0.1.0.tgz`；默认工具链再独立复制冻结输入，避免构建过程重写默认tar文件名。

最新 `.cache/progress-public-01/default-vite-qualification-03/RESULT.json` 的 React18／19 × development／production 四组合全部通过：使用实际 npm 安装tar、无source alias／optimizer排除／自定义Vite配置，六个真实DOM ref、受控包选择、Pixel／CJK字体及五次源动作（包含selector与simple两种资源窗）通过。各own server和browser已关闭。首次工具链批与后续冻结批的记录独立保留，不用旧tar为新样式背书。

最后built的 `demo-built-03.json` 两项通过（独立parts及闭／world状态原始Axe），两状态raw Axe均为空；它复验了h3语义及最后构建。此前完整8项仍按 `demo-built-01.json` 的对应构建记录，不称本批再跑8项或整个网站所有状态都通过。

功能tar SHA256：`4c6cfd2204265883651915a16e952c4248123d86f254f4b8317bf6c74bc179a7`。最终仅文档repack的所有非文档文件逐字节相同证明另记。

## 最后展示宿主修正

公开预览的主画布、独立资源／冲突窗改为 owner-document body portal，正常流宿主仅测宽与占位。画布尺寸和源材质保持显式整数倍率；2×同时要求足够宽度及至少720px视口高度，否则1×。画布外提供宿主说明与关闭手势；主屏通过 controller 请求退出当前源层，独立部件仅关闭宿主预览。画布内原生事件不被宿主吞掉；没有向源GUI添加关闭按钮或滚动条。极小窗口只允许外层展示容器滚动。

新source第一批8项为7通过、1项手机操作批耗尽30秒总时限；原始JSON报告保留；trace显示已执行至最后一步。将该多模式批的时限设为有界60秒后，source第二批相关四项通过；新增第五项误统计整页hidden dialog，失败保留，选择器随后限定到当前Screen的source layers。对应报告：`.cache/progress-public-01/demo-portal-source-01.json`、`demo-portal-source-02.json`。最终复验另记。严格TypeScript与公开展示生产构建通过。

最终portal生产批 `demo-portal-built-01.json` 为8通过／1个新增测试选择器失败；其八项包含桌面与Pixel7完整画布、实际字体、十五routes、受控parts、触屏画布外退出／返焦，以及闭／world状态原始Axe均为空。限定source layers后，`demo-portal-source-03.json` 与 `demo-portal-built-02.json` 各1项实际通过：1440×700自动使用1×，双factory按冲突→资源→base三次退出，资源行内部click仍改变受控选择。没有把不同批次写成一次九项全绿。

测试记录限制：portal缓存配置最初为source／built复用了outputDir，后一次运行清理了早期失败的trace／截图；原JSON报告及具体错误仍保留。其他独立API／material／package报告不受影响。后续配置必须同时分离report与outputDir。

## Controller 修复阶段

205／223公开入口中的ProgressScreen已修复state-setter引用循环、更新时句柄更换及宿主嵌套modal抢占。原失败／分步验证、同批50项及实际React18／19默认工具链回归见[PROGRESS_CONTROLLER_QA.md](PROGRESS_CONTROLLER_QA.md)。本页先前202／220数值与tar hash属于首次公开阶段历史；不能用旧tar为本次运行时代码背书，也不增加原生像素资格。
