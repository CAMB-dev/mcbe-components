# 切石机、织布机、信标与合成器独立 QA

2026-10-29。范围是 Bedrock Classic 桌面profile、组件GUI 2、Chromium DPR=1。验证原图、源布局模型、受控状态与Web键盘操作；**不宣称四个GUI整屏或自定义banner/block renderer已达到原生pixel perfect。**

## 独立来源

直接解析用户安装版本 `1.26.6005.0` 的 `ui.brarchive` / `textures/ui.brarchive`，与 [Mojang v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip) 比较。公开ZIP SHA256为 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。

四份JSON的完整parsed对象本机/public相同。下列为本机原始字节SHA256：

| 文件 | SHA256 |
| --- | --- |
| stonecutter_screen.json | `23c99c5e407993b952afc182e5fda75545e453a1d1dd074bc5a38adbab06fdd0` |
| loom_screen.json | `8d5a9e7560b881ee26a58b5d1e76aa4dcbc27c60ab7bf299887e6930b89cef65` |
| beacon_screen.json | `e2503744910fced4f57ee9d7c64365fe5bfcc7f57849f7fc13e0af8ec98dbdbb` |
| redstone_screen.json | `4867d980c29300d8b434de14a6f9f34e35200e1fa5c72da04c68cdd947c06cee` |

独立提取的33张PNG包含四GUI素材及显式recipe binding的两个控制背景；均与public原图逐字节相同。完整源哈希/尺寸快照在 [advanced-workstations-fidelity.spec.ts](../tests/advanced-workstations-fidelity.spec.ts)，不读取生产CSS或生成manifest得到期望。JSON metadata只比较parsed字段，注释/空白差异不是像素差异。

## 双面板与槽位

以下为相对各自根的游戏UI pixel，GUI 2时乘2。切石机和织布机都由146×166左面板、4×166折页、176×166右面板水平组合，总326×166，右面板原点 `(150,0)`。左selector的外框为 `(6,6,134,154)`；其原始背景 `recipe_book_pane_bg` 是1×1的 `#5d5d5d` PNG。

名义折页仅4game宽，但 `recipe_back_panel` 的实际图像为12×160，位于总根 `(142,3)`，超出名义边界。其原图16×16、slice4，GUI 2的边宽8CSS pixel；比较必须包含24×320的整个视觉皮肤，不能只截8CSS宽的中间条来隐藏边缘。

| 右面板内区域 | 切石机 `(x,y,w,h)` | 织布机 `(x,y,w,h)` |
| --- | --- | --- |
| 输入/旗帜 | `(43,36.5,18,18)` | `(21,36.5,18,18)` |
| 染料 | — | `(41,36.5,18,18)` |
| 图案物品 | — | `(61,36.5,18,18)` |
| 箭头 | `(75,39.5,18,12)` | `(85,39.5,18,12)` |
| 结果槽 | `(107,32.5,26,26)` | `(109,36.5,18,18)` |
| 旗帜外框 | — | `(133,24.5,22,42)` |
| 原生banner renderer容器 | — | `(134,25.5,20,40)` |

top panel是162×61、top y15。切石机horizontal stack宽90、高26；织布机宽134、高42；源padding和居中算式直接得到表中半像素。两种结果槽大小不同，不能全部套52CSS大结果槽。

织布机三个空位原图均16×16，没有统一0.35透明度。`Banners` 外框原图4×4、slice1。源 `banner_pattern_renderer` / block item renderer、recipe collection的背景纹理和focus links由游戏绑定提供；库将这些内容开放给调用方，没有用自绘小图冒充。测试显式注入原5×5 recipe_book_item_bg和4×4 selected图，验证各自slice1；这不证明游戏在某状态下必定选择该binding图。

## 信标宽容器

根为256×219，而非176×166。inner为 `(22,4,212,97)`；原 `effect_background` 为120×32、slice4，需九宫格，不能全图拉伸。按钮22×22、图标默认18×18，GUI 2为44×44按钮和中心36×36图标。

| 效果 | 相对根 `(x,y)` |
| --- | --- |
| speed / haste | `(65,22)` / `(89,22)` |
| resistance / jump | `(65,47)` / `(89,47)` |
| strength | `(77,72)` |
| regeneration / extra | `(156,47)` / `(180,47)` |

四个pyramid19×20位于 `(30,22)`、`(30,47)`、`(30,72)`、`(170,22)`。payment panel为 `(0,106.5,256,22)`；支付槽 `(147,108.5,18,18)`，confirm `(176,106.5,22,22)`，cancel `(202,106.5,22,22)`。accepted items面板 `(32,108.5,104,18)`，顺序为netherite/emerald/diamond/gold/iron，源图标是调用方真实物品renderer内容。

背包横向中心使27格起点变成 `(47,139)`，hotbar `(47,196)`；源没有Inventory文字标签。测试逐一检查36格。源还明确规定inventory8/17/26和hotbar8的Right焦点为STOP，测试实际按键检查，不能被通用grid的跨行roving覆盖。

选中按钮及其hover都使用pressed原图；locked及其hover都使用locked原图。默认/hover/selected/selected-hover/locked/locked-hover六状态都比较完整原PNG背景与speed图标，不裁掉按钮边缘。效果enabled/selected/visible与canConfirm是宿主状态，不由组件猜测金字塔等级或支付规则。

## 合成器的禁用是可操作状态

enabled输入grid是 `(25,19.5,54,54)`，每格18。源另外提供9个disabled button，带小数偏移：第0列x25.1，其余x43/61；第0/1行y19.6/37.6，第2行y55.5。测试保留这些raw坐标，没有把disabled skin硬贴到enabled整数box后宣称完全一致。

disabled槽仍可激活以重新启用，不是HTML disabled。测试检查方向键进入、Enter重启、受控状态、宿主HTML属性透传以及重启后的焦点连续性。enabled空槽的primary/secondary动作由宿主处理；组件不自行猜光标是否持有物品。

wire为 `(95,38,18,18)`，但原图是16×16，两个powered状态都按源显示尺寸比较。输出是只读预览区域 `(133,38,18,18)`，原border26×26居中后为 `(129,34,26,26)`；不伪装成可领取的工作台结果槽。源count容器另有 `[14.1,11.2]` offset和18×18尺寸，本次没有将其最终字形基线列为原生认证。

## 比较方法和结果

新增39项测试：源PNG/hash/metadata、可选native JSON检查、四种布局与全部背包、受控选择/锁态/键盘、完整fold/inner/outline九宫格、显式recipe背景、三个loom空位、六种beacon状态、三种crafter slot状态、两种wire和四个pyramid。

期望的九宫格由原PNG、原slice和GUI2边宽独立CPU采样，其他原图由独立`<img>`绘制；不读取生产skin变量作为期望。RGBA要求0差异。skin specimen只移到整数屏幕平面，原样主展示几何不修改。隔离背景surface时移除组合内容，明确只认证完整皮肤；不把该结果写成整GUI差异计数。

首次独立测试发现两个QA自身问题：源定义索引漏写`@common.button`，以及surface clone移出原父级后丢失继承的`image-rendering:pixelated`。后者导致浏览器bilinear误差（Beacon4824像素、fold2652像素）。测试修正只恢复实际节点继承的采样属性；原PNG、slice、完整边界和0像素容差保持不变。另由producer复核并修正CrafterSlot禁用分支HTML属性转发/切换焦点；独立复核又发现disabled focus outline被通用`.mc-slot.mc-slot:focus-visible`的specificity覆盖，已窄修selector并实测outline和焦点连续性，属于Web交互修复。

最终39项均取得PASS：完整运行38 PASS（约1.1分钟），唯一`pyramid2`在等待`document.fonts.ready`时被其他agent保存`demo/expansion-examples.tsx`触发的Vite full-reload中断，日志包含确切`triggeredBy`路径。保留`.cache/advanced-qa-output/hmr-pyramid2-trace.zip`后，仅重跑该受干扰项，1/1 PASS（4.5秒）；没有修改像素预期或添加自动重试掩盖导航。全量通过38项加定向通过1项是39个独立测试的覆盖结果，不声称同一次全量运行39绿。

23项完整PNG/九宫格/状态皮肤比较RGBA0差；真实native PNG的固定plateau区域及组合行为单独通过。后续`npm run typecheck`完整通过，5194测试服务已退出、无监听。可复验命令：

```powershell
npx playwright test --config .cache/advanced-qa-output/playwright.config.mjs advanced-workstations-fidelity.spec.ts
```

隔离config仅用于本地5194且未提交；父任务的最终集成测试应包含本文件全部39项。

唯一临时服务5194；全部输出在 `.cache/advanced-qa-output/`，无共享test-results竞争。`screens/*-unmasked.png` 是当前实现，不是原生期望图。父任务随后取得切石机/织布机的原生lossless PNG，下节限定这些新证据的范围；本次尚未验证collection动态背景、全renderer、文字/最终pixel snapping、滚动条原生runtime算法或完整原生四GUI状态，不能把局部PNG零差替代整屏认证。


## 后续真实游戏截图：selector 与 fold 组合

父任务通过原生 Alt+PrintScreen 剪贴板、Paint 原样保存取得以下2568×1400 PNG，游戏26.60、中文Classic、GUI5。没有把JPEG转换成PNG，也没有用Web生成原图。截图文件是本机验收证据，不随库分发。

| 原生文件 | SHA256 |
| --- | --- |
| stonecutter-empty-native-lossless.png | `1b4d7e00197997a10ef4984bb04d52f508d7cad0e40d8bfdac96b33a3734b956` |
| loom-empty-native-lossless.png | `63b6e16febe2fa6cd37f718b2f1a644bb836998bda8c52c6d5bbfdef573dde6c` |

独立查看完整PNG并量得共同book左边缘约x476、top282，dark pane从约x506/y312开始；存在1px混色边缘，不能把该近似锚点和Web整数裁切当作整块0差异。织布机原生第一格x526/y317、列间90px，即7×18game grid居中134game pane，左右各4game。切石机空选择和织布机31个pattern都容纳在pane内，原图固定矩形x1160…1174、y780…1059每幅4200像素全部是`#5d5d5d`，没有滚动条。Web增加空/31fit/84overflow fixture验证不溢出隐藏bar、7列居中、溢出时bar实际可操作；这不认证游戏滚动thumb的动态大小算法。

原图固定x1188/1193/1198/1203、y400/600/800/1000，对应game142/143/144/145的中段plateau，分别是198/85/85/0灰阶。旧Web折页的0/174/174/96覆盖了book右边缘，表明source`center_bg` layer0应位于book的`commonbg` layer1下。增加actual scene采样验证正确遮挡，独立的完整24×320 fold skin比较继续保留。两类测试分别证明皮肤与组合层级，互不替代。

Crafter的HTML属性透传、同一节点重新启用和白色键盘focus outline另有断言；白框是Web可访问性契约，原source只声明button hover/pressed状态，当前没有将该focus环列为原生像素认证。


同批Beacon原生截图 `beacon-empty-native-lossless.png` SHA256 `3e39ea327571fb3d30f575d3da19ce3df214c9e07a9b874d3ccacb6922a8fe40`，2568×1400、GUI5。未激活/零等级/无payment状态的extra区域固定`[1556,390,100,100]`共10000像素全部为`#212121`背景，只有五个primary和regeneration按钮。旧库默认第七个locked extra缺少native依据，现改为默认隐藏，宿主显式`effects.extra.visible=true`才显示；独立fixture和测试同时验证六个默认locked及显式extra。没有从该空状态推断游戏所有高等级效果状态，组件仍由宿主管理游戏规则。
