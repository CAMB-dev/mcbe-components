# 验证记录

日期：2026-10-29（Asia/Singapore）。

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 浏览器全套 | 214/214 PASS | 102 项桌面 / 手机组件及交互检查、61 项既有像素检查、9 项独立工作站源检查、12 项熔炼 / 合成 QA、5 项附魔渲染 QA、18 项容器 / 铁砧 QA、7 项图像原语检查；最后运行结果见 test-results/.last-run.json |
| 皮肤像素 | 51/51 PASS | 原始参考 PNG 独立九宫格 / 最近邻渲染，包含重做的四态 ItemSlot、砂轮箭头、附魔选项三态，全部 0 差异像素 |
| 进度合成像素 | 5/5 PASS | 空、半满、全满、小数、窄屏；完整原图九宫格按游戏像素裁切，全部 0 差异像素 |
| 原版字体像素 | 3/3 PASS | 原始 Mojangles TTF 轮廓独立栅格化，对比 Text 无阴影 / 2px 阴影、Input 2px 阴影 |
| SGA 原始图集 | PASS | AIZ GUI 2 字形与独立原图逐像素采样一致，无插值彩边；不证明原生 rune renderer 的换行和基线 |
| 中文像素边缘 | PASS | MCBE CJK 的示例与 2px 阴影只含实心前景 / 背景 / 阴影像素，无彩边或半透明边缘 |
| 本机版本参考 | PASS | Bedrock 1.26.6005.0；101 个 UI PNG / JSON 与固定参考一致；4 份工作站 JSON 与官方 v1.26.60.5 full release 完整解析结果一致 |
| 独立工作站 QA | PASS，验收仍有缺口 | 源公式、格子、dust / rune / cost 组合、材质归档、原字体 advance、键盘导航；详见 WORKSTATION_QA.md，不能据此签收整个 GUI 的最终栅格 |
| 合成 / 熔炼 QA | 12/12 PASS | 4 个右面板布局、每个库存格、源焦点路径、6 个独立原 PNG 裁切组合；不证明原生引擎 ratio 映射和取整 |
| 附魔渲染 QA | 5/5 PASS | 实际 WebGL、开合 / 翻页与重置、主页面、经验状态、青金石底层；Java 参考书本和阴影系数仍待 Bedrock 实拍 |
| 容器 / 铁砧 QA | 18/18 PASS | 六种存储规格、逐格玩家库存、铁砧原始浮点布局 / 状态 / 焦点，4个原PNG采样样本RGBA零差；不认证原生整屏 |
| Image / NineSlice | 7/7 PASS | 静态SSR、几何校验、语义 / ref / 内容交互与6个原PNG区域零差；限制见image-geometry.json |
| 字体加载 | PASS | MCBE Pixel、MCBE CJK、Monocraft、Fusion Pixel、本地 Mojangles Pixel 实际加载 |
| 自动无障碍 | PASS | 页面、Dialog、Combobox 无 axe serious / critical 级问题；不是人工屏幕阅读器认证 |
| 320px 重排 | PASS | 页面宽度不溢出；桌面和手机截图留存 |

交互检查包含原生表单、Checkbox / Switch / Radio、Slider 键盘与值、Tabs 循环 / 禁用跳过 / 面板保留、Dialog 焦点循环 / 恢复 / Escape / 滚动锁定、Input 错误关联 / 只读 / 禁用 / 阴影、Combobox 活动与选中分离 / 键盘取消提交 / 类型前缀 / reset / required / 受控值 / 定位 / Dialog 内 Escape 优先级、浅色 Panel 内表单输入与对比度、搜索与代码展示。

新增检查覆盖：空 / 0 / 单个 / 堆叠数量、耐久、物品 tooltip 焦点与 Escape、Dialog 内 tooltip 层级、网格单一 Tab 入口 / 方向键 / 禁用跳过 / Ctrl+End、secondary 操作、砂轮受控结果与附魔回调、27+9 格库存、320px 局部滚动与工作站无障碍检查。

构建与实际包消费由 `npm run verify:package` 验证：严格 TypeScript、ESM 与声明文件、展示页构建、50 个导出、React 18 / 19 实际 tarball 安装、SSR、消费项目 tsc、CSS / 字体 / 原版书本材质 / 许可路径，以及排除本地 Mojangles 字体和 SGA 图集。生产预览另用 `node scripts/check-preview.mjs` 验证，截图位于 `.cache/preview`。

证据目录：`test-results`、`playwright-report`、`.cache/pixel-comparison`、`.cache/font-oracle`、`.cache/independent-qa`、`.cache/consumer-react18`、`.cache/consumer-react19`。专有字体与 SGA atlas 仅在忽略缓存中；实际展示物品在 demo/assets，公开书本材质在 src/assets，分别记录来源。

未覆盖真实手机设备、Firefox、Safari、人工屏幕阅读器、完整游戏画面对照；Bedrock 原生组件清单当前 102 项，还有 52 项 planned。附魔 3D 书本、符文换行 / 原生基线、tooltip 与物品 glint / 耐久 renderer 仍待校准。游戏当前被 Xbox Live 登录错误 0x80004005 阻断；独立控件与字形通过不代表整页游戏 UI 零偏差。详见 FIDELITY.md。
