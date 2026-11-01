# GuiLayer 的显式离屏栅格原点

2026-11-02。新增 `GuiLayer` / `renderGuiLayer` 的可选 `rasterOrigin: 'webgl' | 'top-left'`。省略时保留原来的 WebGL 路径；`top-left` 在离屏绘制中反射最终 clip Y，并统一背景、viewport、scissor、culling、readback 和显示复制的方向。调用者的源坐标、输出裁剪坐标和返回像素始终为从左上开始。

```tsx
<GuiLayer
  width={width} height={height} guiScale={guiScale}
  rasterOrigin="top-left"
  commands={commands}
/>
```

这个选项不改源布局的 physical floor/ceil、half packing、字体、纹理或 shader 内部的材质计算。image、sprite、model、text、entity 共用最终位置反射，entity 的 fog / originalClip 计算保持在反射之前。COPY pass 同样反射位置，因此可见 canvas 仍正向显示。原图和 atlas 上传方向保持一致。React 请求描述和冻结 frame 包含该选项，仅改变策略也会重新绘制；属性不会传到 DOM。

## 从原生残差到具体原因

输入来自已有 Minecraft for Windows 1.26.6005.0 / PIX 2610.28 的 Credits 帧，未重新运行游戏或采集。旧冻结证据 `.cache/credits-pix-cpu-study-01/FINAL.json` SHA256 `ba49877344fb894693700c282746c1f473e34bd31f4839ef554414dab1fc03c5` 保持原样。

- 背景是 queue0 / API67 / Global15 / PSO622，原始 32×32 resource284。读取实际 VB / IB / CB、shader 和 point/clamp sampler，792个四边形的索引顺序全部核对。
- 新目录中的 CPU 基线重现旧预测 SHA256 `7276cf1c2c6175d28195bd98e96c91c97a2a18c703275f9107569c609875ac9e`：整个2570×1402目标仍差1530像素，全部在Y1392，最大通道差30。显式16.8最近邻地址量化未消除差异。初版复现遗漏末列的局部UV，得到9945差异；失败输出另存 `initial-incomplete-uv-*`，随后按实际UV修正，没有覆盖失败记录。
- 独立源码研究保留10种三角形／裁剪／浮点插值模型，未用实际目标像素生成预测。它们不能解释全部残差，未据此调整产品插值或对单行打补丁。
- 实际浏览器的普通 WebGL 图像 shader 路径：SwiftShader差3620像素；ANGLE D3D11差2090像素，后者仅在Y1372。这与位于像素中心的水平边归属有关；不能把 CPU1530与浏览器2090合并为同一种误差。
- 通用最终clip Y反射加对应的目标方向转换后，ANGLE D3D11在整个2570×1402目标上RGBA零差；SwiftShader仍差80像素，最大通道差30。没有只比较ROI、忽略alpha、遮掉文字区域或把参考截图用作背景纹理。

依据 Microsoft [D3D11.3 functional specification](https://microsoft.github.io/DirectX-Specs/d3d/archive/D3D11_3_FunctionalSpec.htm#3.4.1) 的坐标吸附及属性插值规则，源码插值基于吸附后的顶点；[point sample addressing](https://microsoft.github.io/DirectX-Specs/d3d/archive/D3D11_3_FunctionalSpec.htm#7.18.7) 还包含纹理地址精度要求。这些规则用于设计有限模型，不能证明所有 GPU 都选择相同的允许精度。CPU双精度矩形计算、实际D3D11和SwiftShader结果分别保留。

## 实际产品核心与验证边界

使用修改后的 `renderPreparedGuiLayer` 实际代码重新打包，输入捕获的完整索引网格、原始纹理和矩阵，在独占的离屏FBO中绘制并执行真实live COPY。未使用实验 runner 的替代 shader。

| 后端 | 原生目标差异像素 | live canvas 与返回像素差异 |
| --- | ---: | ---: |
| Chromium156.0.8078.4 / ANGLE / RTX3050 Laptop / D3D11 | 0 / 3,603,140 | 0 |
| 同版 Chromium / ANGLE / SwiftShader Vulkan | 80 / 3,603,140 | 0 |

D3D11预测与实际目标的完整RGBA SHA256均为 `a5c0c453c0202480abaaef3b70c1ae42ab1139226ae40dc88a25ea47bbdbd45b`。底层原始readback按实际rowPitch10496解码，未按width×4猜stride。两个实际核心结果位于 `.cache/credits-background-raster-01/prepared-{d3d11,default}-01/RESULT.json`。独立逐字节复核位于 `.cache/credits-background-independent-02/AUTHORIZED-READONLY-COMPARISON.json`。

这是指定捕获背景、指定后端和**内部 prepared GPU 边界**的结果。它绕过公开源布局计算，不能称公开 `CreditsScreen`、源tile-origin求值、滚动时间或所有字体整页都已还原。公开 `layoutGuiImages` 仍先物理floor/ceil再half packing；把捕获后的half顶点当成源rect会再次量化，不能用这种输入伪造公开源布局通过。SwiftShader80像素残差也阻止跨后端pixel-perfect结论。

公开持久回归位于 `tests/gui-layer.spec.ts`、`tests/gui-model.spec.ts` 和 `tests/gui-entity.spec.ts`：独立手算半像素top edge的完整平面、策略单独变化后的React新请求／正向呈现、不对称初始纹理、文字和模型culling、image/sprite/model/text切换、真实24/8深度的entity viewport、entity后恢复普通绘制、局部scissor与crop。它们是自编源输入与独立期望平面，不是原生整页认证。

## 本次执行与包身份

- 完整D3D11浏览器批次53/53 PASS，0 skip / flaky；见 `.cache/credits-background-raster-01/browser-d3d11-01.json`。使用实际RTX3050后端，覆盖上述三份完整spec，而非只挑新增用例。
- 默认SwiftShader批次48 PASS / 5 FAIL。一个旧GUI5文字对照差273像素、最大通道差4；另四个旧native模型的FBO/live像素为零差，但断言要求NVIDIA Direct3D11后端而失败。用HEAD三份旧GuiLayer模块复跑后，五项失败的状态、错误和完整像素报告均一致，见 `BASELINE-COMPARISON.json`。不能把软件后端批次写成53全绿。首次baseline配置未继承原Vite虚拟字体插件及watch exclusions，发生导航／reload失败；该轮无比较资格，原记录另留 `baseline-01.json`，有效复跑是 `baseline-02.json`。
- `npm run verify:package` PASS：实际安装的React18.3.1／19.3.1，205组件／223 runtime values、ESM、SSR、声明、CSS、字体、许可及现有Invite/Credits/Chat/Progress/FileTransmission门禁。公开依赖闭包仍162模块／676份原字节资源；没有增加组件数。
- 两个实际安装消费目录另验证新参数：每个peer均独立打包已安装的`mcbeui`到浏览器，验证省略／webgl／top-left三个策略的返回像素及live像素，React仅改变策略后的新canvas和正向结果，以及严格声明与两个非法策略负例。见 `installed-origin-01/RESULT.json`。此轮是无源别名的esbuild浏览器消费，不称默认Vite开发／生产矩阵。
- 受检功能tar：`.cache/credits-background-raster-01/functional-candidate/mcbeui-0.1.0.tgz`，SHA256 `82de9495027daa3704c9fd820c2e2fe0f973cf246ffcec0bb0c6265594bfcb94`。实际安装包ESM SHA256 `4ddfadb4363b7d4e17e2744184f5d9982f8535274c0aac32a7e9abfdfe0bc0fb`，DTS `d7daf8087845b0eca7e03e705d358cbf3aaa62352f4d4f63fc7770ad1256b202`。最终仅文档包的非文档字节一致性另存 `final-documentation-pack/IDENTITY.json`，不覆盖功能tar。

所有本轮浏览器都在finally关闭。未打开Computer Use，也未重新启动Minecraft、PIX或原生采集；本轮自有开发端口另记服务关闭收据，用户4173不在操作范围。
