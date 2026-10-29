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

取得 `.wpix` 及 C++ 导出是新的实际 draw 证据入口，**不代表字体、书本或整屏已 pixel perfect**。逐 draw 的纹理、VB/IB、shader、uniform、采样、投影、RT 与后续合成仍需完成定位和复现，与已有原生非零误差一并保留。
