# HUD 独立验证

验证目标：当前 Bedrock Classic / JSON UI，安装版本 `1.26.6005.0`、Chromium DPR=1、GUI scale 2。**这些组件的素材和公开布局可以验证；隐藏 custom renderer 的算法、动态状态与原生整屏像素尚未认证。**

## 独立来源

只读安装 `ui.brarchive`、`textures/ui.brarchive` 和官方 [v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)，没有从生产 CSS、生成皮肤 manifest 或浏览器截图倒推期望。

完整 ZIP SHA256 为 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。原始 `hud_screen.json` native SHA256 为 `d57480f488265329f3feed0cff03841aeb0359b4fe7d7351abf52db255f2a75b`，public JSONC SHA256 为 `fd40b53e5e67f4f6b3799f25821628f80b6aa69c441b012340b8e0f6cb801a8c`。两者经独立 JSONC 解析后完整对象完全相等；文件字节因注释与序列化不同而不同。`hud_crosshair_overlay.json` 也解析相等（native `dec4881223cb42f07f10967a73528aae7328d7c41db649ebcd4e77f660f50922`，public `d17d4d7476199ae5c0141740d891fbbb8b71df45833ac84e67be20cfdf705591`）。

## 可由源证明的事实

| 部件 | 原始事实 |
| --- | --- |
| 生命图片 | `heart_image` 采用 `heart_background`，9×9 游戏像素，alpha=0.65；原始心、半心 PNG 均9×9 |
| Hotbar 格子 | `gui_hotbar_grid_item` 为20×22；内部 panel18×18，item16×16；选中图24×24；开始/结束 cap1×22、alpha=0.65 |
| XP | 层高5；empty PNG13×5、物理切边 `[6,1,6,1]`；full PNG13×5、切边 `[1,0,1,0]`；full `clip_direction:left` 且 `clip_pixelperfect:false`；nub11×5、横向平铺 |
| XP 等级文字 | `shadow:true`、`$experience_text_color=[0.5,1,0]`，不是附魔费用的 `[0.5,1,0.125]` |
| 准星控制 | `cursor_renderer` 为16×16的custom控制；独立native纹理兼容映射明确 `cross_hair` 来自 `gui/icons`、UV `[0,0]`、size16×16、base256×256 |
| 准星材质 | native `materials/ui.material` 中 `ui_crosshair:ui_invert_overlay` 继承 `blendSrc:OneMinusDestColor` / `blendDst:OneMinusSrcColor` 并使用 `texture.fragment`；白色源像素在不透明背景上反色 |

独立读取的原始心、饥饿、护甲、三种气泡、九张快捷栏、选中边框、cap、经验图片与 `gui/icons.png` 均与 full release 字节一致，并通过固定 public commit `46ba6ea985fb5a92d79a9419198f10dda14c199d` 的原始文件 HTTP 200/原SHA检查；测试硬编码28张源文件SHA与尺寸。不能把生成PNG重新压缩后的文件hash当成原始文件hash，运行时图像比较需看解码后的RGBA。

准星映射文件 SHA256 `00d62a6b0e344eb08a5b7dc6af1da5ec073adaabbc34fe66a44e2b3b206434aa`，材质文件 SHA256 `569d4ff2f98deff07ac4068fe3bca4d492b0eb82f9cf0302b8e4ce031f021910`。这两份文件未包含在上述 full ZIP 中，故其声明只标记为本机原生来源；不能把它们描述成 public/native 双源一致。准星原PNG本身已双源比较。

## 无法由这些源证明的事实

`heart_renderer`、`hunger_renderer`、`armor_renderer`、`bubbles_renderer` 都只是 `type:custom`、`size:[1,1]` 和 renderer 名称。其实际十格步距、半格选择、护盾/中毒/凋零/冰冻优先级、闪烁时序、低值抖动、重叠/额外生命、屏幕位置与状态算法未在 JSON 中定义。原 PNG 的名字或 Java Edition 的惯例不能替代 Bedrock 原生实现。

同样，`hotbar_slots_renderer` / `hotbar_renderer` 未公开整个底板的实际合成与alpha；原图 `hotbar_0…8` 的存在不独立证明 custom renderer 内部使用顺序和透明度。XP 引擎绑定 ratio 如何转换为可见比例、最终剪裁量化、等级字体基线与阴影暗化也需要原生截图/renderer证据。准星原UV和混色因子已有native声明，浏览器在不透明背景上的反色可独立检查；原生GPU取样、量化、材质绑定与同屏状态最终呈现仍需原生截图。

## 验证状态

`tests/hud-fidelity.spec.ts` 包含18项独立验证：原始PNG/hash/尺寸、本机原始定义、生命/饥饿/护甲半格及空格、气泡 full/pop/empty、XP0/50/100%、等级文字颜色/阴影/锚点、Hotbar源几何与整幅组合、准星原UV与不透明背景反色。原生游戏同版本、同缩放、同状态的未遮罩截图仍缺失；这些证据层级不会互相替代。

本轮独立执行18/18通过（Chromium、DPR1、1280×1000、GUI2，运行1.7分钟），所有图像比较严格要求0个RGBA像素不同。`npx tsc -p tsconfig.demo.json --noEmit` 通过。5185监听已在完成后复查不存在。

像素参考直接使用固定原PNG，坐标和切片来自上述原始定义，未读取生产CSS或皮肤manifest。独立的 stat/hotbar 参考采用原图图层；XP参考以原13×5图的独立九区域和11×5 nub计算GUI2像素。前期 `<img>` 对半透明 nub / opacity cap 的浏览器合成路径会产生单通道1级的量化差异：例如nub原RGBA `(56,112,11,22)` 叠在 `(49,60,46)` 上，8bit先舍入premultiplied RGB为 `(5,10,1)`，再source-over得到 `(50,65,43)`；另一 `<img>` 路径截断为 `(4,9,1)`，得到 `(49,64,43)`。XP参考明确使用前一种整数算法，cap参考采用独立原PNG surface；保留零容差，没有放宽阈值或更改生产素材。该检查证明本浏览器下的原图合成，不认证原生GPU量化。

这轮还发现了选中24×24图跨格子时的层级风险；生产已为选框保留layer8，独立整幅组合检查将它放在全部格子之后，覆盖相邻格子的边缘也参与比较。空生命/饥饿格子只绘制一次背景，避免半透明源二次叠加；独立空格图像检查覆盖此点。

独立服务只使用5185端口，测试结束由Playwright停止。图像证据保存在忽略目录 `.cache/hud-independent-qa/*-actual.png` / `*-expected.png` 和 `hotbar-unmasked.png`；这里的actual是实现截图，不能作为原生期望截图使用。
