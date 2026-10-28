# HUD overlays 独立验证

目标为本机 Bedrock `1.26.6005.0` Classic JSON UI、GUI2。原始资源/声明、Web 静态受控呈现和原生整屏渲染分别记录；隐藏 renderer、运行时绑定以及引擎字体 enum 的数值映射不由浏览器截图反推。

## 独立来源

只读本机 `Content/data/resource_packs/vanilla/__brarchive/ui.brarchive`、`textures/ui.brarchive` 与官方 [v1.26.60.5 full ZIP](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)（SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`）。四份完整JSON对象经独立 JSONC 解析后相等。

| 文件 | native SHA256 | full ZIP JSONC SHA256 |
| --- | --- | --- |
| hud_screen.json | d57480f488265329f3feed0cff03841aeb0359b4fe7d7351abf52db255f2a75b | fd40b53e5e67f4f6b3799f25821628f80b6aa69c441b012340b8e0f6cb801a8c |
| scoreboards.json | 59284dced1515c9348334128aba06a19fe1d7019195acaef4d4c1a640f22abd5 | e8692c69e00bfbfcb721760a8b732b5d8daa5fe129f1035fe8b9d115fa01f422 |
| ui_common.json | 1de0c736edeeb6c6fbf1baf398a1c92e4d00b91b8fb44c81193e9c6cc5a421ec | 0aae480d123b2c8667463776f8b0eabad665bc0378b287acd0babcf41d8083a6 |
| _global_variables.json | 6d458a58cbe3f28f5f752f27808744c0b3f49bc40e346462b0af9e3805dbd920 | ea39206de2c7b6f157def5cdf1662767c0ccd9560dfafb1378c3c364b236f69b |

## 源中可证明的声明

| 组件 | 声明 |
| --- | --- |
| BossBar | boss_health_panel182×20、top_middle；名字白色、有阴影；common progress182×5，boss覆盖offset `[0,10]`；empty/filled原图13×5、切边 `[4,0,4,0]`；full左剪裁，clip_pixelperfect=false；颜色来自运行时bar_color |
| ChatMessage / ChatPanel | 文字白色、有阴影；grid_item宽100%-2px；文字相对背景offset `[2,0]`、宽100%-5px；Black原图2×2；工厂max_children_size=50；panel最大高度50%，stack底部左对齐 |
| Scoreboard sidebar | title最大170×10、player最大100×10、每行10；列间距10；主背景内容宽+4；独立标题背景高度9；name/title白、score红；文字locked_alpha=1；sidebar没有shadow声明，不能套用pause player list的shadow |
| StatusEffect | mob_effects_renderer是custom，未声明HUD格子排布；HUD背景原图24×24、真实effect图18×18。背景与图标的Web组合需标为重建 |
| ActionBar | hud_tip_text_background原图6×6、切边2；背景文字大小+12×5；文字居中、白、有阴影；原屏幕偏移 `[0,50%-68px]` |
| HeldItemTooltip | label最大宽200、居中、白、有阴影；背景大小为文字+12×5，默认show_text_background=false；原生root bottom_middle，位置由运行时item_name_text_offset绑定 |
| TitleOverlay | stack offset `[0,-19]`；title enum extra_large、top_middle、offset `[0,6]`；subtitle enum large、offset `[1,19]`；title背景文字+30×6、subtitle+20×5，subtitle背景offset `[0,16]`；白色、阴影依运行时title_shadow |

背景透明度、chat font_type/scale/line_spacing、title shadow与显示时机均依运行时绑定；Web默认值不能描述成原生默认值。原动画含chat in_quart一秒fade、held in_expo两秒fade、actionbar in_expo三秒fade、title linear动态fade/stay链。本轮组件采用静态受控状态，不认证这些原生时间轴。

## 验证状态

独立原PNG/hash、源布局、完整受控组件图像和desktop/mobile交互验证已经完成。共46个独立用例通过，具体批次及未认证边界见文末；输出仅写 `.cache/hud-overlays-qa-output/`，不与全套验证output混用。

## 素材、UV和字体证据

独立固定40张PNG：33种18×18效果图、6张基础素材（Black、boss empty/full、tip背景、两种HUD效果背景），以及16×16 `EventBars` 图集。全部已逐文件比较本机归档与full ZIP原字节；测试保存独立SHA256/尺寸，缓存不存在时只从固定官方commit `46ba6ea985fb5a92d79a9419198f10dda14c199d` 下载并校验。

本机 `texture_backwards_compatibility_mapping.json`（SHA256 `00d62a6b0e344eb08a5b7dc6af1da5ec073adaabbc34fe66a44e2b3b206434aa`）明确给出boss empty UV `[0,0]`、full UV `[0,5]`、size13×5、base16×16、原图 `gui/newgui/EventBars`。两块UV裁图与独立PNG解码RGBA完全相同。Speed在 `gui/gui` 上UV `[0,184]`、Poison `[108,184]`，均18×18、base256×256。该兼容映射没有包含在full ZIP中，只作为native声明记录。

特别区分：`hud_mob_effect_background` 的legacy兼容UV是22×22，而当前独立PNG为24×24；ambient背景没有同名legacy映射。不能用原PNG尺寸证明隐藏 `mob_effects_renderer` 实际排布、slot尺寸、顺序或动画。StatusEffect的48×48槽与36×36居中图是本库明确的GUI2重建profile。

本机原字体 `Content/data/fonts/Mojangles.ttf` SHA256为 `3d4cdf2752075d28c6ebf0ba44a61157ec6eb38f8db0ebdc3205aec056760be5`。独立读取cmap/hmtx：1000 units/em，`Minecraft` advance4800，20px时96px、18px时86.4px；源字体文件和浏览器启用该字体后的advance分别核验。完整组件参考使用显式字体合同：fixture冻结20px normal、40px large、60px extra_large；行高分别20/48/72，阴影2/4/6。这些数值是可选Mojangles Web profile，**不是原生font enum数值或原生阴影暗化已获认证**。库基础字体profile仍是18/36/54，可由调用方切换。

## 完整组件和交互检查

完整图参考直接渲染独立原PNG，保留文字、阴影、边框及全部组件范围；没有隐藏文字或裁小背景区域以使测试通过。背景和相对几何期望来自原JSON；参考文字使用已冻结的Web字体合同和同浏览器font face，字体文件/advance另有独立原源证据。因此完整含字对照证明本库静态Web profile的一致性，不等于独立复现整个原生字体栅格管线。

比较时先保存原含块的真实组件尺寸，再放置到整数坐标平面；`width:100%`没有因转为fixed而误扩展为viewport宽。实际尺寸仍独立与源/字体合同计算的参考尺寸比较，不能通过冻结错误尺寸掩盖布局偏差。Plain held-item另有8px完整halo检查，覆盖超出intrinsic text bounds的阴影末端。

独立检查发现并修复一处源偏差：HeldItemTooltip无背景时不能继承ActionBar的padding。源item背景默认ignored，root/control均为100%cm，普通20px字样仅96×20；开启背景才增加24×10成为120×30。ActionBar的根本身是image，alpha为0时仍保留其extent，所以plain仍120×30。此差异已有完整图和显式尺寸回归。

聊天测试覆盖log/live属性、原生工厂上限50、调用方顺序、controlled/uncontrolled草稿、trim/清空、空白禁用、无发送处理器、disabled guard、IME组合输入、尾部自动跟随和向上阅读时保留scrollTop。另检验受控opacity/background、8种root的原生hidden、Scoreboard语义和仅供辅助技术的效果时长。所有交互在desktop和Pixel7 Chromium profile执行。

## 完成结果

- 主验证45项全部通过（25 fidelity + 10 desktop + 10 mobile，1.1分钟）。
- 扩展到40张原图和native UV后，源核验2项单独重跑通过（1.7秒）。
- 新增完整阴影halo1项单独通过（8.7秒）；合计46个独立用例，完整图均要求0个RGBA像素不同。
- 测试输出固定在 `.cache/hud-overlays-qa-output/`；actual是本库实现截图，expected是独立原图/Web profile参考，均不是原生游戏截图。
- `npx tsc -p tsconfig.demo.json --noEmit`通过，4份owned文件无trailing whitespace。独立服务5195已停止并检查无监听。完整原生游戏同版本/同状态/同GUI缩放的最终图像、隐藏renderer算法、比例绑定量化、动画时序与屏幕锚点合成仍未认证。
