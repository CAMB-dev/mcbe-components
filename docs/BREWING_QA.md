# 酿造台独立 QA

2026-10-29。目标是 Bedrock Classic 桌面 profile、安装版本 `1.26.6005.0`、GUI 2、Chromium DPR=1。本次验证原始逻辑布局、原PNG裁切与图层组合；不是原生游戏整屏pixel-perfect认证。

## 来源

独立解析用户安装游戏的 `ui.brarchive` / `textures/ui.brarchive`，并读取 [Mojang v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)。ZIP SHA256为 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。

`brewing_stand_screen.json` 本机原始SHA256为 `702e53ecbc9568d2632981c4f6357bdd8a42b730e489fbc2907605e8ce62d014`。公开JSONC与本机JSON完整parsed对象相同；10张酿造PNG逐字节相同。文件尺寸和完整哈希由 [brewing-fidelity.spec.ts](../tests/brewing-fidelity.spec.ts) 直接固定，不从生产CSS、生成的skin/geometry manifest或实现截图导出期望。

## 独立坐标推导

根176×166，top panel176×71位于 `(0,7)`；pictogram虽只占40%×80%，中心仍是 `(88,42.5)`。下表是相对根的游戏UI pixel，GUI 2时坐标/尺寸都乘2。

| 区域 | `(x,y,width,height)` |
| --- | --- |
| 原料槽 | `(79,15.5,18,18)` |
| 燃料槽 | `(9,15.5,18,18)` |
| 左瓶槽 | `(56,49.5,18,18)` |
| 中瓶槽 | `(79,56.5,18,18)` |
| 右瓶槽 | `(102,49.5,18,18)` |
| 瓶管道 | `(73,32.5,30,26)` |
| 燃料管道 | `(26,26.5,30,22)` |
| 酿造箭头 | `(99.5,14.5,9,28)` |
| 气泡 | `(59,13.5,12,30)` |
| 燃料条empty | `(53,42.5,24,6)` |
| 燃料条full | `(54,43.5,22,4)` |

三个瓶槽不是等高直排；左右各额外偏移 `(-5,-7)` / `(5,-7)`game。燃料条前后图层不等大，full在empty内缩1game，不能共用相同宽高再拉伸。

背包采用普通根高166的公共锚点：Inventory标签 `(7,76)`、27格起点 `(7,86)`、9格hotbar `(7,143)`，步长18。空瓶图片16×16居中，燃料空位16×16再上移1game；原图没有统一0.35透明度。显示绑定来自 `#empty_bottle_image_visible` / `#empty_fuel_image_visible`，当前组件以槽位是否被占用控制空位图片。

## 裁切和遮挡

源 `clip_direction`：箭头up、气泡down、燃料left。公共 `progress` 是显示比例：箭头上往下、气泡底部往上、燃料左往右。原始绑定的运行时数值和公共ratio是否逐值相同尚未证明。

每个helper分别验证0、50%、100%共9个状态。期望读取原始PNG，以固定尺寸`<img>`加`overflow:hidden`视口裁切；生产使用CSS背景加`clip-path`。两者在同一Chromium严格RGBA比较，容差0。图片尺寸始终完整保留，不随进度缩放。

只测helper会漏掉交叠问题，因此还组合5个空槽、空位图、全部管道与三组进度层，比较0及50%两个独立源图场景。保留原PNG透明像素，槽格按 `cell_image` 的原始10×10 / logical5×5 / slice1game组合；先验证原样main几何，再只在校准场景将整块specimen移至整数屏幕平面。比较区域明确排除title/font、根面板边框与Inventory文字，没有把它叫完整游戏期望截图。

独立审计发现并修正了一处层次：原`bubbles_empty_image`为layer2，箭头/燃料empty为layer1，不能所有empty都统一为1。气泡与燃料条边界存在几何相交；管道也横跨槽位边框和燃料条。因此Stand内需要在同一stacking context比较源顺序，不能为每个slot/helper独立isolate而阻断交叠。当前组合oracle检验这些图像的实际输出，不只检查CSS的z-index数值。

## 焦点与边界

源显式路径只有：原料Left→燃料、燃料Right→原料、左瓶Left→燃料。本次将这些路径作为原定义事实；其他方向键是组件交互选择，不扩张为原生自动空间导航认证。空瓶槽仍可以放入物品，不能作为空结果槽禁用操作。

新增16项独立测试，包括原图哈希、可选本机源检查、原样组合布局、全部背包/快捷栏格、空位与显式focus、9个helper裁切状态和2个交叠场景。

执行 `npx playwright test --config .cache/special-qa/playwright.config.mjs`，与special工作站联合 **31/31 PASS，1.7m**；酿造16项全部通过，9个helper和2个组合diagram均严格RGBA零差。独立5184端口在结束后确认Node/Vite退出，`.last-run.json`为passed。集成配置可运行 `npx playwright test --project=pixels tests/brewing-fidelity.spec.ts`。

首次组合验证捕获了一个真实测试夹具问题：校准页 `.calibration-case h2` 规则同时命中Stand内部标题，添加padding和深色背景，污染diagram上沿1184个像素。父任务将规则限定为 `.calibration-case > h2` 后，2个组合状态独立复跑及整31项复跑全部通过。没有隐藏生产标题、改变源期望或放宽RGBA容差；main页面本来没有该校准规则污染。

`.cache/brewing-qa/brewing-unmasked.png` 是当前实现完整截图，其他 `*-actual/expected.png` 是明确范围的浏览器素材控制样本。没有同版本、同缩放、同状态的原生游戏图；normal字体基线、引擎ratio转换、动画时序、最终像素吸附和GPU采样仍不属于已完成的原生验收。
