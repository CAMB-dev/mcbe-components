# Book 原生编辑状态采集记录

2026-11-02。本轮没有修改组件实现、字体、纹理或既有像素目标。
当前 `layout.bodyRaster` 仍只覆盖空闲正文；聚焦、选区、组合输入和滚动时，
同一个真实 textarea 继续负责编辑。既有固定空白及混排目标的验证见
[Book body raster QA](BOOK_BODY_RASTER_QA.md)，不能扩展为编辑状态认证。

## 已有证据与本轮观察

旧 GPU 语料只有 Book 空白、短混排正文、空白签名页三个状态。
混排正文为 `Bedrock UI 0123456789 abc XYZ\n像素字体测试`，其中的换行是显式换行，
没有已识别的 Book 光标 primitive、非空选区或自动换行样本。
Sign 语料中的绿色光标属于另一种控件，不能替代 Book 证据。

本轮通过 PIX 的 GPU capture 模式启动已安装的 Minecraft Windows 包
`1.26.6005.0`，PIX 为 `2610.28`；渲染进程确实加载了对应的
`WinPixGpuCapturer.dll 1.0.2610.28001`。没有开启 Force D3D11On12 或 DRED。
实际窗口截图为 2560×1400；它不是旧 2570×1402 GPU 目标的同尺寸复测。

以下是本轮 Computer Use 屏幕观察及输入探针，**没有新的 GPU 帧支撑**：

- Book 正文取得实际编辑焦点后，看到了绿色插入光标；`Ctrl+Home` 后在正文起点也看到了光标。
- `Ctrl+Home`、`Ctrl+Shift+End` 后，临时输入单字符替换了整段正文，证明该次键盘选区生效。
  该状态的屏幕观察没有显示常见的选区背景，不能据此断言原版始终不绘制选区。
- 只输入 ASCII 首行时出现了视觉换行，加入原来的中文第二行后，ASCII 又回到一行。
  这支持继续调查整值字体路由，但没有分离字体变化与自动换行算法。
- 临时输入已在屏幕上恢复为原来的两行测试正文，第二页为空，书保持未签名。
  没有从世界数据或新 GPU 字形序列独立核验内部字符串。

屏幕可见的绿色不能直接确定线性 RGBA、混合方式、字形页、几何偏移或闪烁周期。
因此本轮不修改 caret-color、selection 背景、字形度量或换行策略。

## 单次捕获结果：失败

为避免点击 PIX 夺走正文焦点，本轮编译了本地单次捕获辅助程序，使用已安装的官方绑定。
它固定并复核目标 PID、启动时间、可执行文件和已加载捕获模块哈希，
不启动、attach、注入、重启或向目标发送输入。

Root 实际执行一次 `TakeGpuCapture`：目标 PID208332，1 帧、PRESENT delimiter。
API 返回 `0x80004005`，进程 exit1；没有返回文件名，没有取得 `.wpix`，
游戏的 GPU captures taken 计数仍为 0。没有重试。

该 HRESULT 没有确定具体原因，不能解释为已经证明的焦点、跨客户端所有权、
权限或超时故障。模块已加载也不能证明另一个 PIX connection 能成功捕获该进程。
设置的捕获选项属于该实验 connection/target；没有修改 Windows 快捷键或安全设置。

本地证据：

- `.cache/book-editing-native-01/PREFLIGHT.json`：实际包、进程和模块检查。
- `.cache/book-editing-capture-helper-01/CAPTURE-ATTEMPT.json`：唯一请求声明。
- `.cache/book-editing-capture-helper-01/CAPTURE-RESULT.json`：实际失败阶段及 HRESULT。
- `.cache/book-editing-capture-helper-01/EXECUTION-REVIEW.json`：独立 CPU 复核；冻结文件未变。
- `.cache/book-editing-evidence-study-01/FINAL.json`：旧语料盘点，36 项元数据/图片未变。

失败声明与冻结辅助程序保留，不能删除声明后把再次运行当成第一次尝试。
该辅助程序绑定已经退出的进程，不能在后续启动时直接复用。

## 下一组需要取得的原生样本

先只采同一个短混排值的两个状态：实际焦点下的正文起点和终点，且捕获帧中必须确实有光标。
随后才采非空选区，以及无显式换行、含空格和长 token 的混排值。
溢出测试需先确认 `constrain_to_rect:true` 下原版是否接受内容，不能预设存在滚动。

每个新捕获必须重新识别自己的 UI pass、最终 RT、视口、裁剪、draw 和绑定资源；
旧资源 ID 与旧几何不能直接套用。若捕获恰处光标关闭相位，应保留为未知/关闭状态，
不能计为光标通过。正常实现输入仍应来自原素材、布局参数和实时输入状态，
捕获的顶点及像素只作比较证据。

## 恢复与退出

书已放回物品栏原位，快捷栏第三格恢复为附魔台；玩家位置仍为
`23.50, 201.00, 25.50`，本轮为避开 NPC 临时旋转的 90 度已反向恢复。
已通过游戏的“保存并退出”返回世界列表，再关闭本轮的 Minecraft 和 PIX。
退出后进程检查未发现 Minecraft、GameLaunchHelper、WinPix、WinPixServices 或 EngineHost；
Computer Use runtime 已 reset。本轮没有启动浏览器测试服务，也未操作用户的 4173 服务。

组件运行时代码未改，本轮没有重跑旧测试，也不把旧通过结果计为新增编辑验证。
完整组件库及 Book 原生编辑复刻仍未完成。
