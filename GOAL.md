# mcbeui

创建可发布的 React + TypeScript UI 组件库，复刻 Minecraft: Bedrock 的方角、像素字体、双层倒角、绿色交互状态和凹陷式控件。

## 范围

- 以 Bedrock Classic / JSON UI 为首版视觉基准，不把 Java Edition、Ore UI 与经典界面的细节混为一种规范。
- 类型完整、支持受控/非受控表单、转发 ref、原生表单提交、键盘操作、SSR 导入安全。
- Button、IconButton、Panel、Text、TextField、TextArea、Checkbox、RadioGroup、Switch、Slider、Combobox、Select、Tabs、Dialog、Badge、Progress、Alert、Separator、ItemSlot、PixelIcon。
- 设计令牌、独立 CSS、可选自托管字体、可交互展示页、API 文档、ESM 和声明文件。
- 查找并实际接入字体：MCBE Pixel 基于 Monocraft 用于英文，MCBE CJK 基于 Fusion Pixel 12px 用于中文；保留原版 Mojangles 自定义接入及原始开源字体。

## 验收

- 构建、真实浏览器交互测试、无障碍自动检查、桌面与手机截图检查通过。
- 从 Mojang 官方样本提取边框和颜色基准，记录来源、采样方法和字体许可。
- 展示 default / hover / pressed / focus / disabled 状态，整数像素倒角，无圆角、渐变或平滑缩放。
- 像素级还原是目标；只有固定游戏版本、屏幕、GUI scale、语言、DPR 和原版字体，逐像素对比之后才能声称零偏差。开放字体的字宽差异必须公开记录。
- npm pack 后在独立消费项目验证导入、类型、CSS 及字体路径。发布到注册表不在本任务范围。

## 进度

- [x] 建立目标，确认 React + TypeScript
- [x] 查找官方纹理参考与开源中英文字体
- [x] 从本机 Bedrock 安装中找到原版 Mojangles，接入可选本地预览
- [x] 实现 20 个组件及设计令牌，包括独立 Text 与原版样式 Combobox
- [x] 完成交互展示页与 API / 字体 / 视觉基准文档
- [x] 接入 MCBE Pixel 开源字体与本地 Mojangles 原字形，补齐 Text / Input 硬边阴影
- [x] 读取本机 1.26.6005.0 的 Classic 布局与纹理，68 个参考条目一致
- [x] 面板、弹窗、三态关闭图像、完整纹理裁切进度条按原版资源校准
- [x] 100 项浏览器测试：46 项交互、45 项皮肤零像素差异、5 项进度合成、3 项原始字体轮廓与阴影对照、1 项中文边缘检查
- [x] 实际 tarball 在 React 18.3.1 / 19.3.1 下的类型、SSR、CSS、字体验证
- [ ] 固定目标游戏版本、页面、GUI scale、语言和分辨率，完成原版截图逐像素对照与差异修正

Goal 保持进行中：首版组件库已实现，严格的游戏画面对照验收尚未完成。当前可通过 `npm run preview -- --port 4173` 打开展示页。
