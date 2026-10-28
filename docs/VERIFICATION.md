# 验证记录

日期：2026-10-29（Asia/Singapore）。

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 浏览器全套 | 100/100 PASS | Chromium 桌面 / Pixel 7 模拟共 46 项交互，另 54 项 DPR=1 像素检查；无跳过 |
| 皮肤像素 | 45/45 PASS | 原始参考 PNG 独立九宫格 / 最近邻渲染，包含面板、弹窗外框和三态关闭图像，全部 0 差异像素 |
| 进度合成像素 | 5/5 PASS | 空、半满、全满、小数、窄屏；完整原图九宫格按游戏像素裁切，全部 0 差异像素 |
| 原版字体像素 | 3/3 PASS | 原始 Mojangles TTF 轮廓独立栅格化，对比 Text 无阴影 / 2px 阴影、Input 2px 阴影 |
| 中文像素边缘 | PASS | MCBE CJK 的示例与 2px 阴影只含实心前景 / 背景 / 阴影像素，无彩边或半透明边缘 |
| 本机版本参考 | PASS | Bedrock 1.26.6005.0；68 个相关 PNG / JSON 与固定参考一致 |
| 字体加载 | PASS | MCBE Pixel、MCBE CJK、Monocraft、Fusion Pixel、本地 Mojangles Pixel 实际加载 |
| 自动无障碍 | PASS | 页面、Dialog、Combobox 无 axe serious / critical 级问题；不是人工屏幕阅读器认证 |
| 320px 重排 | PASS | 页面宽度不溢出；桌面和手机截图留存 |

交互检查包含原生表单、Checkbox / Switch / Radio、Slider 键盘与值、Tabs 循环 / 禁用跳过 / 面板保留、Dialog 焦点循环 / 恢复 / Escape / 滚动锁定、Input 错误关联 / 只读 / 禁用 / 阴影、Combobox 活动与选中分离 / 键盘取消提交 / 类型前缀 / reset / required / 受控值 / 定位 / Dialog 内 Escape 优先级、浅色 Panel 内表单输入与对比度、搜索与代码展示。

构建与实际包消费由 `npm run verify:package` 验证：严格 TypeScript、ESM 与声明文件、展示页构建、20 个导出、React 18 / 19 实际 tarball 安装、SSR、消费项目 tsc、CSS / 字体 / 许可路径，以及排除本地 Mojangles 字体。生产预览另用 `node scripts/check-preview.mjs` 验证，截图位于 `.cache/preview`。

证据目录：`test-results`、`playwright-report`、`.cache/pixel-comparison`、`.cache/font-oracle`、`.cache/consumer-react18`、`.cache/consumer-react19`。原始字体和游戏资源仅在本机忽略缓存中保留。

未覆盖真实手机设备、Firefox、Safari、人工屏幕阅读器、完整游戏画面对照。游戏当前被 Xbox Live 登录错误 0x80004005 阻断；独立控件与字形通过不代表整页游戏 UI 零偏差。详见 FIDELITY.md。
