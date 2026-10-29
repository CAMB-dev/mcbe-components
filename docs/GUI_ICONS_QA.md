# 原版 GUI 图标与 invalid 表面

当前 GuiIcon 与 guiIconNames 已实现，增加1个组件与1份数据；公共范围118个组件、4份数据、3个函数，共125个运行时值。旧16个 PixelIcon SVG 保留。图标 / invalid 的正式套已分别通过；本轮实际React18/19包消费与生产图库可见smoke均已完成，不将这些局部通过扩大为原生整 GUI 零差。

## API 与原图合同

GuiIconProps 接收必填 name: GuiIconName、可选正整数 scale（默认1）、label 及 HTMLSpanElement 属性；ref 指向 span。未知 name、非正安全整数 scale 或溢出的整数尺寸拒绝为 RangeError。默认装饰并对 AT 隐藏；label / 显式 ARIA 名称可将外层命名为 img，内层 img 的 alt 始终为空，避免重复读出。显式 ARIA / style 覆盖由宿主负责。

默认尺寸为原 PNG 物理宽高×scale，不按源使用尺寸 / base_size 自动改框、不裁切、不 tint，也不按 hover / disabled 自动选图。非方形原图保留宽高比。组件使用 inline 布局 / nearest 显示样式，无新增独立 CSS 入口；图像 URL 随包引用，guiIconNames 供调用方枚举，GuiIconName 与 GuiIconProps 作为类型导出。

`docs/gui-icons.json` 记录150张原图，共52,654字节；类别为设置33、导航34、库存 / 合成26、社交23、设备13、反馈21。其 manifest 状态标签为146个 default、4个 hover，是已选原文件的分类，不是完整引擎状态表或所有版本的全图标清单。

每项保留原始 PNG / RGBA hash、物理尺寸、固定官方来源、原UI使用引用和安装版基础包身份，150项均匹配；原字节不重编码。原图相同不证明当前激活版本覆盖包。`scripts/prepare-gui-icons.mjs` 根据已提交清单及固定官方full归档生成数据，默认不联网，支持 --check；不随包发布安装归档或私有截图。

原图保存在 dist/assets/gui-icons；同固定归档的原222字节 LICENSE.md 随该目录分发，generator --check 核其原字节。授权与完整上游声明见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。原Minecraft素材不被项目MIT许可重新授权。

## Producer 辅助验证

`.cache/gui-icon-qa/summary.json` 已记录 core / demo typecheck、generator --check 及 diff 检查通过。独立构建的整库入口含125个运行时值，150个资源URL全部解析为所复制原PNG；实际 bundled consumer 中150图均加载，span ref、装饰 / 命名 ARIA、非方形原图scale3后的39×60、10项无效参数SSR RangeError检查通过，无页面错误或坏响应。

这是 producer 的源身份、构建URL和功能 smoke，不代替 root 的真实 React18/19 tarball消费，也不算新增正式像素 case。独立完整RGBA与状态矩阵结果见下文，不从“图片已加载”推断像素零差。

## invalid 的源结论与适配

独立审计 `.cache/invalid-state-independent-audit/REPORT.md` / source-pins.json / native-identity.json 比较安装版与官方原UI：common.text_edit_box 使用 default / hover indent，multiline 继承该路径，没有该通用定义的额外粉色 validation 框。该有限观察不声称游戏任何位置都没有特殊错误皮肤。

生产删除三条额外粉色 invalid border / outline 规则，保留原 default / hover / keyboard-focus 表面与 aria-invalid / 描述关联。TextField、TextArea、Select 和 Combobox 的错误消息复用原 ErrorGlyph13×20，错误文字仍为可覆盖的 Web 可读性 token；源 $error_text_color 为红色，但本轮不声称所有主题token都是该原值。该消息排布属于 Web 表单适配，不是恢复的原生通用 invalid 输入框布局。仅 aria-invalid 没有错误内容时不凭空生成文案。

历史Anvil /Smithing曾把18×12 game逻辑box均作为stretch paint。新Anvil invalid实际draw证明原15² cross在box内contain为12²，水平inset3；旧canonical stretch自对照不证明native比例，见 [ANVIL_IMAGE_QA.md](ANVIL_IMAGE_QA.md)。Smithing旧18×12配置未据此取得native认证，Grindstone仍15²。Trading红槽原图属于另一状态；Keybinding错误语义不证明通用粉色框存在。无效结果仍用 aria-disabled 保留焦点并守卫 primary /secondary；原生hover_text等互动未因原图对照认证。

## 本轮分项结果

| 验证 | 当前状态 |
| --- | --- |
| GuiIcon 独立正式套 | 新增11/11 PASS、0 skip / flaky，15.7秒；六完整图集23,654,400像素RGBA0 |
| invalid 独立正式套 | 新增17/17 PASS、0 skip，14.0秒；源皮肤、外halo、focus、语义、crossout与结果守卫通过 |
| 默认收起的主图库 | 生产150张几何＋25项功能辅助检查通过，含搜索 / 类别 / 3倍缩放 / 卸载重开 / 320px；不计175个正式case |
| React18 / 19 实际包消费 | 18.3.1 / 19.3.1通过，125值、150PNG真实URL与原license hash已核，两消费者各253个dist条目同字节；身份见最新VERIFICATION |

正式通过也只证明列出的原图及 Web 行为，不等于原生最终光栅、所有状态、整屏或跨平台认证。字体与 advance 接入的独立58项正式结果见 [WORKSTATION_TEXT_QA.md](WORKSTATION_TEXT_QA.md)，两组结果不混计。


## 独立正式证据与限制

GuiIcon 报告 `.cache/gui-icons-independent/FINAL_SUMMARY.json` / report.json：11/11 PASS。150份资源的原字节及全部解码RGBA（包括alpha0 RGB）分别与固定官方full ZIP独立读取得到的条目相同。整数scale1 / 2 / 3×深 / 浅两背景的六张完整1120×3520图集包含150图与空白格，共23,654,400个呈现像素，RGBA零差、最大差0；没有 ink mask、容差、裁切、tint或重绘。期望由测试自有 ZIP / CRC / PNG 路径和独立浏览器原图控件构成，不读取生产manifest反推期望。SSR、proto / 非法值、单次可访问命名、SPAN ref / 事件及旧PixelIcon兼容也通过。

invalid 报告 `.cache/invalid-state-independent-audit/FINAL.json` / results.json：17/17 PASS、typecheck通过。四类控件的完整 normal / error 表面加外侧6CSSpx halo在默认 / hover状态一致；两类原input / textarea九宫格、四个完整ErrorGlyph与三种crossout原图合成均零差。白色2px键盘焦点、disabled / FormData、required恢复、无效结果可达且操作被守卫已验证。

TextArea 原生 UA resize grip 在生产和独立Web期望中均保留；crossout优化PNG清除了alpha0 RGB，故原始PNG byte pin与实际可见RGBA合成分别核查，不把优化PNG原字节声称等于原图。早期QA中的整数取景、同底图、UA grip及键盘导航fixture问题均修在独立测试中，没有改生产、mask或放宽容差。

这些结果认证完整原资产及已声明Web表面 / 行为。Error文字主题token是可读性适配，Smithing的可访问原因不等于引擎hover_text renderer，其他UI状态 / native最终光栅 / 整屏 / 跨平台仍不由该测试认证。


## 最终生产展示

`.cache/gui-icons-final-production-smoke.json` 记录150张几何检查与25项功能辅助断言通过，不计为175个正式case。默认收起0图，Browse挂载150张完整原图，全部响应字节与原文件相同、无损坏图片；真实搜索 / 类别 / scale3组合、无结果清空恢复、卸载 / 重开均通过。17×17选中图按3倍显示51×51，320px文档无整体横溢出。

invalid保持普通原图4px inset框，无额外outline / box-shadow，原ErrorGlyph自然 / 显示均13×20。工作站字体默认0视图 / 0 Offscreen，开启后五处ready共享1个实际context，关闭后全卸载并live0，选项回调保留；主Bitmap预览仍独立WebGL243×100，旧Select仍为共享popup。页面、控制台、请求错误均为空。root实际IAB亦操作图库及invalid焦点；这不是新的native全GUI像素认证。

`.cache/gui-icons-final-production-identity.json` 确认8份入口与site构建字节一致。主 `main-DlCxN6mA.js` 为144,615字节，轻量图库分类 / 尺寸表替代完整provenance输入；完整资料仍在docs。上下文截图留在忽略目录的 gallery-context / invalid-context PNG。实际包身份及856唯一正式用例的多批次累计见 [VERIFICATION.md](VERIFICATION.md)，不将本节辅助检查再加入正式统计。
