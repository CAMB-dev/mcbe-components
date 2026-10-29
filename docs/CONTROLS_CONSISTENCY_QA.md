# Select、Dialog 与附魔经验粉一致性

本轮更新三项可见行为与来源说明，不增加组件或运行时值导出。本轮正式结果按首批与定向复跑分别记录；通过表示本文列出的契约与比较范围通过，不宣称全部原生 pixel-perfect。

## Select：统一可见皮肤，保留表单合同

Select 现在通过内部 ComboboxBase 与 Combobox 共用 Classic trigger、popup、选中标记及活动态，不再使用操作系统绘制的展开列表。内部 Base 不作为新增公共组件。

SelectProps 继续继承原生 SelectHTMLAttributes，ref 仍为 HTMLSelectElement。宿主使用 value / defaultValue 与原生 onChange，事件中的 currentTarget 为原生 select；FormData、name / form 关联、reset、required 和 multiple 仍由原生控件合同承接。可见交互由组合框处理，底层仅有一个成功表单控件，不能依赖原生 select 的 OS popup 外观。

单选提交后关闭；multiple 模式切换单项时保持展开，可从 selectedOptions 读取多选结果。Combobox 自身仍使用 HTMLButtonElement ref 和 onValueChange，不因共享可见实现改变其公共 API。

直接赋值 ref.current.value 只修改原生控件，不会自动同步可见文案。宿主应使用受控 value，或在修改原生选择后派发冒泡 change 事件；仅 input 不会更新可见文案；保留原生 ref 不等于无条件镜像全部原生 imperative UI。

独立旧探针复核已确认以下三项修复。相同 probe runner 未改，不增加正式测试 case：

| 探针 | 修复前 | 修复后 |
| --- | --- | --- |
| 未交互的 defaultValue=b 表单 reset | 原生值回到 a，显示仍为 Beta，提交 / 文案不同步 | 原生值 b，显示 Beta，同步保持 |
| Select hidden | 可见 trigger 仍显示 | 可见 trigger 不显示 |
| 可见 trigger 的事件桥接 | 只收到 click | 顺序收到 pointerdown、mousedown、clickcapture、click |

复核无 React / page 错误，source hashes 与预期一致。证据 `.cache/select-readonly-review/FIX_VERIFICATION.json`，SHA256：`509a8d305255cc36da33872a063d404d26295dd9d3a34015206a0524c4ee2b7b`。这是三个确定缺陷的前后验证，不替代完整 Select / Dialog 正式套，也不将直接 ref.value 赋值边界算作已实现的自动同步功能。

正式范围覆盖默认 / 受控 / 非受控、单选 / 多选、disabled、原生事件目标、表单提交与 reset / required、键盘与指针、Dialog 内 popup 交互及可访问性；批次与取景修正见下文。

## Dialog：明确尺寸与显式滚动

Dialog 新增 width / height / style。尺寸为 border-box，数值使用 CSS px，也可使用 CSS 长度；style 的同名属性优先。显式 height、style.height 或 style.blockSize 会解除默认 maxHeight，宿主需要选择适合当前视口的尺寸，不能假设显式高度仍会被默认视口上限缩小。

根节点与正文默认 overflow: clip，不提供自动滚动。长内容应在正文中显式嵌入有明确可用高度的 ScrollArea，使标题、关闭入口和 footer 留在滚动内容之外。默认裁剪与宿主主动设置的 style / className 覆盖属于不同配置。

原生 modal、受控 open、Escape / 遮罩关闭请求、初始焦点和 Tab 管理保留。正式范围覆盖数值 / CSS 长度尺寸、style 优先级、显式高度超过默认上限、两层 overflow、长正文无隐式滚动、显式 ScrollArea、关闭与焦点恢复。本节代码合同与后文实际浏览器结果分开记录。

## 经验粉：保留原图的三档轮廓

独立报告 `.cache/enchanting-dust-study/REPORT.json`，SHA256：`4cdd0057d06f1ba70d9b0b0addd6693d882fe24194b055aa3f6ddd5a09f68609`。

原 JSON 声明图层为13×11 game、left_middle、offset [3,0]、layer23；实际捕获的三档 quad 均为13×11。每档 selectable / unselectable 使用各自原 PNG，数字已经烘焙在图中，绿色主体轮廓本来不同。本轮没有重绘、裁剪或统一三档形状。

当前 CSS 为26×22，整数2倍且 image-rendering: pixelated。报告中六个完整状态分别与原13×11 PNG 的2倍最近邻结果比较：每状态572个 CSS 像素，合计3,432个，changed / sum / max 均为0，无 mask、容差或裁剪。六份原始 texture 的 RGBA 还分别与捕获资源匹配；源码 / 原图一致与 CSS 整数倍率检查是独立事实。

上述结果覆盖六个 sprite 的原图与整数2倍 CSS 表面，不覆盖原生整屏、分数坐标量化、其他 GUI scale 或后续合成链。它不能作为 Select / Dialog 的测试结果，也不代表整页附魔台已逐像素验收。

## 最终集成结果

首批 `.cache/controls-consistency-qa/related-result.json`：65项，62 PASS、1个预期 SKIP、2个 FAIL，耗时200.5秒。两个失败是 pixels 与 mobile-supplement 中同一 Select / Combobox popup 完整截图对照：fixture 位置为分数 y，Playwright 取景多包含底部1行不同背景，并非组件像素不同。

仅将测试取景固定到同一个整数位置后，`.cache/controls-consistency-qa/parity-final-result.json` 定向2项均 PASS，耗时7.9秒；完整280×256表面 RGBA 零差，无 mask 或容差，生产代码未变。原失败诊断保留。这是分批闭环，不是65项单次全绿，也不是 native 整 GUI 认证。

最终按唯一范围拆分：

| 范围 | 最终结果 |
| --- | --- |
| pixels 新增13项（Select6、Dialog5、经验粉2） | 13 PASS，含1项取景修正后替代复跑 |
| pixels 既有 source 对照2项 | 2 PASS |
| desktop 相关检查 | 21 PASS、1个预期桌面 visual-viewport pan SKIP |
| mobile 相关检查 | 22 PASS |
| mobile-supplement 补充检查6项 | 6 PASS，含1项取景修正后替代复跑，不进入全库累计 |

上述主范围59项为58 PASS、1个预期 SKIP；加独立移动端补充为65个唯一 scoped case，分批64 PASS、1 SKIP、无未解决失败。全库累计与其他阶段统计由集成报告维护，不在此加总。

实际包消费阶段已通过 React 18.3.1 / 19.3.1 验证，两消费者各102个 dist 条目与打包源码逐字节相同。证据 `.cache/controls-consistency-consumer-identity.json`：

- consumer 实测 tarball SHA256：`16e2cae985d3652e39b0f8d2d27c32b8affb64de8a2a818781bcbe9f969039b4`
- JS SHA256：`cdd331a5790372a03e8dcd97486ee23cc440d8d1ff11c1b51076695ce87c52c0`

此 hash 标识该次 consumer 实测包；后续文档收尾可能改变 tarball 身份，不意味着 dist 已变。正式测试的分批闭环见上表；旧窄探针与生产smoke不另增加正式 case 统计。


## 生产4173验证

`.cache/controls-consistency-production-smoke.json` 记录19项生产检查通过：13个实际 Select 示例均使用统一可见组合框按钮及相同默认皮肤，底层原生 adapter 不再显示 OS select；真实 popup 可调用旧 Select onChange 切换 CPU 并恢复 WebGL 状态。Dialog 表单提交、关闭与回到页面、移动端 popup 边界及 Escape 仅关闭 popup 均已检查。pageErrors、consoleErrors、requestFailures 均为空。

Dialog 桌面 root / body 计算值均为 clip，无 scrollbar gutter。320px 视口中 Dialog 左侧16px、宽288px，document clientWidth / scrollWidth 均为320、scrollX=0；这些是该实际示例的测量，不将所有宿主自定义尺寸都认证为无溢出。

`.cache/controls-consistency-production-identity.json` 核对5个线上入口文件与配置构建目录 site 逐字节一致。主脚本 `assets/main-BaDto610.js` 的 SHA256 为 `be5c5fc1f46c62d786cbe2d8a4b13123efadff85b25ed83a7a7ff40db46a19b6`。生产检查独立于上述正式测试批次与原生整屏像素验收。
