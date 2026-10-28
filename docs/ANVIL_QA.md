# 铁砧 GUI 独立 QA

2026-10-29，目标是 Bedrock Classic 桌面 profile、安装版本 `1.26.6005.0`、组件 GUI 2、Chromium DPR=1 的铁砧。验证源公式、原始纹理采样、费用状态和显式焦点路径；不宣称原生游戏整屏 pixel perfect。

## 独立来源

直接从本机 `ui.brarchive` 提取 `anvil_screen.json`，与 [Mojang v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip) 的对应 JSONC 文件比较完整 parsed 对象：相同。本机文件 SHA256 为 `86f208f8c7e29c5c53c13848826cbd5623c8196ad7e13e754e6f0df0c50147a1`；公开 ZIP 为 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。

费用颜色、文本输入和灰色图像的继承另外读取 `ui_common.json`、`_global_variables.json` 和 `resource_packs_screen.json`。[anvil-fidelity.spec.ts](../tests/anvil-fidelity.spec.ts) 的期望来自原始百分比/锚点/PNG，不读取生产CSS或生成的 geometry manifest 反推。

## 原始逻辑布局

单位为相对176×166根的游戏UI pixel；GUI 2时乘2。`top_half_panel` 为 `[100%-14px,50%-14px]`、offset `(7,7)`，即162×69。

| 区域 | 推导后的逻辑矩形/锚点 |
| --- | --- |
| 图标 | `(7,10.45,30,30)` |
| 改名外框 | `(39.4,20.73,129.6,19.32)` |
| 标题 | 中心x=105.2，底部y=18.97；标题高度受字体度量影响 |
| recipe panel | `(7,34.6,162,41.4)` |
| recipe grid | `(20.77,47.02,134.46,16.56)`，5×1 |
| 输入槽 | `(25.216,46.3,18,18)` |
| 材料槽 | `(79,46.3,18,18)` |
| 结果槽 | `(132.784,46.3,18,18)` |
| 加号 | `(54.608,48.8,13,13)` |
| 箭头/无效叉 | `(105.892,49.3,18,12)` |
| 费用文字 | bottom-right `(169,76)` |

recipe grid 的宽高是 recipe panel 的83%和40%，再居中放置。每个cell宽 `134.46/5=26.892`；固定18×18的 item slot 居中放在第0/2/4格，13×13加号和18×12箭头分别居中放第1/3格。这是根据控件尺寸和默认中心锚点建立的逻辑布局模型；原生最终像素吸附仍缺游戏截图。

铁砧结果槽是普通18×18，GUI 2为36×36，内部物品仍32×32。不能复用熔炉/工作台的52×52大结果槽。背包与快捷栏采用普通根高166的公共锚点：Inventory标签 `(7,76)`、背包起点 `(7,86)`、hotbar起点 `(7,143)`。

改名输入源最大长度30，继承 common 文本框，文字为白色且没有 shadow。内部centering/clipper横向边距3game，当前GUI 2为6CSS pixel；源 label 高10game，当前为20CSS pixel。浏览器输入法、字形基线、选区和游戏自己的虚拟键盘不在本次原生验收范围。

## 图像与费用细节

原PNG都从本机纹理archive提取并与公开full release逐字节比较：相同。

| PNG | 原图尺寸 | GUI 2显示尺寸 | 原始SHA256 |
| --- | --- | --- | --- |
| `anvil_icon.png` | 15×15 | 60×60 | `5858dfc62fe01b7629dbea9a1b71bb7523c196e1418e2a075ff3fc8ec6e624a3` |
| `anvil-plus.png` | 13×13 | 26×26 | `f162fdc2ed1785debed24173efd5d014b1bb444173bd8d719c88f138ecb9ce6f` |
| `arrow_large.png` | 22×15 | 36×24 | `c0b27d51e084d0018365a94905e53e8661cf0f05448145c71402ff16844fe1b6` |
| `crossout.png` | 15×15 | 36×24 | `e6495d114d889c557948d19035a3a76ba45b9e7a75d19052eed826ea5f05ff61` |
| `Gray.png` | 2×2 | 费用框105%×105% | `e21915e60b32df0c5bd7fa8153571c1d8899a20de2973ee92f8aab8f11c35797` |
| `edit_box_indent.png` | 6×6 | 改名外框 | `c4968ec9277dcdd363c28c1338a6e202d15f8464c14331fddb9c5014c9eaa109` |
| `edit_box_indent_hover.png` | 6×6 | 改名外框 | `7b02fa8f0b08581bd0319d1757578303c160cc77a2a0910ec3231dc642b6e2eb` |

`edit_box_indent*.json` 的 `base_size=[6,6]`、`nineslice_size=2`，GUI 2目的边宽4CSS pixel。原图分辨率和逻辑显示尺寸必须分别处理；anvil_icon确实是4倍原PNG显示，箭头/叉确实是非等比显示。

名称为 `Gray` 的费用底图实际2×2所有像素都是 `(0,0,0,255)`，并非128灰。源成本标签子控件使用该图、105%宽高、alpha=0.3、layer=-1。测试固定原始文件哈希，并把生产皮肤解码后的RGBA与原图逐像素严格比较。皮肤构建可以重新压缩PNG，不能把压缩字节不同误报成像素差；没有放宽RGBA容差。

成功色是 `[.5,1,.125]`；失败色是 `[1,.35,.35]`，与附魔台的失败色不同。源只给出 `shadow:true`，彩色阴影变暗系数仍是浏览器profile选择，没有Bedrock原生shader/截图证据。测试只认证源前景色允许的相邻字节量化、费用右下锚点和底层；不将阴影系数列为原生通过。

成功、不可负担和Too Expensive状态由调用方传入。原始 JSON 通过 `#cost_text_red/green` 控制两种颜色标签可见性，费用文本来自 `#cost_text`。库中的费用计算、非有限数值处理、结果可领取条件是公共API行为，独立交互测试验证；组件不执行游戏的经验或修复算法。

## 焦点与验收

只将源JSON显式路径列为验收：输入 Right → 材料；材料 Left → 输入、Right → 结果；结果 Left → 材料。空结果保留focus，通过 `aria-disabled` 和动作guard阻止领取。没有把原JSON未写出的Right边缘停止或自动空间导航补成原生事实。

新增10项独立测试，涵盖原PNG/hash/metadata、可选nativearchive检查、实际组合浮点布局、所有背包/快捷栏格、三种费用状态、显式focus和4个图像采样状态。4个PNG采样期望用原图 `<img>` 在独立整数屏幕平面绘制，与生产CSS背景严格RGBA比较；非整数缩放由同一Chromium完成，证明的是浏览器内原PNG采样一致性，不是Bedrock GPU一致性。完整GUI几何与未遮罩截图没有被该平面校准修改。

执行 `npx playwright test --config .cache/container-qa/playwright.config.mjs`：与容器8项联合 **18/18 PASS，45.1s**，其中铁砧10项全部通过，4个图像样本均严格RGBA零差。独立5184端口对应的 Node/Vite 进程在结束后已确认退出。集成配置可运行 `npx playwright test --project=pixels tests/anvil-fidelity.spec.ts`。

实际输出在 `.cache/anvil-qa/`，`anvil-unmasked.png` 为当前实现的完整截图，不是原生期望图。还缺同版本/缩放/状态的真实游戏截图、normal字体最终基线和纹理/文字的引擎像素吸附，不能把DOM布局或独立素材零差扩张成整屏pixel-perfect认证。
