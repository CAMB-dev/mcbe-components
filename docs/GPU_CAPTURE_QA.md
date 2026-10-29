# 原生 GPU 帧采集记录

2026-10-29，Windows 本地 Minecraft for Windows `Microsoft.MinecraftUWP_1.26.6005.0_x64__8wekyb3d8bbwe`，应用 `Game`。用户授权安装已校验签名的 PIX、保存并重启测试世界采集一帧，管理员确认由用户操作。

## 已取得的证据

- 官方 PIX 2610.28 / `WinPIX_release_2610.28001` 安装成功。安装器 SHA256 `4f24facf17dd1e4325a57e0fd00243b3b5ff39a835d7175382ac3eee70f95a04`，签名为 Valid Microsoft Corporation。安装保留旧版本，未选择可选 Qualcomm 组件。
- 原测试世界保存退出后，通过 PIX 的 Packaged App / GPU Capture 启动 Minecraft；明确取消 Force D3D11On12。实际渲染进程加载 `WinPixGpuCapturer.dll` 版本 `1.0.2610.28001`。Developer Mode 在 PIX 中显示已启用，本任务没有修改它，也没有修改安全设置、ACL 或游戏包。
- PIX 图形界面 Take Capture，1 frame / Present-to-Present，采集 Classic 附魔台展开书本、钻石剑中文名称与攻击伤害提示框。PIX 显示帧截图为 2570×1402；这与自动化窗口截图的逻辑尺寸分别记录。
- 原始 `.cache/pix-capture/enchanting-open-tooltip.wpix`：**167327197 bytes**，SHA256 **`9d667d37cceb0086f5fc02c1bb0f1a39369e68d2663957e9a9f21140fb45a55b`**。分析副本完整字节及 SHA 相同，原件保留。
- 分析副本的 CLI 事件导出成功，`.cache/pix-capture/analysis-copy-cli-02/events.csv`；完整 C++ 静态导出成功，`.cache/pix-capture/analysis-copy-cpp-01/`，包括 160873324-byte `resources.bin`。未编译或执行生成的重放程序。

捕获和导出产物仅保留在 ignored 本地目录，不随组件库分发。导出的事件、原始资源和重放产生的截图须分开解释；生成程序的 swapchain 适配代码不能直接归于游戏原始命令。

## 保留的失败与边界

首次 CLI packaged launch 返回 `0x80070057`；其后 CLI attach 实际渲染 PID 返回 `PIXTOOL17`，但同一会话的 PIX 图形界面采集成功。原因尚未确定，不能据此声称零售包无法采集。

当原件在 PIX 打开时，CLI 打开原路径返回 `E_PIX_GPU_CAPTURE_FILE_IO_ERROR`；字节一致的新副本成功导出。该差异支持文件占用因素，但没有直接核验底层锁原因。C# API 首次原生 DLL 解析失败，改从安装位置加载官方 managed binding 后成功列出事件；没有更改全局 DLL 搜索设置。

取得 `.wpix` 及 C++ 导出是新的实际 draw 证据入口，**不代表字体、书本或整屏已 pixel perfect**。下文记录已完成的逐draw定位、限定重放和实际组件迁移；默认动态姿态、生产字体后端及整屏验收继续与历史非零误差分开保留。

## 已定位的实际绘制与限定重放

书本为 Global65 / queue0 event236 / command list788，PSO795，目标106。实际64×32 RGBA8材质与既有 `book.png` 完整字节相同；网格168顶点、252索引、7部件，实际投影、模型与骨骼常量均已从捕获读取。采样为POINT/CLAMP，depth LESS/write，关闭blend，单采样。重放使用原状态和原纹理，没有拟合相机、偏移、光照或轮廓。

在 Chromium156.0.8078.4 的 ANGLE / NVIDIA RTX3050 Laptop / D3D11 后端，以原目标106的 before 作为背景，独立 WebGL 书本 draw 与原 API after 的 **2570×1402 全部3603140像素逐RGBA比较，0不同像素、0不同通道、最大差0**；书本覆盖19750像素，bbox `[926,373,1093,498]`。GPU沙箱开启，仅附加 `--use-angle=d3d11`。报告 `.cache/pix-capture/book-draw-study/webgl-hardware-replay-result.json` SHA256 `620c9b1a080af21c5235be259bb9d4b28ab043fd34c71678b6cfa36684118eca`。同状态SwiftShader仍有23像素差、最大166，保留为后端差异证据。

这证明**本捕获姿态的一次书本draw**可精确重现；还不是默认姿态、动态骨骼生成算法、其他姿态或整GUI的认证。随后已将可重生成mesh/UV/shader状态迁入实际 `EnchantingBook`，增加调用方 `rendererState`，并以原矩阵/骨骼重验完整目标仍RGBA零差。当前实际组件结果SHA256 `79036c93a9de6dd3e1e3cf9d95b5deefcdd414574dd4407f4186ce8b711f593d`；详见 [ENCHANTING_QA.md](ENCHANTING_QA.md)。

实际tooltip的8张256×256字体纹理亦已回读，并与原始glyph页逐字节匹配。对应 Global95..102 / queue0 events440..496 / PSO793；POSITION 为half4、UV为UNORM16、COLOR为UNORM8，线性CLAMP采样、SRC_ALPHA/INV_SRC_ALPHA混合、单采样目标106。

以原pre95目标为背景，真实8个font draw的硬件重放对完整2570×1402目标及完整字段/halo均为RGBA零差。报告SHA256 `f26db0532251617d1ce73fb37d25be5c4277008d9c5510cf077c782026e5b353`。这是捕获输入下的条件式重放；生产Canvas2D字体后端尚未迁入此profile，旧截图映射和整GUI仍待验证，见 [NATIVE_BITMAP_FONT_QA.md](NATIVE_BITMAP_FONT_QA.md)。

UI目标106与最终场景目标100须区分：106为单采样，Global251采样它绘入8倍采样的100；Global254 resolve 100→单采样101。API事件确认原始Global258为 `ID3D12SharingContract::Present` 接收101。导出程序再复制到其新swapchain是重放适配步骤；最终桌面窗口映射仍不能从这些步骤推断。
