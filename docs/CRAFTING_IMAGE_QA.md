# CraftingScreen 原图组合

`CraftingScreen.imageRender` 可选地把 Classic 配方书、工作台和工具条绘制到同一源图层。省略时继续使用原有 CSS；真实 section、输入、按钮、焦点、滚动和操作回调保留。本页说明当前 API 及有限验证范围，不将完整原生画面零差作为使用前提。

## 配置

```tsx
import { CraftingScreen } from 'mcbeui';
import type {
  CraftingScreenImageRenderProfile,
  CraftingScreenTextStyle,
  CraftingScreenInputTextStyle,
  RecipeBookProps,
} from 'mcbeui';
import 'mcbeui/styles.css';

// 应用提供自己的字体、metrics、采样与输出坐标系。
declare const hostFrame: { width: number; height: number; guiScale: number };
declare const labelStyle: CraftingScreenTextStyle;
declare const countStyle: CraftingScreenTextStyle;
declare const queryStyle: CraftingScreenInputTextStyle;
declare const recipeBook: RecipeBookProps;

const imageRender: CraftingScreenImageRenderProfile = {
  frame: hostFrame,
  itemImages: true,
  itemModels: true,
  text: {
    crafting: labelStyle,
    inventory: labelStyle,
    recipeTitle: labelStyle,
    query: queryStyle,
    placeholder: queryStyle,
    inventoryCount: countStyle,
    recipeCount: countStyle,
  },
};

<CraftingScreen recipeBook={recipeBook} imageRender={imageRender} />;
```

三个新类型均为 type export，运行时导出仍为134项。`frame: {width,height,guiScale}` 必填，表示完整物理输出坐标系；可选 `origin` 使用游戏单位，`displayScale` 控制显示比例。未指定 origin 时先计算 `[ceil(width/guiScale), ceil(height/guiScale)]`，再将完整326×166根居中。`imagePhysicalPrecision` 可显式设为 `'float32'`，不根据 DOMRect 自动选择原生参数。

文字的七个 role 独立可选：`crafting`、`inventory`、`recipeTitle`、`query`、`placeholder`、`inventoryCount`、`recipeCount`。每个提供 `font: GuiTextFont`、`fontScale`、`sampling`、`shader` 和必填 `metrics: {lineHeight,paintOffset}`，可另给 color / tint / hudOpacity / shadow / scissor。未提供的 role 保持 DOM 文字；`crafting.renderText` 的自定义标题和库存标签也保留其原所有权。

`query` / `placeholder` 使用 `CraftingScreenInputTextStyle`，另需 `clipQuantization: 'floor-min-ceil-max' | 'logical-stage-floor'`；可选 scissor 覆盖由正常源逻辑框与 frame 派生的裁剪，不要求捕获矩形。它们只在失焦且未 composing 时接管文字，聚焦和 composition 期间由真实 HTML input 编辑。`recipeBook.searchPlaceholder` 可选，标题由 `recipeBook.title` 明确提供，组件不把搜索分类名称猜成原生标题。

## 布局、数据与滚动

完整根为326×166游戏单位；展开时右面板 x150，收起的 `layout="survival"` 仍保留根宽，右面板 x75。分类标签和工具条延伸到根顶部负 y，最高为−23；origin 指正文根，不是包含这些外扩装饰的包围盒。输出窗口会计入源图装饰外扩，宿主应给足物理 frame，而不是只裁正文根。GUI2 基准正文为652×332 CSS px；窄屏保留局部横滚，不切换为 Pocket。

右侧46槽顺序为9个合成输入、1个结果、27个背包和9个快捷栏；结果槽26×26，物品在其中居中16×16。左侧 Recipe N 独立使用 entry index / ID，分类按钮也不计入46槽。

`recipeBook.entries` 已由应用查询、过滤和展开。分类、搜索、仅可合成、选择、primary / secondary / tertiary 和结果领取都发出意图，由宿主更新 props；组件没有配方数据库或自动合成逻辑。`craftableCount` 独立于库存 count，零可合成数量仍保留配方物品，红色背景不自动表示 disabled。`layout` 可受控，也可通过 `defaultLayout` 使用内部状态。

DOM viewport 是真实滚动所有者。源层读取其 scrollTop 并换算为游戏单位，按七列18单位单元及当前 viewport 生成可见配方和选中外扩；列表高度为搜索123 / 非搜索139，无滚动条宽134 / 有滚动条宽128。每条配方 primitive 均使用 viewport scissor，数量、modifier 与23×23选中框也受相同裁剪；不是通过截图拟合滚动位置。

## 素材与 ready 所有权

源皮肤使用63张完整原版 PNG 及尺寸 / nine-slice 元数据，不使用重新绘制的图片或捕获帧缓冲作输入。逐资源来源、固定URL、PNG / RGBA哈希和切片元数据见 [crafting-image-assets.json](crafting-image-assets.json)，可用 `python scripts/check-crafting-image-assets.py --check` 对照固定官方ZIP复验。63条对应63个独立原文件，其中8条共享别名、38份原切片metadata均已核对；White平色primitive单列，不计第64张。`itemImages` 显式接受 `InventoryItem.image`，`itemModels` 接受调用者的 `guiModel`；模型投影与纹理是应用数据。

`entry.preview` 始终优先 DOM。显式 `itemModels: true` 且有 guiModel 时 source model 优先，已挂载的 item.icon 保留为原子切换的 DOM fallback；没有接受 model 时，item.icon 保留 DOM并阻止 sprite 接管。配方 art 未接受时，整条 entry 的 count / modifier / selection 也保留 DOM。自定义背景非零 `backgroundSlice` 需给 `backgroundSize` 原图逻辑尺寸，否则整条 entry 回退且不请求其 source art；slice0表示完整图片拉伸。

只有当前 source canvas ready 才隐藏对应 DOM painter；pending、失败、context loss、取消、请求替换或关闭 profile 均恢复 fallback。不合法配置在资源 I/O 前拒绝。右侧 DOM-owned art 保留自己的 count / hover / focus，基础 cell 可由 source 绘制。自定义 ReactNode 是明确的 DOM 视觉区域，不是缺失资源。

应用负责自备字体页、字形映射和可访问 URL。本 API 不继承铁砧等旧 font / frame / metrics。有限原生候选的 fontScale / 行高 / paintOffset / sampler 不是所有字体的默认值，也不证明全部 Unicode 的 coverage 或 advances。

## 本地字体与公开预览

源码仓库的 `#crafting-layer` 示例提供源图、物品 sprite / model、GUI2 / 4 / 5、1:1显示、展开 / 收起、分类、搜索、过滤、分组、滚动及46槽位操作。示例数据由宿主管理，不是游戏配方数据库；GUI4 / 5 选项也不表示这些状态已通过原生零差验收。构建后的生产预览已实际完成20条辅助检查，包括真实Combobox、输入、滚动、46槽位回调、source恢复及GUI4 / 5的1:1呈现；这20条不计入正式66项或原生像素通过数。8张截图和trace保存在 `.cache/crafting-layer-demo-browser-01`，未出现页面、控制台、render或HTTP异常，1次ERR_ABORTED原样保留。

从自己的游戏文件准备可选中文标签字体，然后重启 Vite：

```powershell
python scripts/use-local-crafting-fonts.py "C:/XboxGames/Minecraft for Windows/Content"
python scripts/use-local-crafting-fonts.py "C:/XboxGames/Minecraft for Windows/Content" --check-only
```

也可用 `--archive PATH` 指定原始 `font.brarchive`；脚本校验已审计版本的哈希。输出仅写 ignored `.cache/local-fonts/crafting-ui`：16张完整原始 Unicode 页、17字符的 `labels.json`、原 metadata 与 manifest / 来源记录，共20文件。字符覆盖“建筑 / 装备 / 物品 / 自然 / 全部配方 / 合成 / 物品栏 / 搜索”。重复生成的20文件内容相同，check-only 的内容和修改时间均未变化；原有119个字体文件保持不变。

`nativeGuiCraftingLabels` 仅属于本地 demo 虚拟模块，未准备时为 null，不是 npm 导出，也不注册全局字体。示例只给 crafting / inventory / recipeTitle 三个 role 配置明确的 `.5` 字号倍率、bilinear / bitmap-smooth 和 lineHeight8 / paintOffset0；搜索、placeholder 和数量仍保留 DOM 字体。新增标签的字页覆盖不等于其原生排版已全部认证。原始页不进入库的 dist 或 npm；使用本地字体构建的 site 会包含这些页。

## 已验证范围与尚未验收部分

公开回归入口为 `tests/crafting-image.spec.ts` 与 `demo/crafting-image-fixture.html`。21项保留原先129个主体断言，使用仓库已有的合成128²字页及95个ASCII字格，不依赖私有字页、捕获资源或 `.cache`。它额外检查非预期的浏览器异常、HTTP失败和控制台错误，故意触发的指定404单独记录。可以直接执行：

```powershell
npx playwright test tests/crafting-image.spec.ts --project=pixels --workers=1
```

本机可另设置 `MCBE_CRAFTING_GPU_PROFILE=d3d11` 复验Windows硬件路径；默认按仓库浏览器配置运行，不因缺少WebGL而跳过。

本次公开迁移后的首批实际66/66通过，零失败、跳过或重试：新增21项、原Crafting23项、Survival22项，耗时96.397秒。新21项实际使用 NVIDIA RTX3050 / ANGLE D3D11 / DPR1，208项输入校验无变化。指定的4次404和4条对应控制台错误、12次取消请求均保留；无非预期HTTP、控制台、页面或采集异常。报告保存在 `.cache/crafting-regression-migration-01/FINAL.json`。

标准 `npm run verify:package` 首轮通过：新tarball分别安装至React18.3.1和19.3.1消费者，实际验证ESM、134个运行时导出、46槽位的source SSR、三个新公开类型、styles / assets / licenses与strict TypeScript。257个dist文件在构建、tarball和两个消费者中逐字节一致，私有字体及shader排除检查通过。此结果验证可消费的库，不代表原生画面零差。

此前v05独立 Chromium 合同批实际21/21通过，25.782秒，零失败 / 跳过；73个模块 HTTP 全200，前后100个 source pin 与97个 resource pin 无变化。它验证 synthetic 场景的客户端交互、ready / fallback、真实 DOM 隐藏及恢复，不是与原生画面比较的21次零差。原报告为 `.cache/crafting-screen-independent-01/final-phase-03/runs/2026-10-29T19-46-46-857Z/formal-report.json`。

首批20通过 / 1失败保留：真实 `ItemSlot` 在 `.mc-slot__item` 内包裹配方 art / modifier / count / selected，旧 CSS 直接子层选择器漏掉隐藏。修复对应层级后完整重跑21项，后续校准到v05再次完整复验，未删除原失败或改成仅检查 marker。当前源身份见 `.cache/crafting-source-implementation-05/FINAL.json`，SHA `2aed1ed90b2faf443a7c47d1e98bab83ce1d8fc11d831cc72024a35f9cc2fb1b`；使用示例的同一 API 已做 strict noEmit 类型检查，本轮未重复计数。

四个真实 GUI5 capture 的八次完整 pre / post UI RT 读取，以及21个已选文字 glyph 的 packed fields / UV / indices / MVP 零差，是独立来源与正常输入候选证据，不是产品画面通过。

v03至v05 已实际比较两种完整2570×1402画面，每种均计入3,603,140个RGBA像素、背景透明度及全部工具条。独立 native 简单拷贝呈现均为零差，实际后端为 Chromium156 / NVIDIA RTX3050 / ANGLE D3D11；每次源码与资源150个 pin 前后相同，运行错误为零。产品结果仍非零：

| GUI5 状态 | v03 RGBA / alpha不同像素 | v04 RGBA / alpha不同像素 | v05 RGBA / alpha不同像素 |
| --- | ---: | ---: | ---: |
| 建筑分类，仅可合成为空 | 59,879 / 2,500 | 3,454 / 0 | 5 / 0 |
| 紧凑工作台 | 42,815 / 1,890 | 4 / 0 | 4 / 0 |

另对建筑分类的全部10条配方完成首次完整目标baseline：3,603,140个像素中仍有3,878个RGB差异像素，alpha差异为0。候选保留全部阶梯、玻璃板、半砖、完整方块和地毯，使用8张完整原PNG、正常cuboid / authored box-union以及已有显式投影候选；10条source model均实际接管，未用捕获顶点、atlas或矩阵作输入。此数值是待校准的完整残差，不能当成普通模型相机已恢复。记录位于 `.cache/crafting-native-populated-01`；全部配方搜索页36条仍待补齐与实测。

v03完整结果保存在 `.cache/crafting-native-comparison-01/production-close-actual-01/`，v04在 `.cache/crafting-native-comparison-02/FINAL.json`，v05在 `.cache/crafting-native-comparison-03/FINAL.json`，首轮残差与原图不删除。v04修正嵌套缩放采样和工具条透明边框；v05修正选中分类层级和原JSON大写White对应的平色材质。该材质是正常2×2全白RGBA常量，不是新增原PNG或捕获贴图。剩余5个放大镜像素、4个标题像素全部保留，不以容差删除。固定的原裁剪 / 偶数原点 / 整帧字体对照保留相同4点，因此未采用裁剪对齐作为修复；image VS的两种同义表达式也保留相同5／4点，未据此修改内核。两个有配方的原生目标已保存，普通视觉输入仍在核对。旧 [CRAFTING_SCREEN_QA.md](CRAFTING_SCREEN_QA.md) 的23项属于历史 CSS / 局部原PNG合同。

本页不认证默认字体、所有 Unicode、GUI4、跨 GPU / DPR、真实 OS IME、世界合成或最终 Present 零差。后续应保留实际完整 target 残差与失败记录，再限定可声明的场景范围。
