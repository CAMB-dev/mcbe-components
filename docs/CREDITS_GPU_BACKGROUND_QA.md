# Credits 的可选 GPU 平铺背景与活跃资源寿命

`CreditsSurfaceProfile.background.rendering` 可明确选择源码平铺呈现：

```ts
rendering: {
  kind: 'gui-layer',
  rasterOrigin: 'top-left',
  originRounding: 'truncate',
}
```

省略时保持原CSS repeat路径。GPU模式要求point采样和整数物理frame；原图自然尺寸、完整源网格、from/to两端的坐标与预算在任何IO前校验，inactive屏幕也校验。`from` / `to` / `logicalSize` / `tileSize` 都是宿主求值后的逻辑量，不自动假定原生锚点或动画时钟。当前frame的**未取整逻辑偏移**直接进入逐tile源几何，不重用CSS已floor的left/top。

每个活跃资产owner只fetch／decode一次，primitive身份是URL及声明自然尺寸。连续时间、比例、viewport、tile及策略变化读取最后已提交props，复用同一独占canvas/context。隐藏或关闭会同步退役owner，移除context-loss监听、取消请求、关闭ImageBitmap并释放context；重新显示创建新canvas及新owner，所以不是跨隐藏周期的全局解码缓存。资产替换也创建新owner。StrictMode第一轮在微任务前取消，不开始多余IO；迟到decode会关闭bitmap，已退役或直接脱离DOM的owner不会发布旧错误。

内部 `presentGuiLayer` / `presentPreparedGuiLayer` 与已有byte-returning renderer共享源adapter、RGBA8 FBO及PMA COPY，跳过CPU readPixels及两份完整读回数组。它们要求真实显式canvas，不是新增的公共barrel API。既有 `renderGuiLayer` / `renderGuiImages` 返回像素的合同不变；材质shader也未改变。presenter仍逐次创建／释放program、buffer、texture及FBO，不宣称已实现GPU资源池。

错误通过现有 `onRenderError(error, { lineIndex: -1, runIndex: -1 })` 报告，与其他非roll部件共用该位置标记。context loss为当前owner的终止错误，重新打开或替换资产可重试。它不自行改变Credits输入映射、Skip、文本、结束链或时钟。浏览器文档全局hidden不等于组件hidden：受控宿主若仍提交新帧，此路径仍会呈现；没有新增全局可见性暂停策略。

## 原生参考范围

此前[源坐标平铺](GUI_TILED_IMAGES_QA.md)验证了公开GuiLayer的明确居中／零offset候选。本轮实际 `CreditsScreen` 控制快照使用相同原版bg32、2570×1402／scale5、logicalSize514×5620、tile64、from=to=[0,-2669.5]，intro已完成、content为空且无mask／Skip／outro。指定NVIDIA ANGLE D3D11下，完整DOM截图与第一段shadow前的原始readback共3,603,140像素RGBA零差，SHA256 `a5c0c453c0202480abaaef3b70c1ae42ab1139226ae40dc88a25ea47bbdbd45b`。

这证明了背景通过CreditsScreen实际合成路径，不能称原生文字、默认锚点、运行时inheritance、动画时间或整个播放器已还原。原参考按rowPitch10496解码，未重拍或覆盖。CSS默认与旧参考保留；此前SwiftShader80像素边界仍是已有已知范围，不据D3D11单项结果作跨后端承诺。

## 实测与资源验证

`.cache/credits-background-session-01/PROBE.json` 是同canvas的完整byte-returning调用计时；`PRESENT-PROBE.json` 为live-only调用计时。记录的800×450／60次和2570×1402／30次均保持context，选定0／2／9帧分别与新canvas完整RGBA一致。D3D11记录p95约13.1／31.7ms降至4.9／7.0ms。计时是CPU调用／提交耗时，前者含整个绘制而非孤立readPixels成本，后者不是GPU完成或播放器FPS基准。

持久测试 `tests/credits-gpu-background.spec.ts` 通过标准Web API实际统计fetch、decode、bitmap.close、context、draw及readPixels，覆盖StrictMode、受控跳帧、真实playback时钟及pause/resume、逐tile未预取整偏移、缩放／策略变化、隐藏重开、URL／自然尺寸替换、迟到成功／失败、取消fetch、context loss与最后提交回调。还验证透明PNG的straight解码／PMA framebuffer及DOM叠黑结果、完整TGA的通道和无ImageBitmap路径。测试主动读像素与组件自动readback分别记账。

`tests/credits-gpu-preflight.node.test.mjs` 用同JS realm的真实React SSR检查活跃／inactive／CSS声明、非法策略、非整数frame／自然尺寸、tile与纹理预算、from/to half溢出、比例下溢，以及presenter缺少canvas。Node中的fetch／bitmap IO计数必须为0。最初测试器将import.meta打包成CJS空值而失败；后续给出正确源URL并使用同realm执行，原失败日志另留，不把它当产品缺陷或吞掉校验。

本轮独立review发现并修正了缺canvas的隐藏创建路径、DOM卸载间隙的旧错误回调；随后也使迟到成功decode在直接DOM脱离时退役并关闭bitmap。对应真实浏览器用例均保留。

## 实际展示页

公开 `#credits` 播放器已选择该GPU背景；独立32／64材质预览仍展示通用图像命令。字体准备只等待实际MCBE Pixel／MCBE CJK及所需字串，不再等待整个文档其他实例的FontFaceSet.ready。所选face加载和Canvas度量仍必须通过；全局fontset状态只记录，不代替实际face资格。

公开测试通过标准fetch→Blob→ImageBitmap→GPU纹理上传追踪背景来源，读取的Blob正是实际decoder／GPU消费的不可变原字节。工具返回空HTTP响应体时不据此认定图片为空，也不重新下载或按期望hash筛选；所有可用HTTP body和实际上传Blob必须一致。此变更源于首轮主展示检查6PASS／4FAIL：前三项停在字体准备，另一项只读到空响应体；全局page／console错误均为空，失败记录保留。后续加入无关字体被刻意阻塞时所选Credits字体仍可切换的实测。

完整批次、实际安装包与最终tar身份记录在本轮目录收据中；不把不同阶段累加成一次执行。整个组件库目标仍未完成。本轮无需Computer Use或新的Minecraft／PIX采集。

## 最终验证批次（2026-11-02）

以下路径均相对于 `.cache/credits-background-session-01/`。失败、阶段性通过与最后功能包分别保留，不能累加成一次全库通过。

| 收据 | 实际结果与范围 |
| --- | --- |
| `regression-01.json` | 106/106：CreditsScreen/Roll 与通用 Layer/Image/Model/Entity。早于本轮后续的局部背景生命周期、DPR 和 iframe 修复。 |
| `browser-07.json` | 最终源码16/16，无skip/flaky；D3D11背景生命周期、播放、完整材质、DPR2与iframe案例。 |
| `software-04.json` | 最终源码16/16：15个默认启动后端的自编测试数据案例，另1个原生背景案例自行启动并断言D3D11；不能称SwiftShader原生背景零差。 |
| `node-preflight-final-02.log` | 最终13/13：真实SSR、非法声明、无IO与显式canvas要求。 |
| `demo-03.json` | 源码公开展示11/11，包括阻塞无关FontFace仍能准备所选字体。 |
| `built-demo-02.json` | 最后功能构建的公开展示11/11，覆盖真实字体、Combobox、原材质来源、播放/输入/Skip及1440/390/320预览边界。 |
| `package-03.log` | 实际React18.3.1/19.3.1安装包、205组件/223导出、严格类型、SSR、CSS、原资产、字体、许可证及既有家族检查通过。 |
| `installed-browser-03/RESULT.json` | 两peer实际安装包，各自原生背景完整DOM零差、5个受控时间完整DOM零差、重开与DPR2零差；实际NVIDIA D3D11。普通owner计数3fetch/3decode/3context/3close，DPR页面各1，组件自动readPixels均0，无错误。 |

两项真实红绿复现额外保留：`dpr-red-01.json` 的128×96 DOM截图有5036像素差、100种颜色；canvas加 `imageRendering: 'pixelated'` 后，最终两后端同一用例均为0差、16色，RGBA SHA256 `aa80dc1617dae62b2870be42d0740a41d43a8e8b7c2494c0f8645160365222ef`。`iframe-red-01.json` 复现了portal内相对路径被按父文档解析而404；请求前使用 `new URL(src, canvas.ownerDocument.baseURI)` 修正，最终16项包含此案例。没有声明运行中修改document base的额外语义。

功能包 `functional-candidate-03/mcbeui-0.1.0.tgz` SHA256 `3c3486ed3c80d21099c3aef291b7240499fc45f3901e318d438954553d1a9c56`；实际两peer ESM `2d77a6dff8354493188217deb55c150e633eceb7cc833e13a8fc5c57b5309fe1`、DTS `db631df2bd494d7765da46a5bfe25c8468105313e2c19c6c9b4dc9f561e6b15e`、Credits CSS `3d7266cca63d04bbe302396c9d022c6b73151a7f7e097e09c272b3051f3a737a`。安装包浏览器检查使用实际 `mcbeui` 和打包CSS，无renderer源码alias；不含iframe专门案例，该项由最终源码批次证明。

独立复核的旧收据 `.cache/credits-session-independent-04/FINAL-SESSION-INDEPENDENT-03.json` 逐像素重解原生截图、DPR红绿及实际上传Blob链，早于最后iframe修复；独立包第二轮 `.cache/credits-session-package-independent-02/RESULT.json` 对应02功能包，不能替代03包。最终新收据与文档包非文档逐字节身份、服务关闭、提交身份由本轮 `FINAL.json` 索引。

最新只读复核 `.cache/credits-session-independent-04/IFRAME-URL-INDEPENDENT-04.json` 确认URI修复没有改变owner/lifetime路径，并重新解码最终两批原生截图均为全幅0差、DPR附件与此前16色零差图完全相同；不声称独立重跑浏览器。`.cache/credits-session-package-independent-03/RESULT.json` 对实际03功能包的两peer各91个SSR合同、13个严格类型负例通过，IO/警告/回调/ref调用均0，tar与两实际安装的ESM/DTS/CSS完全一致。
