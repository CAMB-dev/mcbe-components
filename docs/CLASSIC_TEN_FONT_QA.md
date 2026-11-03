# Classic Minecraft Ten：本机接入与有限原生对照

后续已用原始TTF和固定stb64px／2×2配置重建完整原生1024²缓存，见[缓存生成工具与范围](CLASSIC_TRUETYPE_CACHE.md)。下文保留当时的provider未知与失败历史；完整TrueType文字接口／正常排版仍未完成。

Classic 的 Minecraft Ten 与 HBUI 的 Minecraft Ten v2 是两份字体。2026-11-03 从本机 Bedrock 1.26.6005.0 只读核验后，展示页支持独立的 `MCBE Classic Ten` family。该接入不更改组件库默认字体、字号、基线、阴影或 GPU shader；公开包仍只附带原有开放字体。

## 准备与预览

在源码仓库运行，仅需 Python 标准库：

```powershell
python scripts/use-local-classic-ten.py "PATH/TO/Content/data/resource_packs/vanilla/font/minecraft-ten.ttf"
python scripts/use-local-classic-ten.py "PATH/TO/Content/data/resource_packs/vanilla/font/minecraft-ten.ttf" --check-only
```

工具核验 TrueType 目录、必要表、head、family 和文件边界，拒绝空占位文件及 HBUI OTF。输出是未经改写的 `.cache/local-fonts/classic-ten/Minecraft-Ten.ttf`、`font.json` 与 `font-face.css`；不安装系统字体、不修改游戏。`--check-only` 不写入。工具位于源码仓库，不在 npm 包中。

重启 Vite 后，`/#typography` 的 “CLASSIC TEN · 0123456789” 可预览该 face；`/#resource-packs` 的标题通过局部 `--mc-font-ten` 使用它，普通正文保留原字体。Vite 检查 prepared metadata 的大小及 SHA256，缺失时保留现有回退，身份不符时提示重新准备。

自行接入应用时，托管自己有权使用的 TTF，注册 font-face，再在所需容器设置 `--mc-font-ten`。原 TTF 与 Unicode 原字页均不进入 Git/npm；本地 `site/` 会包含已启用的私有预览字体，不应将它当作公开字体包。

## 两份字体的实际身份

| 项目 | Classic Ten | HBUI Ten v2 |
| --- | --- | --- |
| 文件 | vanilla/font/minecraft-ten.ttf | Minecraft-Ten-v2.otf |
| Family / version | Minecraft Ten / 2.001 | Minecraft Ten v2 / 2.5 |
| 大小 | 127,504 B | 19,960 B |
| UPM | 1000 | 1000 |
| `0 / 1 / 5` advance | 590 / 450 / 590 | 595 / 455 / 595 |
| 对应 left bearing | 50 | 52 |

两者 ascent/descent 都为 990/−250，不能据此视为相同字体。Classic TTF 不含“活”字，中文需要独立 fallback。完整 SHA 见 [身份清单](classic-ten-font.json)。旧研究缓存里的零字节 `minecraft-ten.ttf` 占位文件保留，不用于字体加载。

浏览器实际加载 Classic TTF 后，在 100px canvas 测得 `0 / 1 / 5` advance 为 59 / 45 / 59。测试还核对浏览器 font-face、HTTP 返回字体字节及 prepared SHA；这认证字体来源和有限浏览器度量，不认证 CSS 栅格与游戏相同。

## 保存采帧的独立解码

本阶段没有打开 Computer Use、Minecraft 或 PIX UI。沿用保存的 Global Resources GUI5 捕获，新增 API 资源读回及一次有预算的 CPU 解码：实际 PSO509 为 TrueType、PSO510 为 MSDF、PSO511 为 BitmapSmooth，六个 shader stage 与先前原件逐字节一致。四个 draw 选出的 VB/VS/PS 共 672 B 经独立复核。

G74/G79/G85 的 TrueType R28 是 1024² 动态 atlas，POINT/CLAMP；实际矩阵 XY 系数为普通图像系数的 float32 ×1.5。G83 则是 256² R248 Unicode bitmap、LINEAR、普通图像矩阵系数。三种字体管线均使用 SRC_ALPHA/INV_SRC_ALPHA RGB 混合。原 atlas 的 RGBA 相等，不据此执行反预乘或改白。

源 JSON 的 MinecraftTen / UIFont fallback、非 low-memory `font_scale_factor: 1.39` 与 `[0,-2]` offset，尚未恢复为统一浏览器排版模型。观察到的矩阵 1.5 也不能直接改成 CSS 字号倍数。TrueType atlas 与 loose TTF 的逐 glyph provider 关系、任意文本 advance、baseline 和 intrinsic layout 仍待核验。

## Unicode“活”字的完整目标对照

R248 整页与当前安装的 `glyph_6D.png` 全部 65,536 texel 相同。U+6D3B 的标准 16² cell 映射是 x176/y48；通过原字页和码点独立识别，未从截图描字。公共 `layoutGuiText` / `GuiLayer` 接受普通 font、text 与明确宿主参数：2570×1402、GUI5、origin `[59.2,32.4]`、fontScale 0.5、bilinear / bitmap-smooth、原生 before 背景和 scissor。

该输入得到的所有顶点、UV、16项 MVP、glyphHeight 与 halfTexelOffset 与 G83 完全一致。对整幅 3,603,140 像素做严格 RGBA 比较，没有裁剪评分、遮罩或阈值：

| 实际浏览器后端 | function / live function / mounted / DOM 各自不同像素 | 最大通道差 |
| --- | ---: | ---: |
| NVIDIA D3D11 | 0 | 0 |
| SwiftShader Vulkan | 38 | 5 |

独立 `native-header-cjk.spec.ts` 锁定明确 NVIDIA D3D11 条件，原始私有资源缺失时跳过，不能生成替代 golden。该有限成功使用宿主 origin 与原生 before 背景，不证明整页 GUI、默认锚点、多字间距或通用字体都已复刻。

另一次只在临时实验中用手动 8-bit 权重插值替代 texture sampling，SwiftShader 变为 75 个、NVIDIA 变为 31 个不同像素，实验失败。所有原始结果保留；库未加入该采样选项，也未调整 UV、offset、shader 或容差来适配测试。后续相同 uniform UV 的控制实验已定位采样路径会返回不同值，但精确滤波模型与可跨后端修复仍未完成；诊断命令和新证据见 [FONT_SAMPLING_DIAGNOSIS.md](FONT_SAMPLING_DIAGNOSIS.md)。

## 本阶段验证与证据

- 源展示页相关回归单轮 104 PASS，零跳过、重试；新增明确硬件原生字形测试另 1 PASS，不合称同一批。
- 真实 TTF check-only 成功；旧零字节占位与 HBUI OTF 均被拒绝，prepared 字节保持不变。
- 组件数量仍为 253，运行时导出仍为 271。本阶段无 `src/` 行为变更。
- 字体准备、浏览器与后端残差：`.cache/classic-ten-source-qa-20261103-01/`。独立 shader/geometry/整页资源审计：`.cache/resource-pack-header-font-study-20261103-01/AMENDMENT-02/FINAL.json`，SHA256 `0821c15e44b4111daeb9746a2a1b15ea32a17bbc14ed5442115031be0e3a55e5`。

本阶段不覆盖历史 ResourcePacks 28 / Manifest 12 项严格失败，也不改变 [原生标题图像验证](RESOURCE_PACK_HEADER_NATIVE_QA.md) 的有限资格边界。最终构建、实际预览和包字节核验由当前阶段 `FINAL.json` 记录。
