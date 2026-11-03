# 原生字形残差：采样路径诊断

后续TrueType缓存已从原始TTF完整重建，见[缓存生成工具](CLASSIC_TRUETYPE_CACHE.md)。这是另一条POINT字体路径，不解决下面Unicode BitmapSmooth的SwiftShader38点差异；原反例与采样结论保持原范围。

2026-11-03 在上一阶段的 U+6D3B“活”字案例上继续排查。现有公共 `renderGuiLayer`、原字页、2570×1402 完整目标、GUI5、明确宿主 origin 和原生 before 背景保持不变。没有改默认 shader、UV、字体、字宽、基线、阴影或容差。

## 当前结论

软件 SwiftShader 的 38 个不同像素可稳定复现，最大通道差为 5；同版本 Chromium 156.0.8078.4 的 NVIDIA D3D11 为零差。两次最小软件复现的完整 RGBA SHA256 相同，均为 `199ca66185e1fc3127d3b8c2abbc07b9a00f0bb70b73f71de8f73b6b3bf98096`。

离屏函数和其实际 live WebGL canvas 的全部字节一致。移除 React mount 和 DOM 截图步骤仍保留这 38 个残差，继续调组件偏移不能解释该差异。

临时 fragment 探针在平滑公式之前将采样值编码为 fixed24 RGB。字形 40×40 quad 内有 861 个位置的原始采样值不同，包括全部 38 个最终残差位置。另将这 38 个位置的相同 float32 UV 直接作为 uniform 传给两个后端，移除顶点插值和 MVP 后，仍然有 38/38 个采样值不同。编码器在每个后端分别用 263 个已知值校验，全部逐字节一致。因此，**采样路径本身确实会在相同输入下返回不同结果**；这不是把插值或读回编码误差推测为 sampler 差异。

这并不说明所有下游差异都只有一个原因，也没有恢复 NVIDIA 的精确内部滤波公式。UV 另有小量后端差异，不能将其改写成通用补偿。原始 expected 目标和所有严格失败均保留。

## 单变量尝试

以下临时改动仅通过私有 Vite transform 施加，每次比较完整目标；均没有进入库：

| 路径 | SwiftShader 不同像素 / 最大通道差 | NVIDIA 不同像素 / 最大通道差 |
| --- | --- | --- |
| 原始公共 renderer | 38 / 5 | 0 / 0 |
| 只将滤波返回值四舍五入到 UNORM8 | 46 / 6 | 44 / 5 |
| 平滑参数改为显式除法 | 38 / 5 | 0 / 0 |
| 显式 `highp sampler2D` | 38 / 5 | 0 / 0 |
| 上一阶段 RNE8 权重＋浮点双线性 | 75 / 6 | 31 / 5 |

因此，简单结果量化、平滑公式改写和 sampler 精度声明都未修复残差。另两个 CPU 滤波模型也保留失败：RNE8 地址＋UNORM16 返回值在 1600 个探针位置中有 312 项超过两格编码误差；RNE8 地址＋RNE8 返回级别仍有 38 项相差一级。没有继续搜索量化参数来拟合这个字。

规范允许实现拥有不同精度：[Direct3D 11.3 §7.18.16](https://microsoft.github.io/DirectX-Specs/d3d/archive/D3D11_3_FunctionalSpec.htm) 给出子 texel 和定点滤波的最低精度；它没有要求所有实现逐位一致。[NVIDIA CUDA 文档](https://docs.nvidia.com/cuda/archive/9.2/cuda-c-programming-guide/) 对其纹理插值权重另有定点精度说明，不能直接当作本例 Direct3D 滤波全部算术的证明。

已按当前 Chromium DEPS 中的 SwiftShader revision `1e80438d2b93ef36a7c05f8d2b81233bac0e3d16` 获取其 [SamplerCore.cpp](https://swiftshader.googlesource.com/SwiftShader/+/1e80438d2b93ef36a7c05f8d2b81233bac0e3d16/src/Pipeline/SamplerCore.cpp)。代码存在 16-bit 和 32-bit 滤波路径；仅看到这些源码还不能断言本 draw 实际执行了哪个内部分支。

## 可运行的严格复现

新增仓库工具，无需打开 Computer Use 或游戏，使用已有私有采帧：

```powershell
node scripts/diagnose-header-font.mjs --backend software --label my-software-run
node scripts/diagnose-header-font.mjs --backend nvidia-d3d11 --label my-hardware-run
```

每个 label 必须是新名称。输出在忽略目录 `.cache/header-font-diagnostics/<label>/`，包含完整 `actual.png`、`actual.rgba`、逐像素差异和 `RESULT.json`。默认临时 Vite 端口 5481，可传 `--port`；工具保留 4173 预览，退出时关闭自己创建的浏览器和服务器。

工具核对原字页 / 原生目标 / 捕获 packet 的固定 SHA、全部字形位置和 UV、RGBA8、16项 MVP 及 clamp 常量，再通过真实公共 renderer 比较整个 framebuffer。正常源输入和捕获 oracle 分开，捕获顶点不用于生产字形生成。

退出码 0 表示该有限条件整帧零差；1 表示确有严格像素差异；私有 fixture 缺失、身份不符或运行失败为 2。当前软件路径应得到 1，不能作为“测试成功”计入通过数。硬件路径要求实际 renderer 是 NVIDIA D3D11，不以 renderer 请求参数替代验证。

固定 fixture 位于 `.cache/resource-pack-header-font-study-20261103-01/`；它包含调用者持有的原字页与游戏采帧，不随 Git/npm 分发，也不能由工具生成替代 golden。只安装 npm 的用户需要源码仓库和自己的对应参考材料。

## 下一步与边界

下一个滤波假设需要独立的算术来源和其他字形 / 背景验证，不能仅从本例调出一个拟合式再设为默认。TrueType 1024² 动态 atlas 的 provider、原字体到缓存的栅格方式及正常排版仍是另一条未完成工作；本轮 100/106 ppem 的 FreeType 候选没有通过原 alpha 对照，不作为替代实现。

独立诊断记录和所有失败位于 `.cache/font-sampling-diagnosis-20261103-01/`。本轮没有新增组件，仍为 253 组件 / 271 运行时值；没有修改 `src/` 或原有 golden。来源接入及单字像素资格范围见 [Classic Ten](CLASSIC_TEN_FONT_QA.md)。
