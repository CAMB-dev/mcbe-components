# 外部服务器表单

`ExternalServerForm` 提供 Classic 添加／编辑服务器的命名组合，
`ExternalServerField` 是其中三个字段实际复用的独立零件。
原版依据是固定 `v1.26.60.5-full` 的 `add_external_server_screen.json`，
commit `15701fa9c13923f12662984c32c124327e40e3d3`。
完整来源、继承、几何、原图及原始 metadata 哈希见
[external-server-source.json](external-server-source.json)。

## 使用与所有权

从 `mcbeui` 导入组件；表单样式为 `mcbeui/external-server-form.css`，
它同时导入字段样式。独立字段可只导入 `mcbeui/external-server-field.css`。
字体仍由宿主导入公开字体或提供自己的 `--mc-font`。

表单要求显式 `title`、`labels`、`mode` 和四项 `bindings`。
`value`／`onValueChange` 提供受控用法；省略 `value` 时，以首次
`defaultValue` 初始化内部值，缺省三个字段均为空字符串。
输入回调收到原生事件、字段名和独立复制的值对象；动作回调使用已接受的值，
不会读取 DOM 中尚未接受的草稿。受控宿主可拒绝修改。

`name`、`address`、`port` 都是字符串。端口输入不解析、不裁剪、不去前导零，
`NumberChars` 只映射为 Web 的 `inputMode="numeric"` 提示。
默认 `maxLength` 分别为 16／256／6，宿主可通过 `fieldProps` 显式覆盖。
默认限制由真实 input 执行，不会截断宿主直接提供的受控值。
地址输入使用 text，允许域名或 IP，不要求 URL scheme。

`fieldProps` 保留原生 input 属性及事件，`fieldRefs` 指向同一个真实 input。
原生字段 `onChange` 的 `preventDefault()` 可否决组件的值请求。
独立字段的 `className`／`style` 属于 input；其 `width` 是外层逻辑宽度。
表单 ref 指向真实 form；所有 ref 在 SSR 时均不调用。
原生 `hidden` 会隐藏整个表单；独立字段的 input 为 `hidden` 时，关联的字段行也隐藏。
显隐不替换节点或丢失已接受的值。

`onAction` 报告 Play／Save／Remove 请求，组件不连接服务器、删除记录、
持久化、检查 DNS 或恢复引擎的地址／端口校验算法。
`onSubmit` 可先否决 Web 提交；否则 Enter 按 `submitAction` 请求 Save（默认）
或 Play，绝不以 Enter 选择 Remove。`onReset` 可否决重置；未否决时，
组件向宿主请求恢复首次 `defaultValue`，受控值仍由宿主决定是否接受。

表单是可嵌入区域，不自行创建 modal、portal、背景遮罩、焦点陷阱或路由。
Close／Escape 通过 `onClose` 报告意图；宿主负责关闭和焦点恢复。
Escape 先调用宿主 `onKeyDown`，尊重 `preventDefault()`。
组合输入期间阻止动作和关闭请求；没有以替换 input 的方式模拟 IME。
`disabled` 使用真实禁用控件；`readOnly` 保持字段可聚焦并阻止动作，
关闭请求仍可使用。真实系统 IME／屏幕阅读器没有因此被认证。

## 原版绑定与 Web 解释

源文件中的 new／edit 都是空 override 的别名，不能从名字推断它们给出了
`$edit_mode` 的值，因此本组件要求宿主显式选择 `mode`。
添加模式左侧为 Play，编辑模式左侧为 Remove。

|输入|源语义|
|---|---|
|`playEnabled`|`#play_button_enabled`，同时控制 Play 及其替代层的 enabled|
|`playDisabledVisible`|独立的 `#play_button_disabled` 显隐，不等于 `!playEnabled`|
|`saveEnabled`|`#save_button_enabled`，控制正常 Save 的显隐及两层 enabled|
|`saveDisabledVisible`|独立的 `#save_button_disabled` 显隐，不等于 `!saveEnabled`|

四个值不会根据输入内容或彼此取反生成。即使宿主传入不常见的组合，也保留独立输入。
两层同时出现时，下层保留装饰性原图绘制，上层提供唯一的真实按钮及无障碍名称；
这是明确的 Web 命中／Tab 策略，没有认证原生引擎在矛盾绑定下的路由。
两个 Save 显隐均为 false 时，该位置没有 Save 控件。

## 几何与材质

默认逻辑尺寸 316×179，`scale` 为正整数，默认 2。
`size` 可显式改变逻辑长宽，布局按源公式重新计算，不以 transform 缩放整个表单。
超出范围的内容裁剪，不产生隐式滚动条。

- 内容区为 `[10,24,W−21,H−52]`；三个字段各为标签 10、编辑框 25、尾部间距 3。
- 标签向右偏移 2；编辑内容 inset 为 TRBL `2/3/2/3`。
- 两个底部按钮各为 `W/2−8`×30，距左右及底边 7；图片 inset1、文字内容 inset3，按下文字下移1。
- 关闭命中框为右上角21×21，完整15×15原图居中；common_panel 的显式 offset0 覆盖默认关闭偏移。
- 外框使用完整 `dialog_background_hollow_2` 原图及 raw cuts `[8,23,8,42]`。
  内部 `control` 原图距各边4、独立 alpha0.8；外框没有被一同降透明度，也没有另加通屏暗层。

十二张完整原图、九份原始 metadata 和许可证原样保留在
`src/assets/external-server`，打包复制到 dist。
字段的 hover／focus 使用原始白色周界贴图，禁用保留普通皮肤与源 alpha0.5。
按钮正常／hover／pressed／locked 均使用对应原图；文字不加阴影。
标题文字居中是当前显式 Web 策略：源只声明标题框、top_middle 锚点及偏移，
没有在该节点明写 `text_alignment`，不能宣称已经恢复引擎默认对齐。
forced-colors 提供系统色控件及焦点提示，不要求它与普通原图模式相同。

## 验证状态

实际 browser04 为 67/67 PASS：桌面／Pixel7 模拟各 24 项交互，共48项；
另有 15 项完整材质 RGBA 零差检查，以及4项源透明度参数合同。
**四项半透明材质的最终像素仍未认证，不能将此表述为19项材质像素零差。**
源材质检查覆盖完整目标，没有容差、像素 mask、角点取样或贴图重绘。
Node/SSR25项通过，包含错误声明、原生属性、独立绑定和零 IO／回调；
完整 TypeScript 检查通过。

真实键盘状态检查单独验证 hover／pressed／locked 的唯一可见分支。
它发现了强制颜色模式下 hover 选择器压过隐藏原图规则的问题，已修正；
disabled 的系统色文本也不再额外降低透明度。普通原图模式没有因此改变。
forced-colors 测试验证的是 Web 系统色回退，不是原版高对比度界面。

首轮 browser01 的33通过／9失败保留：4项只读测试错误地等待 `aria-disabled`
按钮变为 enabled，另外5项把632px宽的测试表单放进移动视口后点击被遮挡。
修正测试宿主与明确的守卫探针后，输入／节点／动作断言均保留。
browser02 的44项交互通过及4项旧透明度候选失败也保留；
browser03 新增强制颜色检查的两项真实失败已由上述样式修正解决。

独立99格及66格实验包含训练、留出和原图格式对照，说明旧的单张图片合成规则
不能迁移到九宫格 group opacity；逐 patch 候选也没有获得完整资格。
因此没有为追求旧预测零差而改 source alpha、原图或颜色。
默认资格测试保留15项严格 RGBA检查，对4项只检查原始参数并记录完整未认证像素。
旧19项严格候选、原图和期望仍原样保存，重现命令与边界见
[半透明资格说明](EXTERNAL_SERVER_ALPHA_QA.md)。

当前代码的真实 React18／19 包、实际安装开发／生产四组合及最终构建预览结果，
由 `.cache/external-server-final-01/FINAL.json` 记录；历史阶段不能替代最终文件身份检查。
没有新的 Minecraft 捕获，不声称原生完整 GUI、字体、光标、选区、输入过滤、
游戏手柄导航或服务行为 pixel perfect。覆盖表仅该文件 C→有限A，
其余205行不变；A44／C33不是原生 GUI 完成率。

```sh
npm run test:external-server:node
npm run typecheck
npx playwright test tests/external-server.spec.ts tests/external-server-states.spec.ts tests/external-server-demo.spec.ts --project=desktop --project=mobile
npx playwright test tests/external-server-qualification.spec.ts --project=pixels
npm run verify:package
npm run verify:external-server:browser -- path/to/mcbeui-0.1.0.tgz unique-run-id
```

旧候选使用独立 `playwright.external-server-candidates.config.ts`；在本轮观察环境中，
它的四项失败是已记录的失效预测，不属于默认资格判据，也不是原生通过结果。
