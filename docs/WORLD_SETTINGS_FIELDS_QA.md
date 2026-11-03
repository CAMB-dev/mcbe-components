# World Game／Multiplayer／Navigation 验证

2026-11-03，源基准为官方 Bedrock Samples `v1.26.60.5`、commit `15701fa9c13923f12662984c32c124327e40e3d3`。这是具名页面与 World／Add-ons 导航部件的验收，不是完整 `WorldSettingsScreen` 或原生整页像素认证。[API 与边界](WORLD_SETTINGS_FIELDS.md)。

## 本次实现

- `WorldGameSettings` 固定 Game69 个直属控件及116条展开记录，`WorldMultiplayerSettings` 固定8个直属控件；宿主提供完整具名 bindings／conditions／strings／metrics，不能注入自由 rows 或改写源控件身份。
- `WorldSettingsNavigation` 按真实 World／Add-ons 子树组装缩略图、普通／教育启动行、分区、间隔及包 provider；Switch 使用它自己的两张原图，加载条使用原始十帧 UV，包边框17×17与图标15×15保持独立。
- 共用字段内核增加真实 panel、独立权限布尔值、URI intent，以及显式颜色码显示。原始输入值不被颜色码解析，URI只产生意图，不发起导航。
- 可选 `materialRendering` 复用现有 `GuiImageLayer`。必须声明 `source-image`、`ceil` 物理窗口策略和 solid／transparent 背景；缺省仍为 CSS。DOM文字、输入、按钮、ref与事件保留，加载／失败恢复 CSS。超出 ceil 后像素预算通过渲染错误回调退回 CSS。forced-colors 隐藏装饰画面，保留系统文字与按钮边框；不认证该模式的图标像素一致性。

## 当前具名检查

各批次独立记账，重复检查不累加为一个通过率。

| 检查 | 当前结果 | 范围 |
| --- | --- | --- |
| Node最终组合 `node05` | 108通过，0失败／skip | 八份相关测试文件；包含具名页面、基础内核、私有树、渲染适配与owner生命周期 |
| 普通交互 `browser06` 的 desktop／mobile | 74通过 | 36个基础设置合同＋38个具名页面合同；该批另一个材质测试的错误事件类别断言单独保留 |
| 修复后材质专项 `browser08` | 14通过，0失败／skip | 真实导航／启动点击、owner重新开启、实际context loss／重试、GUI1／2、十帧加载、Switch与forced-colors |
| 材质完整画面 | 34平面、5,109,100个RGBA像素，差异0 | DOM独立提取几何＋Node解码完整原图，与现有GPU引擎参考比较；共享shader，因此不是Minecraft独立原生oracle |
| 实际安装包 `package03` | React18.3.1／19.3.1均通过 | 264组件＋6数据＋13函数＝283运行时值；新增14组SSR合同、24条负类型合同，基础依赖合同另记 |
| 原图与CSS闭包 | 两peer各31个实物文件＋1个原始内嵌图通过 | 完整原图／原metadata／license／独立CSS路径；基础Settings的49个文件另记，不重复加总 |
| 生产展示 `built01` | 6通过 | 桌面、Pixel7和320px各2项，三场景、触控、字段接受、真实资源包挂载与宽度／滚动条 |
| 生成准备脚本 | 三项 `--check` 通过 | Source schema、原导航资产和本地化demo均可重现；缺失的两个Multi翻译key保留明确宿主占位 |

受检功能tar：SHA256 `b95f385810da826c75ad9f26b20da979e49c8b90a2ffa19ca36443feb10827f6`，7,215,963 bytes。后续文档打包必须逐项证明runtime／package／license成员与此包相同。

实际安装后的开发／生产四组合 `installed03` 均通过：每组合6类交互检查、8张完整画面，16对开发／生产完整RGBA对比共7,072,000像素差异0，脚本／控制台／HTTP错误均为空，所有runner自有浏览器与5483／5484服务关闭。实际Chromium156.0.8078.4，ANGLE／Vulkan SwiftShader；不把该结果声称为NVIDIA或跨GPU原生资格。

生产预览HTML与`site/index.html`逐字节一致。初始视口 scoped Axe原始结果有1个`label-title-only`（睡眠百分比slider）；DOM有明确中文label且Chrome实际可访问名称为“玩家睡眠百分比”。将该slider滚动进入源内容viewport后，对同一完整demo scope重跑为0报告／26passes／2incomplete。两个raw结果均保留，不抹掉初始报告，也不称全站WCAG认证。首个审计脚本曾错误使用browser.newPage，改为独立browser.newContext后执行；没有修改产品来迎合审计。


## 保留的失败及修复

旧32个 CSS 数学候选对照为17通过／15失败，原expected、全平面PNG和报告保留。差异涉及半相位覆盖、半透明量化、加载条与provider缩小采样；有限模型仍有反例，没有恢复统一原生规则。可选GPU路径的集成零差不抹掉这批失败，也不把同引擎对照变为原生认证。

实际安装验证曾发现两处产品问题，均保留旧包和失败记录：

1. 材质state在语义父组件中更新，重建callback身份，使延迟导航请求被取消。现在由私有子组件管理绘制state，源交互树不因解码／hover repaint重建。
2. 子组件反复清除再写回相同class，触发ScrollArea测量反馈，在React18实际页面中阻塞点击。现在owner只在挂载／卸载时管理，状态更新只在DOM值改变时写入。有限诊断截断过千次observer反馈证明了触发链；截断仅存在于私有诊断，产品没有该补丁或阈值。

`browser06` 材质新测试曾把Frame示例统一的`intent`记录误读为standalone的`launch`；`demo01`曾在root而非pane上读取`data-input-mode`。两者修正测试定位／预期，没有放宽像素标准。早期字段与导航单元测试的fixture问题保留在各自分批记录中。

## 尚未认证

本次Computer Use只做运行窗口发现：两种窗口枚举与进程查询均未找到Minecraft。没有启动、输入或采集新原版画面，随后已重置Computer Use会话。现有字体／其它屏幕的原生证据不能移用于本页。

完整World设置组合仍需Classroom、实际server generated_form与独立submit sibling、EduCloud／Debug及其它源挂载、上下文服务，以及原生字体、intrinsic／锚点／剪裁／默认几何与完整画面对照。Cloud两张图与精确大小写White原文字面资源缺失时必须由宿主显式解析；不能用相似PNG冒充原文件。组件数量和以上Web结果不代表完整目标完成。

可复核入口：`tests/world-settings-pages.spec.ts`、`tests/world-navigation-material-profile.spec.ts`、`tests/world-settings-demo.spec.ts`、`scripts/verify-world-settings-pages-package.mjs`。本机不可分发证据位于 `.cache/world-settings-pages-qa-20261103-01/`，原版／字体私有材料不进入npm包。
