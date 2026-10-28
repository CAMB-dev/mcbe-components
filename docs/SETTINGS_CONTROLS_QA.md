# Settings controls 独立验证

目标为已安装 Bedrock `1.26.6005.0` 的 Classic JSON UI，浏览器 GUI scale 2 / DPR 1。验证分为实际 Web 交互、公开 JSON 几何、原始 PNG 表面；**不把这些结果当成原生设置整屏、字体基线或游戏输入引擎的认证。**

## 独立来源

直接读取安装包的 `data/resource_packs/vanilla/__brarchive/ui.brarchive`、`ui/settings_sections.brarchive`、`textures/ui.brarchive`，以及官方 `bedrock-samples-v1.26.60.5-full.zip`。没有从生产 CSS、纹理生成 manifest 或浏览器截图倒推素材期望。

完整 ZIP SHA256：`d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。源文件来自 [Mojang 官方样本](https://github.com/Mojang/bedrock-samples/tree/15701fa9c13923f12662984c32c124327e40e3d3)。六份完整 public JSONC 经 TypeScript JSONC parser 解析后与安装包 JSON 对象逐项相等：

| 文件 | Public SHA256 |
| --- | --- |
| ui_common.json | `0aae480d123b2c8667463776f8b0eabad665bc0378b287acd0babcf41d8083a6` |
| ui_template_toggles.json | `efe2bf9fab47aa5e29d7116a2aa705a964a42b0ef86c947c4e46188be9ac2a01` |
| ui_template_buttons.json | `3e250faef134965386ced074d73c998d2a363c79fed14ec928668cb7ff70ea96` |
| _global_variables.json | `ea39206de2c7b6f157def5cdf1662767c0ccd9560dfafb1378c3c364b236f69b` |
| settings_sections/settings_common.json | `36863803c56e42d31b915aa9df13cf88cc43a528eb40c76cbf26c911ef7b3ecf` |
| settings_sections/controls_section.json | `a21e90f7d63f93e1683858da1d5d51271585d2d7af729c9c5fdaa28d8e68d5f4` |

测试独立固定十张 PNG 的 hash / 物理尺寸，包括五张本轮素材及五种既有按钮状态。前五张为：

| 原 PNG | 尺寸 | SHA256 |
| --- | --- | --- |
| magnifying_glass.png | 7×7 | `f3aebd4ae834bf0b7e08c517a1bb9d166cb3a7bac60cec37659cefb7e1627b29` |
| close_X_button.png | 15×15 | `90c419d3f7caaf146d566d80e0aa4d340dde485c33fc4490fb440810f3165286` |
| close_X_button_hover.png | 15×15 | `207a4d09f161b60e396caadba5f135985b6304787bcd9aa42d82f394511ee2bf` |
| text_label_box.png | 4×4 | `3e97f09cef95d5d42d557d4971233a46f12a0e754a6c0e445dfb8f56a5b13b42` |
| undoArrow.png | 14×14 | `41eff2b295f28ccb2f7fb3cb163f03fc95a02439ec87173c3fa29bccacce3653` |

## 可由源确定的范围

- `light_template_toggle` 的 unchecked / checked / unchecked-hover / checked-hover / locked 分别使用 `button_borderless_light`、`button_borderless_lightpressednohover`、`button_borderless_lighthover`、`button_borderless_lightpressed`、`disabledButtonNoBorder`。默认外边框来自 `[.075,.075,.075]`，hover 边框白色。
- `text_edit_control@common.text_edit_box` 将 magnifier 覆写为 8×8、offset `[0,-.5]`，而底层 `text_edit_box` 默认是 10×10；不能把二者混用。Clear 为15×15，图标本体的物理 PNG 尺寸与显示尺寸分别验证。
- `section_toggle_base` 行高30、button panel override高31；`toggle_button_control` 标签 offset `[34,0]`，glyph offset `[5,0]`。测试只把实际行高60px列为布局验收，**未认证全部 panel 溢出、anchor 舍入与原生整屏组合**。
- `option_generic_core` 堆叠 spacer1px、底部4px；对应2px gap、8px底部间距。标签和 description 的 HTML 关联是 Web 适配行为。
- `keymapping_item` 行高35、控件高31、绑定宽 `40%+1px`、reset宽 `15%+1px`；reset 图像显示16×16。标签颜色来自 `$generic_button_text_color=[1,1,1]`，与普通按钮的暗色文字不能混用。

## 交互与发现的缺陷

双端测试覆盖 Toggle 的 Enter / Space、受控状态与 disabled；Search 的清空、焦点、受控值、readonly / disabled、Enter / IME、FormData、正常和取消的 form reset；Navigation 的焦点与选中分离、跳过禁用、循环 / Home / End；SettingRow 的 label / description / disabled；Keybinding 的物理组合键、修饰键 / repeat / IME 忽略、Escape / Tab、清除、hidden FormData、reset 与 Dialog Escape 层级。

独立测试确实抓到了生产缺陷：Search 与 Keybinding 的 document capture reset listener 在 `queueMicrotask` 中过早恢复初值，使 React `onReset.preventDefault()` 无法阻止组件状态重置。修复由主实现方完成：延后到 task、等待完整事件派发后检查 `defaultPrevented`，并清理卸载时的待执行 timer。两个稳定失败的取消 reset 回归随后通过，完整双端验证也已通过。

## 像素比较范围

五种 Toggle 的完整空文字按钮表面，用原 PNG 的独立整数 nine-slice compositor 比较。Keybinding 标签只验证背景表面，显式隐藏文字绘制并保留真实标签框尺寸；另有白色文字计算值断言。四个图标状态按源声明的显示尺寸与直接原 PNG 比较。

所有被测表面先移到整数 CSS 坐标，避免页面前方的字体流排版产生半像素 y 导致 locator screenshot 多裁一行。图标比较使用固定不透明 `#28292a` 底色，验证的是素材、采样和声明尺寸。没有遮罩掉组件像素差异后声称整屏相同；上述文字遮蔽和背景隔离是明确限定的局部表面测试。

初始参考截图遇到的尺寸误差来自测试平面：分数坐标造成多一行；百分比 clear span 移到 fixed 后参考 containing block 改变。两者均只修正独立 QA 定位与保持尺寸，未改变生产样式、容差或原图。

原生字体栅格化、完整导航 panel 边框溢出、游戏按键冲突策略、平台保留快捷键、输入法系统与原生设置整屏仍待游戏运行时证据。Web 表单 / 键盘适配的通过不能替代这些证据。

## 运行状态

交互：桌面 / 移动共24项通过。源图与几何：最终13项全部通过（23.3秒），合计37项通过；完整 demo TypeScript 检查通过。像素比较要求严格 **0 RGBA 像素差异**，没有通道容差。

验证服务使用独立5196端口，所有 trace / screenshot / 差异图片保存在 `.cache/settings-qa-output`；没有使用或清理共享 `test-results`。

## 说明文字颜色窄修回归

后续只读复核确认：默认共享 `--mc-text-muted:#b1b2b5` 带有通道偏色，而原始 `$option_description_text_color=[.7,.7,.7]` 明确为中性灰。独立说明文字现使用 `--mc-setting-description-color`，默认 `#b2b2b2`；Panel 将该 token 连接到自身 `--mc-text-muted`，保留普通 Panel 的 `#4c4c4c` 和 inset 的 `#dddddd` 语义配色。宿主可显式覆写独立 token。

源值 `.7×255=178.5`；**178 是本项目显式 Web 量化值，不是由 JSON 认证的原生 GPU 8-bit 结果**。新增断言重新读取并校验原始 global JSON hash，验证源三通道相等、Web 默认 `(178,178,178)`、宿主覆盖，以及普通 / inset Panel 的继承颜色。

此次按窄修范围只运行新增颜色用例与双端 Settings / Panel 可访问性检查，3项全部通过（7.2秒），完整 demo TypeScript 检查通过。没有重复运行既有37项或全套450项。新增检查同时验证真实 Panel 内的 label / description 关联及无严重、关键可访问性问题。
