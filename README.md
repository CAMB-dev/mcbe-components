# mcbeui

React + TypeScript 的 Minecraft: Bedrock 风格 UI 组件库。方角、像素字体、硬边倒角、绿色交互状态、原生表单与键盘操作。以 **Bedrock Classic / JSON UI** 为主体，另提供独立的部分 OreUI 组件。

当前源码提供 **268 个公共组件**，另有 8 个数据导出与 13 个函数，共 289 个运行时值。完整列表见 [组件清单](docs/COMPONENTS.md)；各族的有限验证范围与原生像素差异分别记录。

当前交付、预览入口与剩余范围集中在[阶段性交付状态](docs/DELIVERY_STATUS.md)。完整原生pixel-perfect目标仍在进行中；较早解析POINT取样假设已排除，本阶段改为验证光栅目标条件。

新增显式完整光栅目标：`imageRender.frame.rasterOrigin: 'top-left'`配合`imageRender.rasterBounds: 'frame'`。指定GUI4／5建筑页及GUI4收起／空搜索页，完整3,603,140个RGBA像素均与原生参考零差；原有165点建筑页残差全部消除，无新增误差。控件与可见窗口不扩大，默认裁切策略不变。`#crafting-layer`可切换两种分配；范围与显存取舍见[合成台光栅目标](docs/CRAFTING_RASTER_TARGET.md)。

新增`classicPaneModelCalibration`，保留完整原玻璃材质和透明度；指定GUI4／5参考中，玻璃板与其余九个配方模型单元均RGBA零差。该阶段默认裁切的两个建筑页仍有放大镜160／5点差异，上述完整目标模式已解决指定参考中的残差。`#gui-layer`展开 **Calibrated glass pane** 可预览；这是显式类别校准，尚未恢复通用引擎fit-to-frame。见 [API](docs/CLASSIC_PANE_CALIBRATION.md) 与 [验证](docs/CLASSIC_PANE_CALIBRATION_QA.md)。

新增显式只读投影 `classicBlockModelCalibration`：GUI4／GUI5的九个非玻璃板配方模型单元已与指定原生参考RGBA零差，共修正1,016个旧误差、未新增误差。组合附魔台示例也使用这份配置；该阶段的玻璃板残差已由上面的独立类别校准解决，放大镜残差及原版通用相机规则仍待查明。见 [接入及范围](docs/CLASSIC_MODEL_CALIBRATION.md) 与 [验证](docs/CLASSIC_MODEL_CALIBRATION_QA.md)。

`createGuiCuboidModel` 新增可选模型坐标、逐面UV和薄平面，旧方块默认输出保持不变。`#gui-layer` 展开 **Original geometry models** 可预览三份完整官方模型／纹理。React18／19实际包与四种Vite消费场景通过；原版自动缩放及整套原生像素仍未认证。见 [模型能力与验证](docs/MODEL_SPACE_CUBOIDS.md)。

旧参数的GUI4建筑配方页对照差1,419像素，地毯从GUI5零差变为GUI4的273点残差；该失败推动了上面的共用校准。历史记录见 [跨比例验证](docs/CRAFTING_GUI4_HOLDOUT_QA.md)。源码另提供 [完整RGBA帧比较命令](docs/GUI_FRAME_COMPARISON.md)，用于严格比较调用者自己的参考与渲染输出。

前阶段[模型字段诊断](docs/CRAFTING_GUI4_MODEL_FIELDS_QA.md)发现地毯四处Y字段与原版不同，UV／颜色一致；独立half编码及float32负控制未支持直接修改量化规则。新配置仅替换所有模型共用的投影参数，没有使用逐物品补偿。

> 这是独立粉丝项目，与 Mojang、Microsoft 无关联。开源替代字体和 Web 布局与游戏存在差异；未声称整套 UI 与任何游戏版本零像素偏差。视觉来源与差异见 [FIDELITY.md](docs/FIDELITY.md)。

新增现代 Ore 弹窗原语：`OreModal`、`OreModalHeader`、`OreModalContent`、`OreModalText`、`OreModalActions`，展示入口 `#ore-modals`。标题使用 Seven、正文使用 Noto；内容默认按设置尺寸裁切，显式开启后才使用自定义滚动区。未保存、删除和错误提示可由这些部分组合。浏览器已经完成的关闭通过 `native-close` 通知宿主，不自动重新弹出。[使用与验证说明](docs/ORE_MODAL_QA.md)。

完整熔炼屏幕入口为 `#furnace-screens`：`FurnaceScreen`、
`BlastFurnaceScreen`、`SmokerScreen`，共用 `FurnaceScreenFrame`，并提供
`FurnaceRecipeBook`、`FurnaceRecipeBookEntry`、`FurnaceRecipeCategoryTabs`、
`FurnaceRecipeFilterToggle`。展开为 326×166、收起为 176×166 游戏像素，
保留原版分类位置与四种筛选材质。配方、类别绑定、查询与物品状态由宿主提供。
使用范围和 API 见 [FURNACE_SCREEN_QA.md](docs/FURNACE_SCREEN_QA.md)。

完整Classic Play入口为`#play-screen`：新增`PlayScreen`及11个可独立复用的frame／navigation／内容／行／详情／popup部件。Worlds、Friends与Servers保留独立provider快照；服务器先选择详情、再单独请求Join，不执行游戏或网络服务。原版Realms卡片与Pocket等仍有明确外部／未认证范围。见[PLAY_SCREEN_QA.md](docs/PLAY_SCREEN_QA.md)。

资源包家族新增 `ResourcePackManager`、`ResourcePackSection`、`ResourcePackItem`、`ResourcePackActions`、`ResourcePackDiagnostics` 与 `PackSettingsScreen`、`PackSettingsContent`、`PackContentTier`。global／level／addon 保留各自源码绑定；内容等级的 raw value／steps 与显式 Web 数值域独立，生成字段复用九种实际表单行。API、来源和待验证范围见 [RESOURCE_PACKS_QA.md](docs/RESOURCE_PACKS_QA.md)。

已取得原版资源包标题图标的单帧GPU证据：两颗plus的半像素GLOBAL位置解释了整数对照的36像素差异。已有GPU接口在给定位置及原生背景的条件下通过真实React／两后端对照；默认整页布局和字体仍未认证。见 [原生标题图标验证](docs/RESOURCE_PACK_HEADER_NATIVE_QA.md)。

标题支持可选 `headerImageProfile`／`headerImageProfiles`，保留完整源投影与正确状态回退；展示页资源包区可预览加／减号。减号回退保持11:3比例，源 GPU 绘制使用宿主明确提供的 paint rect。见 [标题图像采样](docs/RESOURCE_PACK_HEADER_IMAGES.md)。

资源包验证报告入口 `#manifest-validation`：新增 `ManifestValidationScreen`、`ManifestValidationContent`、`ManifestPackSummary`、`ManifestValidationIssues`、`ManifestValidationIssue`、`ManifestValidationButton` 六个可复用部件。保留独立全局状态、完整问题集合和原始操作target；复制、刷新、删除仅发出宿主请求。默认报告使用文字刷新／删除，独立预览另外提供图标变体。见 [MANIFEST_VALIDATION_QA.md](docs/MANIFEST_VALIDATION_QA.md)。

设置源码基础件入口 `#settings-source` 提供 SettingsFrame／SettingsNavigation／SettingsFields 与纯布局函数 layoutSettingsFrame。`#world-settings` 直接展示公开整页组件、服务器／Debug开关和Cloud独立预览。World 设置组合现提供 `WorldSettingsScreen`、`WorldServerSettings`、`WorldCloudSettings`、`WorldDebugSettings`，覆盖三个源别名、固定内容挂载、九种服务器工厂和独立32高提交、Cloud5及Debug7／150选项。当前源码268组件＋6数据＋13函数＝287运行时值；Classroom原始实现缺失，必须由外部模块接入，原生整页像素仍未完成。见 [整页API](docs/WORLD_SETTINGS_SCREEN.md) 与 [本阶段验证](docs/WORLD_SETTINGS_SCREEN_QA.md)。

## 本地运行

需要 Node.js 22.12+ 或 24+。

```sh
npm ci
npm run dev
# http://127.0.0.1:5173

npm run build     # dist/: 组件库；site/: 展示页
npx playwright install chromium
npm test          # 桌面与手机交互、字体、重排、axe 检查
npm pack          # mcbeui-0.1.0.tgz
```

## 安装与使用

当前未发布到 npm。先在本仓库执行 `npm pack`，再在消费项目安装生成的文件。

```sh
npm install /absolute/path/to/mcbeui-0.1.0.tgz
```

组件模块引用的公开 PNG / TGA / JSON 保持原始字节，以绝对 `data:` URL 随库构建内联，避免消费项目依赖优化后丢失素材路径；原文件、metadata 和许可仍保留在包内。使用 CSP 的宿主需按所用组件允许 `data:` 图片与材质读取。可选本机游戏字体和私有素材仍由宿主自行提供。

已有原始游戏字体档案的宿主，可使用可选的[分页位图准备工具](docs/CLASSIC_BITMAP_FONT_QA.md)生成`BitmapText`／Credits字体描述表。原图保留在本机私有缓存，默认字体不变；候选分页规则与单行原生前景mask验证的限制均单独记录。

```tsx
import { useState } from 'react';
import { Button, Panel, Switch, TextField } from 'mcbeui';
import 'mcbeui/styles.css';
import 'mcbeui/fonts.css'; // 可选，自托管像素字体

export function SimpleWorldControls() {
  const [multiplayer, setMultiplayer] = useState(true);
  return (
    <Panel title="World settings">
      <form onSubmit={event => {
        event.preventDefault();
        console.log(new FormData(event.currentTarget).get('worldName'));
      }}>
        <TextField label="World name" name="worldName" defaultValue="My world" required />
        <Switch label="Multiplayer" name="multiplayer" checked={multiplayer}
          onChange={event => setMultiplayer(event.target.checked)} />
        <Button type="submit" variant="primary">Create world</Button>
      </form>
    </Panel>
  );
}
```

React / React DOM 18.3 或 19 为 peer dependencies。库的运行时代码没有其他依赖。ESM only，入口包含 `use client`；Next.js App Router 将样式导入放在根 layout，交互组件放在客户端组件中。可以 SSR 渲染；Dialog 首次挂载后才创建 portal。

## 组件

> World 设置组合现提供 `WorldSettingsScreen`、`WorldServerSettings`、`WorldCloudSettings`、`WorldDebugSettings`，覆盖三个源别名、固定内容挂载、九种服务器工厂和独立32高提交、Cloud5及Debug7／150选项。当前源码268组件＋6数据＋13函数＝287运行时值；Classroom原始实现缺失，必须由外部模块接入，原生整页像素仍未完成。见 [整页API](docs/WORLD_SETTINGS_SCREEN.md) 与 [本阶段验证](docs/WORLD_SETTINGS_SCREEN_QA.md)。 各历史批次单独记录；开发／生产一致性与共享材质引擎零差不等于Minecraft独立原生证据。

> 历史Manifest阶段实际安装包为253组件／271运行时值；React18／19、四种默认安装运行组合及桌面／手机生产展示已验证。Manifest图标平面6／18一致、12未通过；此前资源包平面92／120一致、28未通过，两套语料分别保留。原生整页像素仍未认证。范围见[MANIFEST_VALIDATION_QA.md](docs/MANIFEST_VALIDATION_QA.md)与[RESOURCE_PACKS_QA.md](docs/RESOURCE_PACKS_QA.md)。此前Classic Play阶段为239／257，原有证据保留在[PLAY_SCREEN_QA.md](docs/PLAY_SCREEN_QA.md)。

> Furnace已验阶段：227 组件／245 运行时值。新增完整熔炉、高炉、烟熏炉与可复用配方书等8部件；49项Node、browser04单批143个浏览器项目用例、8个独立filter像素平面、React18／19实际包与开发／生产四组合均通过。全库及原生整页像素资格仍未完成。入口 `#furnace-screens`；见 [FURNACE_SCREEN_QA.md](docs/FURNACE_SCREEN_QA.md)。

> OreModal阶段：219 组件／237 运行时值。新增 5 个现代 Ore 弹窗原语，按原版源码校准字体、阴影、关闭按钮、正文与操作区。桌面／手机 72 项、Node 72 项、React 18/19 实际包及开发／生产四种安装组合通过。原版整页像素对照仍未达标，组件数量不表示像素认证。入口 `#ore-modals`；范围见 [ORE_MODAL_QA.md](docs/ORE_MODAL_QA.md)。

> 上一有限阶段：214 组件／232 运行时值，新增现代 `OreExternalServerForm`、`OreButton`、`OreActionBar`、`OreScreenFrame`、`OreScrollArea`。默认 Enter 对齐原版只 blur；窄屏操作栏移出滚动区。最终浏览器 93 通过／1 项预期跳过，Node 52、React 18/19 包、四种默认 Vite 安装组合与两项生产展示检查通过。完整原版帧仍有 1,419,830 像素差异，未宣称整页 pixel perfect。入口 `#ore-external-servers`；范围见 [ORE_EXTERNAL_SERVER_QA.md](docs/ORE_EXTERNAL_SERVER_QA.md)。

> 上一阶段：209 组件／227 运行时值，新增 `OreTextField` 与 `OreFieldSection`。现代菜单字段使用宿主完整原图，保留原生输入、ref、选字和 IME；没有混用 Classic 材质。最终浏览器 20/20、Node 16/16、React 18/19 实际包、默认 Vite 四组合与生产展示两项通过。六个完整材质平面 149,760 像素 RGBA 零差；原生整页仍未认证。入口 `#ore-text-fields`，规格与资格见 [ORE_TEXT_FIELD_QA.md](docs/ORE_TEXT_FIELD_QA.md)。本轮已取得原版 OreUI GPU 基准，并在采集后关闭 Minecraft、PIX 和 Computer Use。

> Classic上一阶段公开207组件／225运行时值，新增ExternalServerForm与ExternalServerField；source browser04完整67／67通过：48交互＋19材质合同（15完整RGBA零差＋4源alpha参数合同）。四个partial-alpha像素候选仍UNQUALIFIED，停止套用旧scalar／perpatch规则；native未认证。先前package02与Vite四组合是forced-colors specificity修复前CSS阶段；当前package03、实际React18／19安装四组合02与built02六项均已通过，Node最终25项通过。此前205／223及具名历史结果保留原受检范围。

各组件的完整类型由包内 `.d.ts` 导出，例如 `ButtonProps`、`DialogProps`、`TabItem`。除 Dialog 和 PixelIcon 外，各组件转发 ref 到主要原生节点。ReactNode 属性支持文本、图标或组合内容。

| 组件 | 主要属性 | 行为 |
| --- | --- | --- |
| `SettingsFrame` | **必填** `layout`、`background`、`font`／`titleFont`、标题／对齐／阴影、`back`、`selectorContent`／`content`、滚动区名称；`onRequest`、`controllerRef`、`popupHostRef` | 原设置双栏／fullscreen-content框架与独立滚动；div ref，宿主求值尺寸与安全区；退出／切栏仅发请求 |
| `SettingsNavigation` | **必填** `items`、受控 `value`、`width`／`scale`／`font`、`sourceDefaultIndex`、`toggleOnHover`、`hoverPolicy`、`hiddenSlots`；`onValueChange`、`itemRefs` | section／group／spacer；源索引与业务ID分开，不从索引推激活页；30高行／31高状态图；div ref |
| `SettingsFields` | **必填** `rows`、`width`／`scale`、`typography`、`hiddenSlots`；`onRequest`、`popupHost`、`textFormatting`、原生属性／refs映射 | 15种源字段／容器，含独立panel、raw权限标记及URI intent；可选颜色码由宿主显式给RGB；div ref |
| `WorldGameSettings`／`WorldMultiplayerSettings` | **必填** 完整 `snapshot`、`inputMode` 和字段视觉预算；`onRequest`、原生属性／refs映射 | 固定69／8直属源控件与实际嵌套结构，不接受rows／children；仅请求宿主接受变更；div ref |
| `WorldSettingsScreen`／`WorldServerSettings`／`WorldCloudSettings`／`WorldDebugSettings` | 必填固定快照、宿主布局／字体；具名 refs 与请求 | 三别名源挂载、服务器工厂＋submit、Cloud5、Debug7／150选项；Classroom外部接口；[API](docs/WORLD_SETTINGS_SCREEN.md) |
| `WorldSettingsNavigation` | **必填** `mode`、完整 `snapshot`、受控 `value` 及导航视觉预算；可选 `materialRendering`、回调、item／node refs | 保留17＋5源子树与显式加载帧；默认CSS，可选source-image／ceil及CSS回退，无库内时钟；div ref |
| `ManifestValidationScreen` | `open`、`viewportSize`、`scale`、`title`、完整 `content`；`onCloseRequest`、可选 `onViewRequest` | 原报告窗口及modal生命周期；退出／翻页为宿主请求，div ref |
| `ManifestValidationContent` | 显式 `size`、`summary`、`entries`／`capacity`、全局标记与独立状态 | 原滚动区与纵向问题工厂；div／viewport refs |
| `ManifestPackSummary` | 完整 `data`、布局预算、包身份、操作状态 | 包图、metadata及文字刷新／删除；div ref |
| `ManifestValidationIssues`／`ManifestValidationIssue` | 完整集合及显式容量／索引，或单条记录；`hasErrorsOrWarnings` | 全局标记控制复制／正文，操作保留行身份；div refs |
| `ManifestValidationButton` | 五种 `variant`、显式身份／状态／加载帧；文字变体必填 `width`，复制必填 `issue` | 原始PNG、独立加载选择及宿主操作请求；真实button ref |
| `Text` | `as`: span / p / h1…h4；`size`: sm / md / lg / xl；`shadow` 默认 true | 像素文字与无模糊阴影，转发 HTMLElement ref |
| `GuiImageLayer` | **必填** 物理 `width` / `height`、`guiScale`、`images`；可选 `scissor`、`outputRect`、`background`、`label`、`renderKey`、状态回调 | ref为canvas；已求值GLOBAL image / nine-slice几何及UI/Blit GPU profile；已分层验证底层 / 集成 / 包与生产，非原生整GUI认证 |
| `GuiLayer` | **必填** 物理 `width` / `height`、`guiScale`、有序image / sprite / model / text `commands`；文字含显式 `font` / `origin` / `fontScale` / `sampling` / `shader` | 单一RGBA8目标顺序绘制原图 / sprite / model / 字格；ref为canvas。历史图文17项范围见 [GUI_LAYER_QA.md](docs/GUI_LAYER_QA.md)，新增sprite / 呈现验证见 [GUI_SPRITE_QA.md](docs/GUI_SPRITE_QA.md) |
| `GuiIcon` | **必填** `name: GuiIconName`；`scale` 正整数（默认1）、`label`；span 属性 | 150张完整原版 GUI PNG，按原图物理像素整数缩放；ref 为 span；默认装饰，label 提供名称；不自动切状态 / tint / 裁切 |
| `BitmapText` | **必填** 字符串 children、`font`、`sampling`: point / bilinear、`shader`: bitmap / bitmap-smooth；可选 `renderer`: cpu（默认）/ webgl / webgl-shared、`layout`: visual（默认）/ advance、`profile`: atlas-rect（默认）/ bedrock-unicode、具体 CSS `background`、`scale`、`color`、显式 `shadow` 与回调 | ref 为 span；CPU 绘制任意字图矩形；webgl 独立 context，webgl-shared 同 Document 共享 Offscreen context、每实例 bitmaprenderer；background 是 GPU target clear 色；保留真实 DOM 原文及加载失败回退 |
| `Button` | `variant`: default / primary / danger / ghost；`size`: sm / md / lg；`loading`、`fullWidth`、`startIcon`、`endIcon` | 默认 `type="button"`；loading 保留文字，禁用并设置 aria-busy；继承 button 属性 |
| `IconButton` | Button 属性；**必填** `aria-label` | 正方形按钮，children 放图标 |
| `Panel` | `title`、`footer`、`variant`: default / inset | Classic 浅灰九宫格面板 / 灰色凹陷面板；section，标题自动关联 aria-labelledby |
| `TextField` | **必填** `label`；`description`、`error`；原生 input 属性 | 标签关联、错误与描述自动关联；error 设置 aria-invalid |
| `TextArea` | **必填** `label`；`description`、`error`；原生 textarea 属性 | 可垂直调整尺寸 |
| `ExternalServerForm` | **必填** `title`、`mode: add / edit`、`labels`、独立 `bindings`；字符串 `value` / `defaultValue`、`onValueChange`、`onAction`、`onClose`、`submitAction`、`scale`、`size`、`fieldProps` / `fieldRefs` | 内嵌原版316×179逻辑表单；form ref，宿主负责验证／存储／连接和modal；source功能／参数合同已验；4项alpha像素候选UNQUALIFIED；新CSS实际包／安装与展示复验通过 |
| `ExternalServerField` | **必填** `kind: name / address / port`、`label`；`width`、`scale`、字符串 `value` / `defaultValue`与原生input属性 | 38高源行与真实input ref；默认maxlength为16／256／6，port仅numeric键盘提示，不过滤或解析 |
| `Checkbox` | **必填** `label`；`description`、`indeterminate`；原生 checkbox 属性 | 原生 checked/defaultChecked、name/value、required、键盘 Space |
| `Switch` | **必填** `label`；`description`；原生 checkbox 属性 | 原生 checkbox + role=switch，支持表单 |
| `RadioGroup` | **必填** `label`、`options`；`value` / `defaultValue`；`onValueChange`、`name`、`disabled`、`required`、`orientation` | 原生 fieldset/legend/radio，自动独立 name，原生方向键操作 |
| `Slider` | **必填** `label`；`value` / `defaultValue`；`onValueChange`、`min`、`max`、`step`、`formatValue` | 原生 range，显示格式化值，支持方向键、Home、End |
| `Combobox` | **必填** `label`、`options`；`value` / `defaultValue`、`onValueChange`、`placeholder`、`name`、`form`、`required`、`disabled`、`description`、`error` | select-only combobox，原版样式列表，当前选中与活动项分离；原生表单提交 / 校验 / reset；ref 指向可见按钮 |
| `Select` | **必填** `label`、`options`；`description`、`error`；原生 select 属性 | 可见 trigger / popup 与 Combobox 共用 Classic 样式；ref 仍为 HTMLSelectElement，保留原生 onChange、form / reset / required / multiple |
| `Tabs` | **必填** `label`、`items`；`value` / `defaultValue`；`onValueChange`、`orientation` | items 为 `{ value, label, content, disabled? }[]`；方向键循环，Home/End，跳过禁用项，保留面板状态，支持 RTL |
| `Dialog` | **必填** `open`、`onOpenChange`、`title`；`width`、`height`、`style`、`description`、`footer`、`closeLabel`、`closeOnBackdrop` | border-box 尺寸，数值为 CSS px，style 优先；root / body 默认 clip，无自动滚动；保留原生 modal、Escape、遮罩关闭及焦点管理 |
| `Badge` | `variant`: default / success / warning / danger | 非交互标签 |
| `Progress` | **必填** `label`；`value`、`max`、`showValue` | Classic common.progress_bar 纹理，高 10 CSS px，完整填充图按进度裁切；省略 value 为不确定进度，数值限制在 0…max；reduced motion 下静止 |
| `Alert` | `title`；`variant`: info / success / warning / danger | danger 使用 role=alert，其余 role=status；可覆盖 role |
| `Separator` | 原生 hr 属性 | 双层硬边分割线 |
| `ItemSlot` | `item`、`label`、`image`、`count`、`selected`、`durability`、`placeholder`、`underlay`、`showTooltip`、`onSecondaryAction`；原生 button 属性 | 真实 container cell，36×36 槽位 / 32×32 物品；蓝色选中、绿色悬停、白色键盘焦点；0 为空、1 隐藏角标；underlay 在物品下方常驻，placeholder 仅空槽显示 |
| `ItemTooltip` | **必填** `item`；可选 `renderText(text,{kind,index})`；div 属性 | 名称、显式 lore；可继承 `item.tooltipTextRenderer`，独立 renderText 优先，富文本 lore 原样保留。ItemSlot 跟随鼠标、处理焦点/Escape，并按异步字形大小重新避让 |
| `ItemGlint` | **必填** `imageSrc`、`uniforms`、`glintSampler`、`blend`；可选尺寸、纹理、label 与回调 | 真实附魔光效纹理与源着色公式；受控 canvas，无内置时钟或自动附魔绑定 |
| `InventoryGrid` | **必填** `label`、`items`；`size`、`columns`、`selectedIndex` / `defaultSelectedIndex`、`onSelectionChange`、`onSlotAction` | 单一 Tab 入口，方向键 / Home / End / Ctrl+Home/End，跳过禁用项；primary / secondary 操作事件 |
| `ItemImage` | `src`、`alt`、`imageProps`、children；span 属性 | 独立 32×32 物品区域，最近邻渲染；缺图不生成替代图案 |
| `ItemCount` | `count`、`hideSingle`；span 属性 | 共享槽位数量角标；默认隐藏 0 / 1，拒绝非有限数量 |
| `DurabilityBar` | **必填** `value`；`max`、`hideWhenFull`、`label`、`color` | 独立 meter，前景最大 12×1 game、黑包络 13×2；连续 hue 获五木剑有限样本支持，通用算法/取整 tie 未恢复，可覆盖 color |
| `SlotPlaceholder` | `src`、`alt`、children；span 属性 | 共享空槽占位图层；由调用方提供原始资源 |
| `ResultSlot` | ItemSlot 属性；`available`、`size`: normal / large、`onTake` | 大结果槽 52×52，物品仍 32×32；空结果保留焦点并阻止取出操作 |
| `PlayerInventory` | `items`、`hotbar`、`label`、`hotbarLabel`、`renderText`、`selectedIndex`、`onSelectionChange`、`onSlotAction` | 27 格背包与 9 格快捷栏，共享 0…35 的选中索引 |
| `WorkstationFrame` | **必填** `title`；`inventory`、`hotbar`、`inventoryLabel`、`renderText`、`onClose`、`closeLabel`、`onInventoryAction` | 176×166 游戏像素 Classic 容器外框，以 GUI 2 显示；窄屏局部滚动 |
| `InventoryScreenFrame` | **必填** `title`、`book: ReactNode`、`children: ReactNode`；`layout` / `defaultLayout`: recipe-book / survival、`onLayoutChange`、`onHelp`、`onClose`、`helpLabel`、`closeLabel`、`showClose` | 共享固定 326×166 game 背包 / 工作台外框；默认 recipe-book，survival 隐藏 book 并居中右面板，ref 为 section；不适用于熔炉 compact 根布局 |
| `Grindstone` | `inputs`: readonly [item, item]；`result`、`invalid`、`onInputAction`、`onTakeResult`、可选 `imageRender: GrindstoneImageRenderProfile`；Frame 属性 | 双输入 / ResultSlot / 39槽背包组合；可选whole-frame原图、显式labels / item images / models同目标。省略profile走CSS，结果规则由宿主提供；见 [GRINDSTONE_IMAGE_QA.md](docs/GRINDSTONE_IMAGE_QA.md) |
| `EnchantingTable` | **必填** `options`，可为空数组；`item`、`lapis`、`book`、`onInputAction`、`onEnchant`、`renderText`、`imageRender?: EnchantingTableImageRenderProfile`（可选text / 显式metrics与styles、itemImages / itemModels）、`options[].runeText`；Frame 属性 | 固定三行背景；仅有记录的行提供选项/费用/动作，缺记录为 aria-hidden 非交互背景；book 支持自定义渲染 |
| `EnchantmentOption` | **必填** `id`、`label`、`level`；`tier`: 1 / 2 / 3、`runes`、`disabled`、`buttonId`、`onEnchant`、`renderText`；button 属性 | 可独立使用的附魔选项；id 是业务 ID，buttonId 是可选 DOM id；onClick.preventDefault() 取消选择回调 |
| `EnchantingRunes` | **必填** `text`、`atlasUrl`；`scale`: 1…4、`color` | 按原始 SGA 图集采样字形与字距；图集由调用方提供，不随 npm 捆绑 |
| `EnchantingBook` | `textureUrl`、`open`、`pageFlip`、`lighting`: calibrated / unlit、`yaw`、`pitch`、`roll`、`rendererState?: EnchantingBookRendererState`、`onRendererError`；canvas 属性 | 实际 Bedrock GUI draw 的mesh、UV和着色路径；rendererState 接收列主序 projection / view / model 与7或8组bone矩阵及可选光照/overlay；默认 open/pageFlip 仍是受控重建 |
| `ProcessingArrow` | `progress`: 0…1、`label`、`variant`: smelting / crafting；div 属性 | 原始箭头纹理，smelting 从左向右裁切完整填充图；crafting 使用静态箭头 |
| `FuelIndicator` | `progress`: 0…1、`label`；div 属性 | 原始火焰纹理，自底部显示剩余比例，保留 full 图原尺寸 |
| `RecipeGrid` | InventoryGrid 属性；`columns`、`rows`: 2 / 3 | 共用合成网格；尺寸决定槽位数，支持 2×2 和 3×3 |
| `CraftingTable` | `inputs`、`result`、`selectedInputIndex`、`onInputAction`、`onTakeResult`；容器库存属性 | 可复用源 3×3 工作台右面板；完整组合使用 CraftingScreen |
| `CraftingScreen` | **必填** `recipeBook: RecipeBookProps`；可选 `crafting`、`layout` / `defaultLayout`: recipe-book / survival、布局 / 帮助 / 关闭回调、`showClose`、`imageRender: CraftingScreenImageRenderProfile` | Classic 配方书＋工作台＋工具条；46个右侧槽与配方集合分开；可选完整原图组合与七个文字角色，真实输入和滚动保留，配方与合成由宿主控制。见 [CRAFTING_IMAGE_QA.md](docs/CRAFTING_IMAGE_QA.md) |
| `RecipeBook` | **必填** `title`、`entries`、`categoryId`、`query`、`craftableOnly`；分类 / 搜索 / 筛选回调、`selectedId`、`onRecipeAction`、`creative` | 受控配方页，entries 已由宿主筛选和展开；复用分类、搜索、筛选和滚动，ref 为 div |
| `RecipeBookEntry` | **必填** `entry: RecipeBookItem`；`onRecipeAction(id, action)`、槽位按钮属性 | entry 提供 item / preview、craftableCount、backgroundImage / backgroundSlice、modifier；零可制作数保留物品，不可制作颜色不自动禁用；primary / secondary / tertiary 操作，ref 为 button |
| `RecipeFilterToggle` | `craftableOnly` / `defaultCraftableOnly`、`onCraftableOnlyChange`、`label`、`disabled`、`readOnly` | 可独立复用的可制作筛选按钮，aria-pressed 表达状态；ref 为 button，不自行过滤集合 |
| `BookReader` | `pages` / `defaultPages`、`spreadIndex` / `defaultSpreadIndex`、navigation、pageNumberFontMode、title / author、layout / skin / labels、`onFinish` | 双页只读书本；独立页码字体 /宿主箭头请求，省略navigation时保留数组导航；ref为section，见 [BOOK_QA.md](docs/BOOK_QA.md) |
| `BookEditor` | Reader基础属性、`onPagesChange`、`mode` / `defaultMode`、`onSign`、`onPageAction`、fontMode /逐页factory、textarea / input属性与ref | 真实书与笔编辑与签名快照；宿主处理页结构、持久化和关闭，不自动分页或写入世界 |
| `BookPage` | 必填`side`；text / defaultText、readOnly、blank、pageNumber / pageNumberFontMode、`onTextChange`、textareaRef、fontMode | 可复用单页，编辑体与页码字体角色独立，保留真实textarea；ref为div |
| `BookPageTurnButton` | 必填`direction`: previous / next；available、textures、button属性 | 原图24单位翻页按钮；不可用时隐藏且禁用，ref为button |
| `SignTextSurface` | variant、wood / texture、value / defaultValue、onValueChange、scale / geometry、textareaProps / textareaRef、fontMode | 普通 / 悬挂原图牌面与真实多行输入，可独立复用；根ref为div。见 [SIGN_QA.md](docs/SIGN_QA.md) |
| `SignEditor` | Surface属性、open / defaultOpen、onOpenChange、exitBehavior、onCloseRequest / onCommit / onCancel、dialogRef | 原生dialog编辑层；宿主处理关闭请求与持久化，Enter保留换行，不自动写世界 |
| `JigsawEditor` | value / defaultValue、onValueChange、size / scale、jointEnabled、labels、onDone / onHelp / onCancel、各字段inputRefs | 源表单组合：六个字符串draft与接点开关；宿主验证signed int32及方块标识符，不执行世界生成。见 [JIGSAW_QA.md](docs/JIGSAW_QA.md) |
| `JigsawPriorityFields` | value / defaultValue、onValueChange、fieldHeight、scale、inputProps / inputRefs | 可复用选择 /放置优先级fieldset；保留负号与临时draft，源wrapper16与默认host行高32分别说明 |
| `CommandBlockEditor` | value / defaultValue、onValueChange、expanded、previousOutput / previousInfo、独立enabled flags、onClose / onPasteRequest | 源双栏表单，8字段由宿主接受；不执行命令或直接读取剪贴板。见 [COMMAND_BLOCK_QA.md](docs/COMMAND_BLOCK_QA.md) |
| `CommandInput` | command的value / defaultValue、onValueChange、expanded / onExpandedChange、textareaProps / ref、onPasteRequest | compact / expanded共享一个真实textarea，Enter不执行，composition期间保留输入身份 |
| `CommandOutputPanel` | previousOutput / previousInfo、trackOutput / onTrackOutputChange、trackOutputEnabled、outputRef | 可复用只读输出与独立历史模式快照；track开关不清空输出 |
| `StructureEditor` | value / defaultValue、onValueChange、capabilities、visibility / enabled、onAction / onCancel、preview / onPreviewTurn | 源结构表单与宿主预览槽；所有保存 /加载 /导出和世界操作由宿主实现。见 [STRUCTURE_EDITOR_QA.md](docs/STRUCTURE_EDITOR_QA.md) |
| `XYZVectorInput` | 必填label；value / defaultValue、onValueChange、maxLength、inputProps / inputRefs | 可复用XYZ真实文本input；保留raw draft，不解析坐标或钳制数值，root ref为fieldset |
| `StartMenu` / `StartMenuTitle` / `StartMenuActionStack` / `StartMenuAuxiliaryActions` / `StartMenuProfile` / `StartMenuFooter` | 固定命名分支、五种标题布局、显式included /visible /enabled、宿主场景与角色渲染器 | Classic开始页与六个可复用零件，实际字体 /渲染器 /服务由宿主接入；见 [START_MENU_QA.md](docs/START_MENU_QA.md) |
| `StorageManagement` / `StorageToolbar` / `StorageCategory` / `StorageItem` / `StorageItemActions` / `StorageSelectionFooter` / `StorageDependencyDialog` / `StorageSharingProgress` | 显式宿主数据与能力、分类 /选择 /操作、鼠标 /触控滚动、依赖阅读进度与分享进度 | Settings存储内容组合及八个可复用部分；文件操作仅回调，缺失的弹窗按钮几何须显式提供。见 [STORAGE_QA.md](docs/STORAGE_QA.md) |
| `ScreenshotFlash` | 必填 `flashImage`、`durationMs`、`size`；trigger、受控alpha /progress、motion、onFinished | 源截图闪光覆盖层；图像与时钟由宿主提供，完成后背景保留至宿主隐藏。见 [SCREENSHOT_FLASH_QA.md](docs/SCREENSHOT_FLASH_QA.md) |
| `OrePlayerPermissions` / `OrePermissionLevelSelect` / `OrePermissionToggleRow` / `OrePlayerCard` / `OreSwitch` | 显式viewportSize / guiScale、mouse或touch滚动模式、独立角色与权限草稿、host图标 /字体 /请求；文字组件可选textLineBox | 现代OreUI源组合，窗口与widget断点分别计算，窄widget与非desktop共用modal；汉字行框可显式选择fallback度量，默认保留primary。不执行授权或Kick，未认证原生整页。见 [ORE_PLAYER_PERMISSIONS_QA.md](docs/ORE_PLAYER_PERMISSIONS_QA.md) |
| `ChalkboardEditor` / `ChalkboardTextField` / `ChalkboardLock` | 必填宿主尺寸 /长度 /标题，独立文本编辑能力、锁状态与锁标签，真实 textarea /checkbox | 原版黑板面板、可复用文字框与30×16开关；不实现世界存储或教育权限服务。见 [CHALKBOARD_QA.md](docs/CHALKBOARD_QA.md) |
| `PlayerPermissions` / `PermissionLevelSelect` / `PermissionToggleRow` / `PermissionPlayerRow` | players / permissionOptions、选中玩家与值分别受控、nullable角色、动态boolean草稿、独立动作标志与真实refs | 固定Classic权限组合，角色不重写权限位；Kick /Ban只发宿主请求，当前OreUI是不同布局。见 [PLAYER_PERMISSIONS_QA.md](docs/PLAYER_PERMISSIONS_QA.md) |
| `DocumentViewer` / `DocumentHeading` / `DocumentParagraph` | groups / label、value / defaultValue、sectionTitle、scrollPolicy、双 viewport refs、提示与返回请求；标题 /段落可独立复用 | HowToPlay /Encyclopedia 源双栏组合与真实可选文字，size / scale由宿主提供；见 [DOCUMENT_VIEWER_QA.md](docs/DOCUMENT_VIEWER_QA.md) |
| `ServerActionForm` | 必填title / rows；body、onAction、onCancel、icon状态 | 四种源row的动作表单；不发服务器响应，区别于ServerList。见 [SERVER_FORMS_QA.md](docs/SERVER_FORMS_QA.md) |
| `ServerCustomForm` | 必填title / fields；typed value / defaultValue、onValueChange / onSubmit、字段refs / tooltip | 九种schema field及独立展开 /选择状态；宿主接受数据，不实现后端协议 |
| `NpcDialogue` / `NpcEditor` | value / defaultValue、onValueChange、宿主权限 /page状态、actor /skins /actions、关闭 /动作回调 | student对话与worldbuilder多分支编辑，命令 /URL /世界操作均由宿主执行，见 [NPC_QA.md](docs/NPC_QA.md) |
| `NpcActionEditor` | action value、state、commandsEnabled、maximized / onMaximizedChange、真实字段refs | command /URL raw draft与独立mode bool，可复用展开编辑；Web live-bound不等于引擎copy时机 |
| `NpcSkinPicker` / `NpcPortrait` | skins /选择与分页回调、actor、动态网格 /尺寸、refs | 宿主皮肤集合及ReactNode人物预览；不提供假角色图片或原生3D renderer |
| `Furnace` / `BlastFurnace` / `Smoker` | `input`、`fuel`、`result`、`progress`、`fuelRemaining`、`onInputAction`、`onTakeResult`；容器库存属性 | 共用原版熔炼右面板，原始浮点槽位布局、火焰与进度裁切；游戏规则由使用方提供 |
| `PixelIcon` | **必填** `name`；`size`，默认 20 | 16×16 原创 SVG 图标，默认装饰性 aria-hidden，图标按钮须提供标签 |
| `Image` | **必填** `src`、`alt`、`sourceSize`；`size`、`scale`；img 属性 | PNG 物理尺寸与 GUI 逻辑尺寸分离，静态 SSR，无加载后测量；空 alt 表示装饰图 |
| `NineSlice` | **必填** `src`、`sourceSize`、`slice`；`destinationBorder`、`size`、`scale`、`fill`、`alt`、children | 源切片用物理像素，目标边距用逻辑像素；边框层与内容分离，children 保持可访问和交互；非法几何抛 RangeError |
| `ContainerFrame` | **必填** `title`；`height`、`titleAlign`、`titleOffset`、`inventory`、`hotbar`、`inventorySelectedIndex`、`onInventorySelectionChange`、`onInventoryAction`、`onClose` | 352 CSS px 宽、可变高度容器，共享底部锚定的玩家物品栏；height / titleOffset 用 CSS px |
| `Chest` | `rows`、`items`、`selectedIndex`、`onSelectionChange`、`onSlotAction`；容器库存属性 | 3 / 6 行箱子及 1…6 行数据驱动布局；行数取整并限制范围，非有限值回退 3 |
| `Hopper` / `Dispenser` / `Dropper` / `ShulkerBox` | `items`、`selectedIndex`、`onSelectionChange`、`onSlotAction`；容器库存属性 | 共用存储 API，分别保留 5 / 9 / 9 / 27 格与原始面板高度；空槽允许操作回调 |
| `Anvil` | **必填** `name`；`onNameChange`、`inputs`、`result`、`invalid`、`cost`、`renameDisabled`、`renameReadOnly`、`onInputAction`、`onTakeResult`、可选 `imageRender: AnvilImageRenderProfile` | 真实input编辑、30字符、39槽与费用；失焦长名称按原版clipper /右锚显示末尾；可选原图四文字角色。见 [ANVIL_NAME_QA.md](docs/ANVIL_NAME_QA.md) / [ANVIL_IMAGE_QA.md](docs/ANVIL_IMAGE_QA.md) |
| `BrewingIndicator` | `variant`: arrow / bubbles / fuel；`progress`: 0…1、`label` | 可复用的原版酿造图层；裁切完整前景，不缩放填充图 |
| `BrewingStand` | `ingredient`、`fuel`、`bottles`、`selectedSlot`、`progress`、`bubbles`、`fuelRemaining`、`onSelectionChange`、`onSlotAction`；Frame 属性 | 酿造主面板与五个可操作槽；配方、消耗和动画时序由调用方提供 |
| `SmithingTable` | `inputs`: readonly [template, base, addition]；`result`、`invalid`、`templateOverlay`、`baseOverlay`、`materialOverlay`、`overlayFrame`、`preview`、`onInputAction`、`onTakeResult` | 现代三输入锻造主面板，真实横向提示图集；baseOverlay / materialOverlay 默认 null，由宿主根据实际模板状态显式启用；preview 接入调用方 renderer |
| `CartographyTable` | `name`、`onNameChange`、`inputs`、`result`、`resultAvailable`、`mode`、`description`、`onInputAction`、`onTakeResult` | 七种原版预览模式、30 字符重命名、352×440 CSS px 大视口布局；description 栈锚点仍待原生校准 |
| `ScrollBar` | **必填** `value`、`max`、`pageSize`、`onValueChange`、`label`、`controls`；`orientation`、`variant`、`scale`、`disabled` | 受控滚动偏移，单位 CSS px；原版 rail / handle，支持拖动、翻页、方向键和 Home / End |
| `ScrollArea` | `orientation`: vertical / horizontal / both；`variant`、`scale`、`scrollbarVisibility`、`label`、`viewportRef`、`viewportProps`、`contentProps`、`onScrollPositionChange` | 原生 overflow 保留滚轮、触屏与文本选择，自动测量内容并关联原版滚动条 |
| `HealthBar` / `HungerBar` / `ArmorBar` | `value`: 0…20、`label`；Health 的 `variant` / `flashing`；Hunger 的 `effect` / `flashing` | 使用真实整格 / 半格图；行排列属于 custom renderer 的 Web 重建，尚未取得整帧验收 |
| `AirBar` | `value`: 0…10 或显式 `states`: full / empty / pop / hidden | 显式气泡状态，不把 value 等同于游戏水下 tick |
| `ExperienceBar` | `progress`: 0…1、`level`、`showLevel`、`label` | 原版经验图层与级别文本；进度和等级由调用方提供 |
| `Hotbar` | `items`、`selectedIndex` / `defaultSelectedIndex`、`disabled`、`onSelectionChange`、`onSlotAction`、`label` | 九格原版快捷栏，方向键仅移动焦点，Enter / Space 选择；全局数字键与滚轮切换由调用方绑定 |
| `Crosshair` | `blendMode`: difference / normal、`label` | 原版 icons.png UV 裁切；difference 对不透明背景对应原生白色准星反色，完整合成仍待原生截图 |
| `BossBar` | **必填** `name`、`value`；`max`、`color`: readonly [r,g,b]（0…1）、`label` | 源 182×20 游戏像素面板与九宫格进度条；颜色是原图通道乘数，不选择伪造皮肤 |
| `ChatMessage` | children；`backgroundOpacity`、`opacity`、`color`、`shadow`；div 属性 | 独立聊天行，使用原始黑色图层；格式化和本地化由调用方提供 |
| `ChatPanel` | **必填** `messages`: {id,text}[]；`input`、`value` / `defaultValue`、`onValueChange`、`onSend`、`maxMessages` | 最多显示最近 50 条，原生滚动 log；可选 Web 输入表单处理受控草稿与 IME，不连接游戏或服务器 |
| `Scoreboard` | **必填** `title`、`entries`: {id,name,score}[]；`backgroundOpacity`、`titleBackgroundOpacity`、`label` | 源 scoreboard 侧栏结构，保留传入顺序；分数和行排序由调用方提供 |
| `StatusEffect` | **必填** `name`；`effect`、`iconSrc`、`ambient`、`duration`、`opacity` | 真实状态 PNG 或调用方图像；HUD 槽位布局是 custom renderer 的 Web 重建 |
| `ActionBar` / `HeldItemTooltip` | children；`showBackground`、`backgroundOpacity`、`opacity`、`shadow`；HeldItemTooltip 的 `color` | 独立 HUD 文本及可选原始背景；生命周期由调用方管理，手持物品提示不同于背包悬停提示 |
| `TitleOverlay` | **必填** `title`；`subtitle`、`showBackground`、`backgroundOpacity`、`opacity`、`shadow` | 标题 / 副标题源偏移与字体枚举映射；Web 数值字号及整屏位置仍需原生校准 |
| `Spinner` | `label`、`scale`、`frame`: 0…9、`paused`、`decorative`；span 属性 | 原版 10 帧 loading_spin 图集与 10fps 序列；静态帧可用于检查原图，不合成旋转图案 |
| `Tooltip` | **必填** 单个可聚焦 children、`content`；`open` / `defaultOpen`、`onOpenChange`、`side`、`delayDuration`、`closeDelay`、`offset`、`disabled`、`contentProps` | 原版背景与 Web 浮层定位，保留已有 aria-describedby；支持焦点、悬停、触屏及 Escape；内容用于描述，不承载交互控件 |
| `Toast` | **必填** `open`、`onOpenChange`、`title`；`description`、`icon`、`action`、`variant`、`duration`、`dismissLabel` | 保持挂载的 polite status；默认持续显示，显式超时至少 5 秒，错误 / action 持续显示，悬停、聚焦与页面隐藏时暂停 |
| `ToggleButton` | Button 属性；`pressed` / `defaultPressed`、`onPressedChange` | 原版 toggle 皮肤与 aria-pressed，Enter / Space 通过原生按钮激活 |
| `SearchField` | TextField 属性；`value` / `defaultValue`、`onValueChange`、`onSearch`、`clearable`、`clearLabel`、`onClear` | 原生 search 输入、真实搜索图标；Enter 查询，清空后恢复焦点，支持表单 reset 与 IME |
| `NavigationList` | **必填** `label`、`items`: {value,label,icon?,disabled?}[]；`value` / `defaultValue`、`onValueChange`、`disabled` | 单一 Tab 入口，方向键 / Home / End 仅移动焦点；原生激活后提交选中项，跳过禁用项 |
| `SettingRow` | **必填** `label`、render-prop children；`description`、`disabled`、`controlId`、`layout`: stacked / inline | 将 id / aria-labelledby / aria-describedby / disabled 传给调用方控件，保留标签与说明关联 |
| `KeybindingField` | **必填** `label`；`value` / `defaultValue`、`resetValue`、`onValueChange`、`name`、`formatValue`、`description`、`error`、`disabled` | 捕获物理 event.code 和修饰键；Escape 取消、Tab 离开、Delete / Backspace 清空；冲突规则由宿主管理 |
| `RecipeSelectionGrid` | **必填** `label`、`options`: RecipeSelectionOption[]；`selectedId`、`onSelect`、`columns`、`previewKind` | 切石 / 织布共享的可访问选择网格，保留显式 renderer 接口和原版选中层 |
| `Stonecutter` | `input`、`result`、`resultAvailable`、`recipes`、`selectedRecipeId`、`onRecipeSelect`、`onInputAction`、`onTakeResult` | 原版双面板、左侧配方选择与右侧库存；配方计算和 block renderer 由调用方提供 |
| `Loom` | `inputs`、`result`、`resultAvailable`、`patterns`、`selectedPatternId`、`onPatternSelect`、`showInputOverlays`、`bannerPreview`、`onInputAction`、`onTakeResult` | 原版双面板、旗帜 / 染料 / 图案槽与提示图；旗帜渲染由调用方注入 |
| `BeaconEffect` | **必填** `effect`；`selected`、`extraEffect`；button 属性 | 原版效果按钮与图像，供独立布局或 Beacon 复用 |
| `Beacon` | `payment`、`acceptedItems`、`effects`、`extraEffect`、`canConfirm`、`onPaymentAction`、`onEffectSelect`、`onConfirm`、`onCancel` | 原版主 / 次级效果与支付面板；等级、可用状态、支付和选择有效性由调用方控制 |
| `CrafterSlot` | ItemSlot 属性；`index`、`enabled`、`onEnabledChange`、`onSlotAction` | 可复用合成器槽，enabled=false 时仍能操作以重新启用；disabled 才禁止按钮操作 |
| `Crafter` | `items`、`disabledSlots`、`powered`、`output`、`onSlotAction`、`onSlotEnabledChange` | 原版 3×3 槽与供电状态；output 为预览，不生成可取出的伪结果槽，游戏规则由调用方提供 |
| `PlayScreen` | **必填** viewportSize、scale、inputMode、navigation、worlds、friends、servers、exitButtonVisible；paneRefs、popups、inputHints、onExitRequest | Classic默认三页完整组合；宿主数据／动作与显式canvas，两种popup居中于该canvas；native路由／整GUI未认证 |
| `PlayScreenFrame` / `PlayNavigationTabs` | viewportSize／scale、navigation；value／labels／counts／friends、tab refs、close绑定／refs | 282×(H−50) frame与270×(H−88)内容；源30高tabs／固定close holder、独立字面counts，不等于通用Tabs换皮 |
| `PlayWorldsContent` / `PlayFriendsContent` | **必填** size／scale／inputMode、provider／flags／labels、各collection与rowCount、loading快照；externalFamilies、onAction | 源标题、grid、空／loading／auth标志保持独立；Worlds下部20%是Storage状态，不是legacy列表；Realms族为显式外部依赖 |
| `PlayWorldRow` / `PlayNetworkWorldRow` | item、collection、index、width、scale；相应能力／labels、button props、onAction | 无自带列表滚动的真实source行；世界启动／edit／迁移及网络加入只通知宿主，旧WorldList／ServerList／PlayerCard保持兼容 |
| `PlayServersContent` / `PlayServerRow` / `PlayServerDetails` | 显式collections／visibility／details；kind／selected／enabled／info状态；三种detail可见flags、原始文案与宿主图像 | 行选择不连接；详情Join独立。Read More／Less可见时须给正有限readButtonHeight，例12只是Web预算；不认证native intrinsic高度 |
| `PlayJoinCodeDialog` / `PlayHighPingDialog` | **必填** open、labels、独立bindings；JoinCode的value／onValueChange、onAction／onClose、真实input／button refs | 原200×90代码与250×170高延迟factory；15字符输入、只读保留cancel／close，实际Web生命周期验证待本轮结果，不含登录／连接服务 |
| `WorldList` | **必填** `label`、`worlds`；`value` / `defaultValue`、`onValueChange`、`onPlay`、`onEdit`、`onDelete`、`scale`、`maxHeight` | 世界行与缩略图布局；方向键移动焦点，激活发出操作意图，日期 / 大小 / 模式由调用方格式化 |
| `ServerList` | **必填** `label`、`servers`；选择属性、`onConnect`、`onEdit`、`onDelete` | 服务器名称、说明、人数与状态原图；连接和在线检测由调用方实现 |
| `PlayerCard` | **必填** `name`；`avatar`、`renderSkin`、`platform`、`permissionIcon`、`onProfile`、`onPermissions`、`scale` | 玩家卡与权限入口，头像或 3D 皮肤 renderer 由调用方提供 |
| `PackCard` | **必填** `pack`；`selected`、`onSelect`、`onActiveChange`、`onMoveUp`、`onMoveDown`、`canMoveUp`、`canMoveDown` | 独立资源包卡，选中时显示启停 / 排序操作；状态由宿主管理 |
| `PackList` | **必填** `label`、`packs`；选择属性、`onActiveChange`、`onReorder(ids,movedPack)`、`scale`、`maxHeight` | 组合 PackCard 与滚动列表，发出完整新 ID 顺序，不读取或更改游戏资源包文件 |
| `SettingsPanel` | **必填** `sections`: SettingsSection[]；`title`、`value` / `defaultValue`、`onValueChange`、`onBack`、`headerActions`、`footer` | 复用 NavigationList 与原版边框，隐藏页面保持挂载以保留草稿；section value 必须非空且唯一 |
| `LoadingScreen` | **必填** `title`；`variant`: world-modal（默认）/ compact、`scale`、`branding`、`loadingFrame`；`message`、`value`、`max`、`showValue`、`onCancel`、`cancelling`、`background`、`backgroundVariant`、`spinnerFrame`、`paused` | 默认原版世界加载 modal / 标题原图；未定进度用 source loading_bar，有限值用原始经验条图层；compact 复用 Spinner / Progress，宿主负责背景场景和加载动作 |
| `AchievementToast` | Toast 的受控 open / onOpenChange / title 等属性；`achievementIcon`、`announcementLabel` | 复用 Toast 的原图、稳定 live region 和可暂停时序；成就内容、图像与触发事件由调用方提供 |
| `PlayerList` | **必填** `players`: GamePlayer[]；`title`、`selectedId` / `defaultSelectedId`、`onSelect`、`onInvite` | 玩家行和邀请入口，方向键焦点与选中独立；头像 / 平台图 / 在线状态由调用方提供 |
| `TouchControls` | `actions`、`onAction(action,pressed)`、`onMove({x,y})`、`disabled`、`opacity`、`labels` | 原图触屏按钮与 Web 摇杆重建；移动向量限制在单位圆，取消 / 禁用 / 卸载会释放输入，不绑定游戏引擎 |
| `PauseMenu` | `actions`、`footerActions`、`skinActions`、`disabledActions`、`onAction`、`logo` / `logoSrc`、`skinRenderer`、`players`、`onPlayerSelect`、`onInvite`、`width`、`height`、`autoFocus` | Classic 暂停菜单组合，Escape 发出 resume 意图；路由、保存和退出由宿主执行，logo / 皮肤由调用方提供 |
| `DeathScreen` | `variant`: native（默认）/ classic、`guiScale`；`title`、`deathMessage`、`state`: ready / loading、`loadingIndicator`、`respawnEnabled` / `respawnVisible`、`quitEnabled` / `quitVisible`、`onRespawn`、`onQuit` | 默认匹配当前 HBUI Death 源 profile，classic 保留 JSON UI 组合；字体需调用方提供或使用公开 fallback，score 仅为宿主扩展 |
| `TradeOffer` | **必填** `offer`: TradeOfferData；`selected`、`onSelect(id,action)`；button 属性 | 一 / 双成本、改价划线、锁定和售罄原图状态；locked 阻止操作，available 与结果 / 交易可用性由宿主分别控制 |
| `TradingScreen` | `tiers`、`selectedOfferId`、`onOfferSelect`、`inputs`、`showSecondInput`、`slotValidity`、`result`、`resultAvailable`、`canTrade`、`levelProgress`、`possibleProgress`、`detailButtons`、`onDetails`、`runeAtlasUrl`、`onTrade` | 原版 trade2 双面板，复用 TradeOffer、库存与进度；交易、报价、升级与消耗规则由调用方提供 |
| `MountInventory` | `equipment`、`chested`、`storageColumns`、`storage`、`storageSelectedIndex`、`onStorageSelectionChange`、`onStorageAction`、`onEquipmentAction`、`entityPreview` | 原版坐骑面板与鞍 / 盔甲 / 地毯 / 鹦鹉螺甲占位，storageColumns 限制 1…5；实体 renderer 由调用方提供 |
| `BlockPreview` | `block`: stone / stone-bricks / stone-slab / stone-stairs / enchanting-table；`size`、`resolution`、`model`、`textures`、`camera`、`lighting`、`onReady`、`onRenderError` | 原始方块 PNG 与可配置网格的 Canvas renderer，默认 32×32 CSS px；模型 / 光照属于重建，非原生 item renderer 认证 |
| `BannerPreview` | `view`: cloth / item；`width`、`height`、`baseColor`、`patterns`、`baseTexture`、`model`、`camera`、`lighting`、`onReady`、`onRenderError` | 原始 PNG / TGA 图案与真实 alpha 合成，cloth 默认 40×80、item 默认 32×32；颜色接受命名染料、六位 hex 或 0…255 RGB 元组 |
| `ArmorSlot` | ItemSlot 属性；**必填** `kind`: helmet / chestplate / leggings / boots / offhand | 复用真实槽位和原版装备占位图；有物品时隐藏空槽覆盖层 |
| `RecipeSearch` | SearchField 属性；`showFilter`、`craftableOnly` / `defaultCraftableOnly`、`onCraftableOnlyChange`、`filterLabel` | 原图搜索框与仅可合成开关，输入和筛选状态独立；默认最多 30 字符，配方可用性由宿主计算 |
| `RecipeCategoryTabs` | `categories`: RecipeCategory[]；`value` / `defaultValue`、`onValueChange`、`label`、`disabled`、`panelId` | 原版顶部分页图，支持 RTL、方向键和 Home / End；键盘激活可用分类 |
| `PlayerInventoryScreen` | `armor`、`offhand`、`crafting`、`result`、`playerPreview`、`needsCraftingTable`、`craftingTablePreview`、`onArmorAction`、`onCraftingAction`、`onTakeResult`；WorkstationFrame 属性 | 可复用生存背包右面板；needsCraftingTable 默认 false，显式启用时由宿主提供工作台模型预览；完整组合使用 SurvivalInventoryScreen |
| `SurvivalInventoryScreen` | **必填** `recipeBook: RecipeBookProps`；可选 `inventory: Omit<PlayerInventoryScreenProps, 'title' \| 'onClose' \| 'closeLabel'>`、`title` 与共享 Frame 的布局 / 帮助 / 关闭属性 | RecipeBook＋生存背包右面板＋两模式工具条；默认标题 Inventory、布局 recipe-book，ref 为 section；配方状态和 renderer 由宿主提供 |
| `CreativeInventory` | **必填** `items`；`chrome`: full / none、`layout` / `defaultLayout`、`onLayoutChange`、`onHelp`；`categories`、`categoryId` / `defaultCategoryId`、`onCategoryChange`、`query` / `defaultQuery`、`onQueryChange`、`hotbar`、`onItemAction`、`onHotbarAction`、`onClose` | 默认完整原版工具条和创造面板，chrome=none 仅提供可复用 pane；宿主提供当前分类集合，搜索仅筛名称且回调保留原始 items 索引，IME 输入完成后再筛选 |
| `InventoryToolbar` | `value` / `defaultValue`: creative / recipe-book / survival；`layouts`、`showClose`、`onValueChange`、`onHelp`、`onClose`、`disabled`、`modeLabels` | 可复用模式工具条、帮助和关闭入口；layouts 限制可见模式，showClose 控制关闭入口；数据与路由由宿主切换 |

### 受控与非受控

`TextField`、`TextArea`、`Checkbox`、`Switch` 和 `Select` 直接使用原生 React 属性与事件。

```tsx
<Checkbox label="Show coordinates" defaultChecked name="coordinates" />
<Switch label="Multiplayer" checked={enabled}
  onChange={event => setEnabled(event.target.checked)} />
<Slider label="Render distance" min={4} max={32} defaultValue={12}
  formatValue={value => `${value} chunks`} onValueChange={setDistance} />
```

`Tabs`、`RadioGroup`、`Slider`、`Combobox` 提供 `value` / `defaultValue` 和 `onValueChange`。同一组件生命周期不要在受控与非受控模式之间切换。Tabs 的 value 必须对应未禁用项，items 的 value 必须唯一。不传 defaultValue 时，Tabs 使用首个可用项；RadioGroup 初始不选中。

错误状态保留原版 default / hover / keyboard-focus 表面，移除额外粉色 invalid 边框。TextField / TextArea / Select / Combobox 的错误消息使用原13×20 ErrorGlyph 和语义关联，文字继续使用可覆盖的 Web 可读性 token；这不是原生所有输入框通用错误布局。Anvil的18×12逻辑box内原15² cross实际contain为12²；Smithing旧18×12配置须另验，不套用Anvil结论。Grindstone仍15²；结果保留焦点并守卫无效操作。来源及范围见 [GUI_ICONS_QA.md](docs/GUI_ICONS_QA.md)。

### ComboBox 与选中态

`Select` 与 `Combobox` 的可见 trigger / popup 现在共用内部 `ComboboxBase`，使用相同 Classic 皮肤、选中标记与活动态。`Select` 仍接收原生 select 的 `value` / `defaultValue` 和 `onChange`，ref 指向 `HTMLSelectElement`；底层原生控件负责表单提交、reset、required 和 multiple。多选时可见 popup 切换各项而不立即关闭，`onChange` 可读取 `event.currentTarget.selectedOptions`。`Combobox` 的 ref 仍指向可见按钮，提交回调仍为 `onValueChange`。直接赋值 `selectRef.current.value` 不会自动同步可见文案；程序更新请使用受控 `value` 属性，或在修改原生选中值后派发冒泡 `change` 事件（仅 `input` 不会更新可见文案），不应假设所有原生 imperative UI 行为都被可见层自动镜像。

`Combobox` 是不可编辑的选择型组合框，支持类型前缀定位，不提供文本搜索框。展开层使用原生 Popover top layer，能够越过面板裁剪，并在 Dialog 内保持交互；需要支持 Popover 的现代浏览器。

```tsx
<Combobox label="Difficulty" name="difficulty" defaultValue="normal"
  onValueChange={setDifficulty} options={[
    { value: 'peaceful', label: 'Peaceful' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
    { value: 'locked', label: 'Locked', disabled: true },
  ]} />
```

- 选中项为深灰底和填充方框；活动项为绿色，移动活动项时不更改已提交的选择。
- Enter / Space 提交，Escape 取消，Tab 关闭并继续移动焦点；方向键跳过禁用项，Home / End 到首尾；输入字母定位选项。
- 原生 select 负责 `name` / FormData / required 校验；可见按钮负责焦点和 ARIA，reset 会重置非受控选择。
- Classic 标签页常态选中是灰色凹陷，悬停 / 键盘焦点时才是绿色，保留固定的 2px 按压偏移。
- 在 [Pixel lab](http://127.0.0.1:4173/calibration.html) 查看隔离的默认、选中、悬停和禁用控件；原始基准与差异方法见 FIDELITY.md。

```tsx
<Tabs label="World settings" defaultValue="game" items={[
  { value: 'game', label: 'Game', content: <GameSettings /> },
  { value: 'video', label: 'Video', content: <VideoSettings /> },
]} />
```

### 弹窗

Dialog 完全受控，不自行更改 open。关闭请求通过 onOpenChange(false) 通知调用者。

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Create world</Button>
<Dialog open={open} onOpenChange={setOpen} title="Create new world"
  description="Choose a name for your adventure."
  footer={<Button variant="primary" type="submit" form="world-form">Create</Button>}>
  <form id="world-form" onSubmit={event => {
    event.preventDefault();
    setOpen(false);
  }}>
    <TextField label="World name" name="worldName" required />
  </form>
</Dialog>
```

初次焦点在关闭按钮；也可在子表单中指定原生 `autoFocus`。原生 showModal 让背景失去交互，组件额外处理 Tab 首尾循环和滚动锁定。需要浏览器原生 HTMLDialogElement 支持，目标为现代 Chromium、Firefox、Safari。标题超过可用宽度时显示省略号，完整文字仍用于可访问名称。`width` / `height` 指定 border-box 尺寸，数值按 CSS px，也支持 CSS 长度；`style` 中的同名尺寸优先。显式 `height`（包括 style.height / blockSize）解除默认 maxHeight，宿主应自行选择合适的屏幕尺寸。根节点和正文均默认 `overflow: clip`，不会产生自动滚动区；长内容需要显式嵌入 `ScrollArea`。

```tsx
<Dialog open={open} onOpenChange={setOpen} title="World settings"
  width={480} height={420}>
  <ScrollArea label="World settings content" style={{ height: '100%' }}>
    <WorldSettings />
  </ScrollArea>
</Dialog>
```

关闭入口与 footer 保留在滚动区之外；使用方应为长内容分配明确可用高度。Select / Dialog 本轮契约、正式分批验证及范围见 [CONTROLS_CONSISTENCY_QA.md](docs/CONTROLS_CONSISTENCY_QA.md)。

Panel 默认是 Classic 浅灰底和深灰文字，输入内容通过独立的 `--mc-input-text` 保持白色。Progress 使用通用灰色进度条模板；游戏生成世界的绿色进度 renderer 属于另一模板。逐项参考与还原范围见 FIDELITY.md。

## 背包与工作站

```tsx
import type { InventoryItem } from 'mcbeui';
import { ItemSlot, InventoryGrid, Grindstone, EnchantingTable } from 'mcbeui';

const sword: InventoryItem = {
  name: 'Diamond sword', image: '/my-assets/diamond-sword.png',
  durability: 0.42, lore: ['Sharpness IV'], enchanted: true,
};

<ItemSlot item={sword} selected onSecondaryAction={() => splitStack()} />
<InventoryGrid label="Inventory" items={items} size={27}
  onSlotAction={(index, action) => handleInventory(index, action)} />
<Grindstone inputs={[sword, null]} result={result}
  inventory={items} onTakeResult={() => takeResult()} />
<EnchantingTable item={sword} lapis={lapis} inventory={items}
  options={[{ id: 'unbreaking', label: 'Unbreaking I', level: 3 }]}
  onEnchant={id => requestEnchantment(id)} />
```

InventoryScreenFrame 的两个布局均保持 326×166 game 外框，供合成屏幕和 SurvivalInventoryScreen 复用；熔炉原生 compact 根会缩为 176 game，且有无 count/group 的独立配方书分支，不能用此固定 Frame 冒充。Furnace / BlastFurnace / Smoker 当前仍保留右面板范围。

ItemSlot 的物品图由调用方提供；26 张物品 / 类目示例 PNG 不随 npm 分发。BlockPreview / BannerPreview 另附官方方块 / 旗帜原始材质，记录见 [item-renderers-geometry.json](docs/item-renderers-geometry.json)。展示页已使用实际 PNG，来源与 SHA 见 [item-materials.json](docs/item-materials.json)：物品清单中的 26 张 PNG 均取自官方 `v1.26.60.5 full` 合并资源，并记录本机 59 个 vanilla / 版本覆盖目录中的候选。钻石剑采用与公开合并资源一致的 198-byte PNG；此前 22 像素差异来自基础包与合并资源，不能据此认定运行时最终材质。资源存在与 manifest 不证明当前激活顺序。草方块使用官方 GUI 类目图标，保留 17×17 原图的整数缩放，不冒充 native block renderer。`durability` 为剩余比例 0…1；组件显示角标、耐久和提示，并发出操作事件，不自行计算配方、附魔或搬移物品。右键 / Shift+F10 为 secondary，Enter / Space / 点击为 primary。原生 `onContextMenu` 可阻止默认 secondary 处理。

槽位依据 common.container_item 重做，cell_image 的 PNG 为 10×10、逻辑 base_size 为 5×5，因此源切片为 2px、GUI 2 的显示边宽仍为 2px。普通 / 悬停 / 选中 / 聚焦已有独立原图对照。ItemTooltip 依据原生配对截图修正，中文字体与部分覆盖边缘仍非零差；数量基线和 disabled filter 也需继续校准。`enchanted` 仅保留数据标记，缺图时不会自绘替代物。

耐久条的源声明为 `12×1` game、中心偏移 `[0,5]`。本机 GUI5 五把木剑的原图支持 `13×2` 黑包络，相对最大前景右侧、下方各多 `1` game；Web 保留原前景和逻辑位置，补齐可见包络。只读 Script API 已确认五把木剑实际 damage=1/15/30/45/58、maxDurability=59。以 `(59-damage)/59` 为候选比例，连续 `H=120r` 不预取整 hue，在独立 Chromium Canvas 匹配全部四组可见核心色；最近整数 `12r` 匹配五组宽度。API max 不证明 renderer 分母，五个宽度也不能区分 M59/M60；内部 shadow、通用颜色算法和取整 tie 仍未恢复，不称完整原生像素零差。详见 [NATIVE_DURABILITY_QA.md](docs/NATIVE_DURABILITY_QA.md)。

`ItemGlint` 可单独使用，也可作为 ItemSlot 的 children。它带有真实 glint PNG，参数由调用方控制；下面是 Web 示例值，未认证为游戏运行时默认值：

```tsx
<ItemGlint imageSrc="/items/diamond_sword.png"
  uniforms={{ uvOffset: [.125, -.2], uvScale: [1.5, .75],
    uvRotation: [.35, -.6], glintColor: [.3, .1, .5] }}
  glintSampler="bilinear-repeat"
  blend={{ source: 'one', destination: 'one' }} />
```

`shadeItemGlint` 输出未量化的原始 pass，`renderItemGlint` 按显式混合模式生成像素数据。原生时间、采样和混合绑定尚未提取，不会自动给 `enchanted` 物品添加动画；公式与 Canvas 透明存储边界见 [ITEM_GLINT_QA.md](docs/ITEM_GLINT_QA.md)。

砂轮布局来自 grindstone_screen.json，附魔台来自 enchanting_screen.json；逐级锚点与百分比推导见 [workstation-geometry.json](docs/workstation-geometry.json)。附魔选项保留源浮点边界，不人为取整。砂轮空结果槽保留 hover / focus，通过 `aria-disabled` 与回调 guard 阻止无效领取。真实关闭按钮支持容器内部的原始键盘导航。

附魔选项的三档经验粉使用原版 13×11 PNG，CSS 按整数2倍显示为 26×22；各档绿色轮廓及已烘焙数字原本不同。六个 selectable / unselectable 状态共 3,432 个 CSS 像素与原图2倍最近邻对照零差，没有重绘或统一轮廓；该结果不覆盖原生整屏和分数坐标光栅化。证据范围见 [CONTROLS_CONSISTENCY_QA.md](docs/CONTROLS_CONSISTENCY_QA.md)。

`EnchantingTable` 在 `options={[]}` 或不足三条记录时仍保留三个原版 dark 背景，缺记录的行不生成 rune、dust、cost、按钮或回调。已有记录继续使用 `EnchantmentOption`。这对应源 `enchant_button_panel` 的常驻背景和独立按钮可见性绑定，并由原生空槽截图确认，不代表整页或默认书本动画已达原生零差。演示页用干净钻石剑，Clear / Restore 显式切换输入、记录及 `EnchantingBook open={0/1}`；库本身不猜附魔资格，也不据 `options` 自动开合宿主书本。

上一image-only阶段中，`EnchantingTable imageRender` 可显式给出 `frame:{width,height,guiScale}`、GLOBAL game `origin`（默认ceil stage居中）和`displayScale`（默认1，正数≤32）。单层接管panel / close / indent / 38slots / lapis / rows / dust图像，ready前或失败时保留CSS fallback；DOM文字、物品、book和操作语义保留。默认仍CSS；完整GUI辅助测量已见改善但仍非零（public18为26595 / gallery20为28452差异像素），实际组件正式13项与生产34项辅助检查已通过；四个底层image-pass零差不等于整台零差。完整配置与坐标 / 主题边界见 [GUI_IMAGE_QA.md](docs/GUI_IMAGE_QA.md)。

工作站文字可显式传入 `renderText: WorkstationTextRenderer`。WorkstationFrame 的标题、PlayerInventory 的可见标签及 EnchantmentOption 的数字费用提供 `WorkstationTextContext`，EnchantingTable 转发同一个回调到这些位置。`kind` 为 title / inventory-label（align=start），或 enchantment-cost（align=end，附 disabled / id / tier）。回调只返回非交互的视觉节点；原始标题、库存标签、费用与 ARIA 名称仍由库保留。未传回调时默认 DOM 文字保持原样，不自动替换字体，也不影响独立的 ItemTooltip.renderText。完整示例见 [WORKSTATION_TEXT_QA.md](docs/WORKSTATION_TEXT_QA.md)。

`CraftingScreen.imageRender` 可绘制完整326×166源布局与顶部外扩工具条。应用明确提供 frame、字体、metrics及输入clip策略；ready后接管覆盖外观，未覆盖文字和自定义节点保留DOM。交互预览见 `#crafting-layer`，可用 `python scripts/use-local-crafting-fonts.py "C:/XboxGames/Minecraft for Windows/Content"` 准备17个中文标签的本地字页，加 `--check-only` 只验不写。字体页不随包分发，详细用法及当前验证边界见 [CRAFTING_IMAGE_QA.md](docs/CRAFTING_IMAGE_QA.md)。

预览的集合选项新增 **36 original-material examples**，展示36项原材质示例。独立的[材质表](demo/crafting-observed-materials.ts)和[普通模型构造](demo/crafting-observed-items.tsx)复用库的公开 API；石切机的demo helper `createObservedStonecutterItem(frame=0)` 为source模型和真实预览回退提供同一几何，可显式选择静态frame0 / 1 / 2，不是npm导出或恢复的引擎动画。新版公开集合的source切换与真实回退已验证；集合只供查看与交互，不提供游戏配方规则，也不表示全部模型已达到原生像素一致。

`book` 提供自定义3D renderer的接入点，省略时不绘制假书图。`EnchantingBook` 当前mesh、packed UV、normal/winding和着色路径来自本机PIX捕获的实际GUI书本draw（该capture的Global65 / PSO795），已替换旧Java参考网格和Entity / MeshFallback候选；实际材质字符串名仍未知，不能把捕获程序称为旧候选文件的相同字节。

显式 `rendererState` 可接入调用方的列主序16数矩阵、7或8组bone矩阵及可选 `tileLightColor` / `overlayColor`。该捕获状态下，独立WebGL与实际React组件在已测试NVIDIA正常sandbox后端，以原API-before为背景、比较完整2570×1402 target，均与API-after零RGBA差异。这只认证一个打开姿态的一次draw，不是默认动画、完整GUI或后续合成链的零差。默认 `open/pageFlip/yaw/pitch/roll` 仍受控重建，native CPU状态生成尚未恢复；旧PNG误差数字明确保留为迁移前历史，不能套用为新默认值。`lighting="unlit"` 仍可检查未着色图集，详见 [enchanting-renderer.json](docs/enchanting-renderer.json) 与 [附魔 QA](docs/ENCHANTING_QA.md)。`runes` 可传 `EnchantingRunes`，默认色 `#685d49` 已核对原生字节；省略时不生成假英文符文，但按钮仍有完整可访问名称。原图集可仅在本地预览接入：

```powershell
python scripts/use-local-runes.py 'C:/XboxGames/Minecraft for Windows/Content'
npm run dev
```

SGA 的 AIZ 样本已通过原图逐像素对照；这不证明 native renderer 的字号和基线。详见 [enchanting-renderer.json](docs/enchanting-renderer.json) 与 [WORKSTATION_QA.md](docs/WORKSTATION_QA.md)。库存布局保持固定游戏坐标，320px 窄屏在局部滚动。

## 完整组件范围

新增存储管理八组件与截图闪光层，当前173组件 /190运行时值。Storage首99项94通过、1设备跳过、4比较方法失败保留，修正参照后8项材质复验通过：19完整平面、160,301像素RGBA零差；28项行为通过。Screenshot17项、公开14项和实际React18 /19默认Vite开发 /生产四场景分别通过。原生整页、默认锚点、材质解析与引擎provider仍未认证，见 [STORAGE_QA.md](docs/STORAGE_QA.md) 与 [SCREENSHOT_FLASH_QA.md](docs/SCREENSHOT_FLASH_QA.md)。

开始菜单新增六个公开部分：正式97项中96通过、1设备条件跳过，12个完整Web源平面共193,355像素RGBA零差；React18 /19实际181值包和默认Vite开发 /生产四场景通过。37个完整PNG与可选公开字体、TGA绘制分别验证，原生整页 /角色 /panorama仍待验，见 [START_MENU_QA.md](docs/START_MENU_QA.md)。

当前 **188 个已实现组件**，表情族含完整 `EmoteWheelScreen`、四槽 `EmoteWheel` 与可复用 `EmoteSlotPreview`；按 Bedrock 原生控件与 GUI 边界拆分，[组件清单](docs/COMPONENTS.md) 与 [component-catalog.json](docs/component-catalog.json) 记录具体范围。另公开6份数据、11个渲染 /几何 /纹理函数，共205个源运行时值。新增黑板族包含 `ChalkboardEditor`、`ChalkboardTextField` 与 `ChalkboardLock`，几何与状态由宿主显式提供，见 [CHALKBOARD_QA.md](docs/CHALKBOARD_QA.md)。新增OreUI五组件的使用与资源边界见 [ORE_PLAYER_PERMISSIONS_QA.md](docs/ORE_PLAYER_PERMISSIONS_QA.md)，该历史阶段更强源修订的React18.3.1 /19.3.1实际172值包通过，完整107项同批104通过 /3设备条件跳过，新公开9项另通过；背景透明、bevel和modal选中 /焦点按源修正，不等于运行时guiScale或原生整页认证。新增Classic权限四组件已落盘，角色与权限位独立、后端操作由宿主处理，正式63通过 /2桌面触控条件跳过、公开预览12项及React18 /19实际包验证已通过；使用及OreUI边界见 [PLAYER_PERMISSIONS_QA.md](docs/PLAYER_PERMISSIONS_QA.md)。历史DocumentViewer146组件 /163值与58通过 /1设备条件跳过保持原身份。新增双栏文档 `DocumentViewer` / `DocumentHeading` / `DocumentParagraph`，使用与范围见 [DOCUMENT_VIEWER_QA.md](docs/DOCUMENT_VIEWER_QA.md)。表情屏幕复用原轮盘，加入透明框架、说明条与 Change Emotes 行；视觉名称和无障碍槽位标签分离，空槽中心默认留白，范围见 [EMOTE_WHEEL_QA.md](docs/EMOTE_WHEEL_QA.md)。此前142组件 /159值轮盘、157值 NPC 外观顺序与15项实体合同、156值包 /实体14项 /旧渲染77项、NPC布局44项 /154值包 /64项公开辅助分别保留原身份，见 [GUI_ENTITY_QA.md](docs/GUI_ENTITY_QA.md)。implemented不等于所有GUI已pixel-perfect验收，历史用例不作为本轮累计。

[完整GUI覆盖清单](docs/BEDROCK_GUI_COVERAGE.md) 列出固定官方源的全部206个UI文件、八种范围状态与2个命名族缺口。183组件不是183个完整GUI；表情屏幕已补源布局组合，原生整页像素仍未验收，NPC人物自动取景、引擎及原生整页也仍未完成。

- 基础控件：文本、图片 / 九宫格、按钮、输入、选择、设置行、标签页、弹窗、提示、滚动区域。
- 容器零件：槽位、物品图 / 数量 / 耐久、背包网格、配方格 / 搜索 / 分类 / 配方书条目与筛选、燃料、处理箭头、附魔选项、交易条目。
- GUI：已有附魔台、砂轮、完整 Classic 合成 / 生存背包屏幕、工作台与熔炉族主面板、铁砧、酿造台、现代锻造台、制图台、切石机、织布机、信标、合成器、箱子族、漏斗、发射器、投掷器、交易、玩家 / 创造 / 坐骑背包及共享配方搜索 / 分类部件。
- 书本：BookReader / BookEditor支持受控plain pages和零起点spread；BookPage / BookPageTurnButton可单独复用。`#books`提供预览，book.css可独立导入；签名只提供宿主快照，不重复触发关闭或写游戏世界，详见 [BOOK_QA.md](docs/BOOK_QA.md)。
- 告示牌：SignTextSurface / SignEditor支持普通与悬挂牌面、真实textarea及宿主关闭请求；两oak原图身份已获原生draw支持，其余木种关联和含Han整段Unicode字体选择仍有候选边界，产品原生整页验收待完成，见 [SIGN_QA.md](docs/SIGN_QA.md)。
- 拼图编辑：JigsawEditor提供六个字符串draft与接点开关，JigsawPriorityFields可单独复用；宿主验证signed int32并处理Done /Help /Back，不执行世界生成。预览入口 `#jigsaw`，使用与验收范围见 [JIGSAW_QA.md](docs/JIGSAW_QA.md)。
- 命令方块：CommandBlockEditor复用CommandInput与CommandOutputPanel；宿主提供模式、历史快照与可用条件，Paste只发请求，命令不执行。预览入口 `#command-block`，使用与验证范围见 [COMMAND_BLOCK_QA.md](docs/COMMAND_BLOCK_QA.md)。
- 结构编辑：StructureEditor复用XYZVectorInput，preview与save /load /export均由宿主实现；预览入口 `#structure-editor`，字段、能力条件及实际验收范围见 [STRUCTURE_EDITOR_QA.md](docs/STRUCTURE_EDITOR_QA.md)。
- 服务端表单：`#server-forms`预览ServerActionForm /ServerCustomForm，提供源row /typed schema及宿主请求；独立合同、tooltip与资源范围见 [SERVER_FORMS_QA.md](docs/SERVER_FORMS_QA.md)，不实现后端协议或第三MessageForm。
- NPC：`#npc`预览对话、basic /advanced编辑、皮肤选择、可复用action编辑与60套原版人物模型。人物槽可组合`createNpcEntity`和`GuiLayer`，相机由宿主提供；命令、URL与保存仅发请求，原生采集不等于整页像素验收。见 [NPC_QA.md](docs/NPC_QA.md) 与 [GUI_ENTITY_QA.md](docs/GUI_ENTITY_QA.md)。
- 开始菜单：`#start-menu`展示六个Classic组合 /零件、普通与新玩家 /试用分支和独立账号操作；场景、角色与服务由应用提供，见 [START_MENU_QA.md](docs/START_MENU_QA.md)。
- 现代玩家权限：`#ore-player-permissions`展示独立OreUI五组件；`guiScale` /窗口 /输入模式显式传入，原版13图和现代字体仅可选本机准备，npm不附带。用法、准备命令和有限验收范围见 [ORE_PLAYER_PERMISSIONS_QA.md](docs/ORE_PLAYER_PERMISSIONS_QA.md)。
- 玩家权限：`#player-permissions`为Classic JSON profile，四个真实组合 /零件支持动态玩家与权限草稿、独立角色 /动作和双滚动视口；不是当前OreUI页面，见 [PLAYER_PERMISSIONS_QA.md](docs/PLAYER_PERMISSIONS_QA.md)。
- 双栏文档：`#documents`提供 HowToPlay /Encyclopedia 两种实际内容示例；独立导航 /正文滚动、受控主题与可复用标题 /段落，翻译、输入提示和条件内容由宿主提供。见 [DOCUMENT_VIEWER_QA.md](docs/DOCUMENT_VIEWER_QA.md)，不代表完整原生手册或整页像素认证。
- 表情轮盘：`#emote-wheel` 可切换完整屏幕 /轮盘、中文 /英文、混合 /全空槽、显示倍率及宿主接受 /拒绝。`EmoteWheelScreen` 含源布局说明条、Change Emotes 与关闭请求，`centerLabel` 独立接入动态视觉名称；控制器文字 /图形与实际播放由宿主提供。原生整页像素仍待验收，见 [EMOTE_WHEEL_QA.md](docs/EMOTE_WHEEL_QA.md)。
- HUD 与页面组合：已有快捷栏、生命 / 饥饿 / 护甲 / 氧气 / 经验 / Boss 条、准星、聊天、计分板、效果、标题和手持提示、玩家列表及触屏控制，以及暂停 / 死亡 / 设置 / 加载 / 世界 / 服务器 / 资源包 / 成就提示等组合。

目录中的 GUI 由这些基础零件组合。目录范围不等于所有版本、所有平台的完整游戏界面；原生 3D renderer、游戏规则、最终像素取整与真实游戏整帧差异单独验收。

### 原图、边框和可变容器

```tsx
<Image src="/textures/diamond.png" alt="Diamond"
  sourceSize={[16, 16]} scale={2} />
<NineSlice src="/textures/cell_image.png"
  sourceSize={[10, 10]} slice={2} destinationBorder={1}
  size={[18, 18]} scale={2} />
<Chest rows={6} items={storage} inventory={inventory}
  selectedIndex={selected} onSelectionChange={setSelected}
  onSlotAction={(index, action) => handleStorage(index, action)} />
<Anvil name={name} onNameChange={setName}
  inputs={[tool, material]} result={result}
  cost={{kind: 'levels', levels: 3, affordable: true}}
  onTakeResult={takeRepairedItem} />
```

新 `GuiImageLayer` / `layoutGuiImages` / `renderGuiImages` 处理已经求值的全局源矩形，不解析整套 JSON UI。width / height 是实际物理framebuffer尺寸，guiScale是显式游戏尺度；image rect 用GLOBAL game单位，scissor / outputRect用物理像素。nineSlice的baseSize / insets来自源逻辑metadata，不能用PNG物理尺寸替代。输出裁切不重置全frame投影或像素相位。

layoutGuiImages是纯几何路径，可用于SSR准备；renderGuiImages需要WebGL，默认返回PMA framebuffer字节，straight-alpha仅显式8位反预乘适配。Layer支持URL或显式RGBA8，默认装饰，状态为loading / ready / error；错误不静默改CPU，改变renderKey或输入重试。每layer一个独占context，仍有readPixels和资源预算，不宣称零拷贝或无限layer。底层16项已通过，可选工作站imageRender实施已冻结，但完整GUI辅助测量与实际包已完成，实际组件13项及生产34项辅助检查已完成，完整GUI仍非零，该image-only阶段的范围见 [GUI_IMAGE_QA.md](docs/GUI_IMAGE_QA.md)。

`GuiIcon` 另提供150张原版完整 GUI 图标：设置33、导航34、库存/合成26、社交23、设备13、反馈21。`guiIconNames` 是可枚举的只读名称目录，`GuiIconName` / `GuiIconProps` 为公开类型；旧 PixelIcon 的16个通用符号保留。示例：

```tsx
<GuiIcon name="anvil-icon" scale={2} label="Anvil" />
<GuiIcon name="arrow-right-white" />
```

默认按 PNG 物理尺寸显示，scale 只接受正整数；原始13×20等非方形图不强制塞入统一方框。它不推断源 UI 的使用尺寸、hover / pressed / disabled、裁切或 tint，命名状态图需宿主显式选择；style / ARIA 覆盖仍由宿主负责。150张 PNG 的完整原字节与安装版基础包一致，不证明当前激活覆盖顺序或原生整 GUI。素材来源、使用引用及许可范围见 [gui-icons.json](docs/gui-icons.json)，游戏原图不因库 MIT 许可而重新授权。组件样式 inline，无新增独立 CSS 入口。

上述纹理 URL 由使用方提供。`sourceSize` / `slice` 描述 PNG 物理像素，`size` / `destinationBorder` 描述缩放前的 GUI 逻辑像素：例如 cell_image 的物理图为 10×10，逻辑 base_size 为 5×5，不能把两个尺寸混用。Image / NineSlice 的 sourceSize、slice 与 scale 必须为合法整数，非有限、负数或越界切片抛 `RangeError`；内容尺寸和目标边距可用有限逻辑值，像素验收仍要求对齐物理像素。`style` 可覆盖默认布局，但不包含在默认参数的像素证明中。

`AnvilCost` 支持 `{kind:'levels', levels, affordable?, label?}` 或 `{kind:'too-expensive', label?}`；费用与可用性来自调用方，不推算游戏规则。重命名字段遵循原版模板的 `shadow:false`，费用文字保留 `shadow:true`。可选 `AnvilImageRenderProfile` / `AnvilTextRenderProfile` / `AnvilTextRenderStyle` 提供四独立文字角色与显式阴影 /clipping。耐久修复后四个观察GUI5状态各完整3,603,140像素native UI RGBA0，依赖host原字页、投影与dim .4；默认CSS仍非零。当前source React18 /19包通过；Anvil35＋旧回归103按既定整文件GPU profile共138独立用例通过，生产首轮73辅助检查通过（不计正式用例）。本机入口 `#anvil-layer`，字体准备与保留失败见 [ANVIL_IMAGE_QA.md](docs/ANVIL_IMAGE_QA.md)。

### 同目标原图与文字

`Grindstone imageRender` 现复用同一私有工作站source helper，公开 `GrindstoneImageRenderProfile` / `GrindstoneTextRenderProfile` / `GrindstoneTextRenderStyle` 三类型，组件120 / runtime134不变。frame必需物理width / height / guiScale，origin为GLOBAL game坐标，displayScale默认1；可选text只有明确metrics与labels，无需附魔cost / rune字段。itemImages / itemModels显式开启，39槽、ResultSlot guard、计数 / 耐久 / ref / 焦点与回调保留，完整目标ready后才替换视觉。共享23原PNG / 24keys，旧18图不变。首300像素close父布局残差修正后，一个GUI5观察场景的显式source profile与原native UI完整3,603,140像素RGBA0；依赖宿主原字页、投影与另供dim .4背景，默认CSS仍非零。修后22正式合同（11新＋11旧）、旧附魔46项原profile回归、React18 / 19包与40项生产辅助检查通过。首漏检与后端条件保留，见 [GRINDSTONE_IMAGE_QA.md](docs/GRINDSTONE_IMAGE_QA.md)；本机预览入口为 `#grindstone-layer`。

新增显式source model路径：公共barrel已导出纯 `layoutGuiModel` / `createGuiCuboidModel`，GuiLayer支持 `kind:'model'`，`InventoryItem.guiModel` 可由附魔台 `imageRender.itemModels` 显式消费。局部模型、原纹理、GLOBAL source origin及yaw / pitch / scale / offset / originQuantization均由调用方声明，库不提供native默认相机；旧BlockPreview CPU renderer保持原样。含纯atlas helper后为10函数 / 134runtime，公开17项、实际组件12项、React18 / 19包消费与生产65辅助检查分别按其范围通过。研究与边界见 [GUI_MODEL_QA.md](docs/GUI_MODEL_QA.md)；以下sprite检查点属于已冻结b09ff7a历史。

原PNG模型的完整固定GUI仍32像素不同，不能把atlas与standalone采样域当作相同。普通原PNG＋显式packing的source atlas通过纯 `assembleGuiTextureAtlas` 或GPU装配，不采用captured atlas bitmap、Canvas2D重采样或UV epsilon；四幅实际React在同一个已观察GUI5 postUI target全3,603,140像素RGBA0，旧standalone32逐字节复现。零差使用宿主显式配置、原glyph pages与1:1呈现；不认证默认回退字体、所有GUI / camera / 动画、最终world / Present或整体目标完成。

`createNpcEntity(options)`从原版骨骼 /cuboid /box UV及60张完整皮肤生成`GuiLayer`的entity命令，`npcSkinNames`按源controller顺序提供alias，`npcAppearanceOptions`按原行为文件的外观列表提供只读`{variant,skin}`。外观下标20对应variant25的教师皮肤，不能直接把选项下标当实体variant。宿主必须传model /view /projection、物理viewport与material；可覆盖完整bonePose，省略则使用有限source folded-idle，不自动取景。生成命令可交给`GuiLayer`，再作为`NpcPortrait.actor`或其他NPC人物槽传入。156值阶段独立NVIDIA /D3D11批在显式捕获camera /material fixture下，五个完整裁剪共255,200像素严格RGBA零差；正常UI相机、其他角色和整GUI仍未认证。完整用法与边界见 [GUI_ENTITY_QA.md](docs/GUI_ENTITY_QA.md)。

上一sprite检查点增加 `kind:'sprite'` 命令与 `GuiSpriteGeometry` 类型，仍使用GuiLayer / renderGuiLayer，无新增runtime导出。它使用UI/Sprite Transparent / MultiColorTint Off profile，`color` 为RGBA8顶点字节；alpha只选择纹理alpha的ceil分支，**不是透明度乘数**，整体透明度由归一化tint alpha / hudOpacity表达。旧image命令保持UI/Blit。`EnchantingTable imageRender.itemImages` 可选把普通 `item.image` 送入同目标，自定义React icon / 3D renderer、数量 / 耐久与语义保持DOM。显式displayScale的呈现支持时采用布局zoom，fallback保留transform。独立公开13项、实际组件11项、React18 / 19包消费与生产47辅助检查分别通过；固定完整747,600像素ROI仍有4,928像素不同，仅在三格3D hotbar。详见 [GUI_SPRITE_QA.md](docs/GUI_SPRITE_QA.md)；下面图文17项和10,155残差是上一冻结阶段。

`GuiLayer` / `renderGuiLayer` 按 `commands` 的 image / text 顺序绘制同一个RGBA8目标；中途不通过独立文字画布合成。`layoutGuiText` 是无I/O、无GPU的文字几何函数，接收实际物理frame、显式guiScale、GLOBAL game `origin`、`GuiTextFont`、`fontScale`、`sampling: "point" | "bilinear"` 和 `shader: "bitmap" | "bitmap-smooth"`。字体在BitmapFont之外声明原页 `pageSizes`（128或256）与 `cellHeight`，不能把裁剪字图冒充完整原页。

文字 `color` 是RGBA8顶点字节，与归一化 `tint` / `hudOpacity` 分开；`shadow` 有独立 `offset` / `tint`，不预先烘焙主色。局部half顶点与全frame MVP共同决定位置，`outputRect`只裁输出，`scissor`须显式给出。函数不解析整套JSON UI，不自动恢复省略号、长文本换行或游戏生成符文。`layoutSourceGuiLayer`、prepared GPU入口和精度helpers保持内部，不是公开导出。

React层的 `commands` 可包含原图URL或显式RGBA8；text的原页默认取 `font.pages`，也可用 `pages: ReadonlyMap` 显式覆盖。低层 `renderGuiLayer` 要求已解码的text `pages`；返回 `layout`、像素、`alphaMode` 与 `dispose`。默认framebuffer字节为PMA，显式straight-alpha是有损8位反预乘；活canvas独占context，保留readPixels及资源预算，不宣称零拷贝、共享池或无限实例。组件提供loading / ready / error、canvas ref及renderKey重试。

`GuiLayer` 的URL / dataURL叶纹理也可使用完整truecolor TGA（type2 / 10、24 / 32bit），无需新增API；格式按实际内容与MIME识别，不按扩展名猜测。无footer的TGA需明确TGA或generic MIME，失败仍报告error并沿用宿主fallback，详见 [URL纹理格式](docs/GUI_LAYER_QA.md#url纹理格式后续扩展)。

`GuiLayer` / `renderGuiLayer` 可显式设置 `rasterOrigin="top-left"`，统一离屏绘制在像素中心边界上的纵向归属、裁剪和正向呈现；省略时沿用原WebGL路径。它不更改源坐标、half packing或返回像素的方向。指定Credits捕获背景在D3D11后端整平面零差，软件后端仍有残差；公开源布局和整页验收边界见 [栅格原点验证](docs/GUI_LAYER_RASTER_ORIGIN_QA.md)。

图像与sprite命令可使用 `tiling: { size: [64, 64], originRounding: 'truncate' }` 复用完整原图平铺，也可明确选择 `floor`。每tile独立量化，尾条保留局部UV，crop不会改变网格相位；不能与nineSlice同时设置。`GuiImageLayer` / `renderGuiImages` 也复用该源几何。`#credits` 有原材质的32／64尺寸预览；明确源候选的原生整背景对照及边界见 [平铺验证](docs/GUI_TILED_IMAGES_QA.md)。

`CreditsScreen` 的背景可在 `surface.background.rendering` 明确设置 `{ kind: 'gui-layer', rasterOrigin: 'top-left', originRounding: 'truncate' }`，连续帧复用同一画布和已解码材质，不进行每帧CPU像素读回；关闭／隐藏后重开会创建新owner。省略时仍为CSS repeat。该模式要求point与整数物理frame，offset保持宿主求值的逻辑单位；[背景生命周期与验证](docs/CREDITS_GPU_BACKGROUND_QA.md)记录实际原生对照及尚未恢复的锚点／动画边界。

`EnchantingTable imageRender.text` 新增必需的 `metrics:{lineHeight,paintOffset}`，并明确提供 `labels` / `costs` 与可选 `runes` 字体样式（font、fontScale、sampling、shader及可选颜色 / tint / hudOpacity）。`options[].runeText` 是宿主已排版 / 截断的最终原始大小写字符串；旧任意 `runes: ReactNode` 仍可用于DOM。新图文配置不推测缺字或度量，异常时整层同有效scale退回CSS；最终组件10项覆盖回退 / 恢复、DOM物品、book、焦点、选择和交互语义。旧CSS、GuiImageLayer与BitmapText默认路径不变。

公开源输入 / GPU / React正式17项已通过：固定GUI4 / GUI5阶段的四FBO与四实际React完整目标共28,825,120像素RGBA零差；字符串、原字页与源布局作为正常输入，捕获属性仅用于比较。实际附魔台组件正式10项另验组合与生命周期，完整747,600像素原生区域仍有10,155个差异像素，不能称整GUI pixel perfect。实际React18 / 19包消费和生产38项辅助检查亦通过各自范围；可在本机展示页 `#gui-layer` 查看，完整API、示例和分层证据见 [GUI_LAYER_QA.md](docs/GUI_LAYER_QA.md)。

### 酿造、锻造、制图与 HUD

```tsx
<BrewingStand ingredient={netherWart} fuel={blazePowder}
  bottles={[firstBottle, secondBottle, null]}
  progress={0.5} bubbles={0.75} fuelRemaining={0.5}
  onSlotAction={(slot, action) => handleBrewing(slot, action)} />
<SmithingTable inputs={[template, sword, ingot]} result={upgradedSword}
  templateOverlay={false} baseOverlay={null} materialOverlay={null}
  onTakeResult={takeUpgradedItem} />
<CartographyTable name={mapName} onNameChange={setMapName}
  inputs={[map, paper]} result={expandedMap} mode="extend" />
<ScrollArea label="Recipes" style={{height: 240}}>
  {recipeList}
</ScrollArea>
<HealthBar value={19} />
<ExperienceBar progress={0.5} level={30} />
<Hotbar items={hotbarItems} selectedIndex={selected}
  onSelectionChange={setSelected} />
```

酿造进度 0 表示空前景，1 表示完整前景；不是游戏配方时间。锻造台默认仅显示 template 提示（`templateOverlay={true}`），`baseOverlay` / `materialOverlay` 默认 `null`，宿主根据实际模板和后端状态显式传入对应图集；启用的提示图集按源序列播放，`overlayFrame` 可冻结帧，已放入物品时可关闭对应 underlay。显式启用全部图集的示例用于检查材质，不代表原生空状态。`preview` 的原生装备 renderer 由使用方接入。锻造与制图组件仅包含原始主面板，外部 toolbar 尚未实现，因此不提供内部关闭按钮。

[酿造几何](docs/brewing-geometry.json)、[锻造 / 制图几何](docs/special-workstations-geometry.json)、[HUD 几何](docs/hud-geometry.json) 分别记录来源和未验证项。真实 PNG、JSON 坐标及 Web 截图通过不等于原生整屏 pixel-perfect：生命等状态排列算法、经验 / 书本原生 renderer、制图 description 的栈锚点及浏览器最终量化仍需同版本游戏截图。

### 设置、反馈与 HUD 组合

```tsx
<SettingRow label="Coordinates" description="Show your current position">
  {control => <input {...control} type="checkbox" />}
</SettingRow>
<SearchField label="Find a recipe" onSearch={setQuery} />
<KeybindingField label="Move forward" name="forward"
  defaultValue="KeyW" onValueChange={saveBinding} />
<Tooltip content="Save your progress"><Button>Save world</Button></Tooltip>
<Toast open={saved} onOpenChange={setSaved} title="World saved" />
<BossBar name="Wither" value={0.75} />
<ChatPanel messages={messages} input onSend={sendMessage} />
<Scoreboard title="Objectives" entries={scores} />
<Stonecutter recipes={recipes} selectedRecipeId={selectedRecipe}
  onRecipeSelect={setSelectedRecipe} input={stone} result={slab} />
```

`KeybindingField` 保存 `KeyW` / `Control+KeyS` 等物理键字符串，不推断游戏动作或按键冲突。`Tooltip` 的 children 应转发 `aria-describedby`；动态提示在挂载后创建 portal，SSR 保留触发元素。`Toast` 建议保持挂载，通过 `open` 控制内容，便于保留稳定的 live region。

`SettingRow` 的默认说明文字使用原 JSON 中性灰对应的 Web 配置 `#b2b2b2`，可通过 `--mc-setting-description-color` 覆盖；嵌入 Panel / inset 时保留该主题既有说明色。源 `[.7,.7,.7]` 在原生 renderer 中的 178 / 179 字节量化仍未认证。

切石 / 织布的配方图格、信标效果及合成器禁用槽分别拆为 `RecipeSelectionGrid`、`BeaconEffect`、`CrafterSlot`。`Beacon` 默认显示五个主效果和 regeneration，六项均锁定；升级额外槽默认隐藏，宿主需显式传 `effects.extra.visible=true` 并提供有效状态。预览、游戏规则和网络由宿主提供。已确认的原生空状态、局部层级与布局边界独立记录，不代表整个工作站 renderer 已逐像素吻合。

HUD 组件采用流布局以便组合，整屏的锚点、显示时机和生命周期由调用方管理。[工作站几何](docs/advanced-workstations-geometry.json)、[HUD 叠层几何](docs/hud-overlays-geometry.json)、[设置控件](docs/settings-controls-geometry.json)、[反馈组件](docs/feedback-geometry.json) 记录原图、源定义和 Web 组合边界。

`TradingScreen.detailButtons` 对应原版三个详情按钮的可见性绑定，`onDetails` 接收 `0` / `1` / `'result'`；第三个按钮使用 `runeAtlasUrl` 的真实 SGA 字形，缺少图集时保留可访问名称，不生成替代英文字母。`MountInventory` 的装备覆盖层按宿主提供的坐骑能力数组显示，以原版 0.5 alpha 常驻物品下方；不根据空槽猜测坐骑能力。存储底板保持原始 90×54 游戏像素，实际列数由 `storageColumns` 决定。

### 物品 renderer、库存与列表

```tsx
<ItemSlot item={{name: 'Stone stairs', icon:
  <BlockPreview block="stone-stairs" decorative />}} />
<ItemSlot item={{name: 'Banner', icon:
  <BannerPreview view="item" baseColor="white"
    patterns={[{id: 'border', color: 'red'}]} decorative />}} />
<CreativeInventory items={categoryItems} categoryId={category}
  onCategoryChange={setCategory}
  onItemAction={(sourceIndex, action) => handleItem(sourceIndex, action)} />
<WorldList label="Worlds" worlds={worlds} onPlay={requestPlay} />
<PackList label="Resource packs" packs={packs}
  onActiveChange={requestPackState} onReorder={requestPackOrder} />
```

`BlockPreview block="enchanting-table"` 使用三张原始16×16 top / side / bottom PNG，源支持的预设为16×12×16、侧面UV取 `[0,4,16,12]`，可见面默认白色倍率，不沿用普通石块侧面暗化。`textures` / `lighting` / `model` / `camera` 仍可覆盖；底图文件有原始来源，但捕获未显示底面，默认相机与模型轴约定仍是可配置重建。20项相关正式检查通过（新增8＋旧12），独立四轴与覆盖场景共38,400个Web期望像素零差，不等于原生物品相机或整GUI认证。来源与边界见 [INVENTORY_SCREENS_QA.md](docs/INVENTORY_SCREENS_QA.md)。

```tsx
<BlockPreview block="enchanting-table" size={32} resolution={80}
  label="Enchanting table" />
```

`BlockPreview` / `BannerPreview` 在 SSR 输出带语义的 canvas，挂载后加载随包分发的原始 PNG / TGA 并绘制；`onReady` / `onRenderError` 报告结果。网格、相机、染色与光照是可配置重建，使用真实材质不等于复刻了原生 renderer。[renderer 资源与边界](docs/item-renderers-geometry.json) 记录 48 份原始资源及其候选来源。

另导出三份可复用数据：`bannerPatternIds` 为这版资源中的 42 个图案 ID，`bannerDyeColors` 为 16 色 Web 预设，`loomPatternIds` 为同版本原生截图观察的 32 个基础图案顺序。染料预设不宣称是原生染色算法，图案顺序不作为所有版本的 engine registry；可以传入自己的 RGB、纹理、网格、相机和光照。

世界、服务器、资源包和玩家卡仅接收内容并发出操作意图；网络连接、世界删除、权限变更、资源包持久化由宿主决定和执行。完整字段由 `.d.ts` 导出，源事实见 [库存](docs/inventory-screens-geometry.json)、[交易 / 坐骑](docs/trading-mounts-geometry.json)、[菜单 / 控制](docs/game-controls-geometry.json)、[列表](docs/game-lists-geometry.json) 与 [系统页面](docs/system-screens-geometry.json)。

## World settings actions

世界设置启动操作提供 `WorldLaunchActions`，支持 Bedrock／Education 与创建／编辑源分支；`WorldSettingsActionButton` 复用真实 light／dark／Realms 皮肤。预览 `#world-settings-actions`，见 [API 与验证](docs/WORLD_SETTINGS_ACTIONS.md)。新增三基础件的组合、显式布局与字段范围见 [SETTINGS_SOURCE.md](docs/SETTINGS_SOURCE.md)；具名页面与固定整页组合现见 [WORLD_SETTINGS_SCREEN.md](docs/WORLD_SETTINGS_SCREEN.md)，Classroom外部模块和原生整页仍有边界。

## Disconnect

断线与 Realms 提示现有独立 `DisconnectScreen`、`DisconnectMessage` 和 `DisconnectActions`。三种源布局保留独立按钮状态，Escape 与取消加入分开；[预览入口](http://127.0.0.1:4173/#disconnect) · [API 与来源](docs/DISCONNECT_SCREEN.md)。

## 字体

Classic 标题字体现支持从本机原始 `minecraft-ten.ttf` 接入：运行 `python scripts/use-local-classic-ten.py "PATH/TO/minecraft-ten.ttf"` 后重启预览，在 `/#typography` 查看，在资源包标题中使用。它与 HBUI 的 Minecraft Ten v2 字宽不同；原始字体不进 npm。来源、命令与有限原生像素对照见 [Classic Ten 字体](docs/CLASSIC_TEN_FONT_QA.md)。

原生单字的跨后端采样差异及严格复现命令见 [字体采样诊断](docs/FONT_SAMPLING_DIAGNOSIS.md)。当前软件渲染仍有残差，不属于全字体像素认证。

公开替代字体文件在仓库中，构建和运行不依赖字体CDN；样式与字体分开导出，不导入fonts.css就不请求这些字体。可选的原cell Classic字体须由用户从自己的游戏资源准备，不在npm内。

| 字体 | 版本 | 文件 | 用途 / 差异 |
| --- | --- | --- | --- |
| MCBE Pixel | 基于 Monocraft v4.2.1 | WOFF2，44.3 kB | 默认英文；保留字形与字宽，重命名并加入前景色 COLR 层，减少 Windows ClearType 彩边；基准字号 18px |
| MCBE CJK | 基于 Fusion Pixel 2026.10.25 | WOFF2，1.06 MB | 中文前景色 COLR 版本，保留全部轮廓与字宽，示例 24px；生成记录见 pixel-cjk-font.json |
| [Monocraft](https://github.com/IdreesInc/Monocraft) | v4.2.1 | WOFF2，31.5 kB | 英文像素字体。等宽，含重绘字形，**非原版 Mojangles** |
| [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font) | 2026.10.25 | 12px proportional zh_hans WOFF2，960 kB | 简体中文及 CJK 回退，建议 12 / 24 / 36px 整数倍率 |

这些字体采用 SIL OFL 1.1，字体许可及继承来源声明随包提供。Monocraft 仅转换格式，Fusion Pixel 保留上游文件。两个 MCBE 字体的 COLR 转换记录见 [pixel-font.json](docs/pixel-font.json) 和 [pixel-cjk-font.json](docs/pixel-cjk-font.json)。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

在源码仓库准备可选Classic字体；npm包不含此工具，需要Python的fontTools、Brotli、Pillow：

```sh
python scripts/prepare-classic-fonts.py
python scripts/prepare-classic-fonts.py --check-only
```

输出位于ignored `.cache/local-fonts/classic`：MCBE Classic /Unicode /ASCII三face，默认189 /189 /95glyph，覆盖95可打印ASCII及94个demo中文 /全角字符。将自己有权使用的WOFF2复制到应用并登记同名font-face，原字体不随npm分发。

准备工具默认使用版本化 `body-bounds-v1` Unicode正文度量；需复现旧字体可传 `--unicode-metrics legacy-host`。Book编辑页与Sign可显式选auto /latin /unicode；auto是含Han整值切换候选，不代表通用引擎算法或完整原生字体栅格。详见 [BOOK_QA.md](docs/BOOK_QA.md)、[SIGN_QA.md](docs/SIGN_QA.md) 与 [CLASSIC_FONTS_QA.md](docs/CLASSIC_FONTS_QA.md)。

Book /Sign两demo的字符范围另有可复现文本；使用自己的固定来源archive准备，再以相同参数内存复验：

```sh
python scripts/prepare-classic-fonts.py "PATH/TO/font.brarchive" --text-file scripts/book-sign-font-characters.txt
python scripts/prepare-classic-fonts.py "PATH/TO/font.brarchive" --text-file scripts/book-sign-font-characters.txt --check-only
```

表情屏幕的中文原说明及本页演示文案另有语料，合并准备以保留原 Book /Sign 字集：

```sh
python scripts/prepare-classic-fonts.py "PATH/TO/font.brarchive" --text-file scripts/book-sign-font-characters.txt --text-file scripts/emote-wheel-font-characters.txt
python scripts/prepare-classic-fonts.py "PATH/TO/font.brarchive" --text-file scripts/book-sign-font-characters.txt --text-file scripts/emote-wheel-font-characters.txt --check-only
```

这两个输入合并后，当前本机 Classic /Unicode /ASCII 覆盖为227 /227 /95；旧字形与度量保持，新增原说明与演示所需的17字。只改变本地私有字体，不向库包加入原版字体，见 [表情屏幕 QA](docs/EMOTE_WHEEL_QA.md)。

该corpus当前为25个Han，含页码 /签名标签新增“共第签页”；210私有字集已独立审计，实际所测页码 /footer的字形fallback消失，完整Book画面仍有残差。此前206结果保留原范围，不推广到任意Unicode，见 [BOOK_QA.md](docs/BOOK_QA.md)。

导入 `mcbeui/classic-fonts.css`，在html根添加 `mc-classic-fonts`，使Input与portal Dialog继承同一字体；局部scope不会自动覆盖document.body portal。该CSS只有scope与字号令牌，不带font-face或字体数据。

demo提供Classic /本机Mojangles /开放字体切换。原cell字体仍有浏览器与游戏的AA、基线、阴影及长输入差异；有限字集不代表全Unicode或pixel perfect。追加字符、行高与详细验证见 [CLASSIC_FONTS_QA.md](docs/CLASSIC_FONTS_QA.md)。

CSS、GuiText与BitmapText的阴影offset单位及已知宿主缩放换算见 [TEXT_SHADOWS.md](docs/TEXT_SHADOWS.md)。

原版字体：如已持有可用于该场景的 Mojangles 字体，可以自行接入；npm 库不包含游戏原版字体。重建控件皮肤的来源见视觉基准文档。

`BitmapText` 提供原字图路径，`font` 包含 `pages` URL 数组、`glyphs` 字符映射和 `lineHeight`。每个字格明确给出 `page/x/y/width/height/advance`，可加 `offsetX/offsetY`；所有数值采用字体源坐标，`scale` 作用于完整排版。支持 Unicode code point 与显式换行，空格可使用零尺寸字格；不推断缺字、自动换行、shaping 或阴影。透明 DOM 文本保留读屏和复制，canvas 仅负责画面。

```tsx
<BitmapText font={yourFont} sampling="point" shader="bitmap"
  color="#ffffff">钻石剑</BitmapText>

<ItemSlot item={{ name: '钻石剑', lore: ['+7 攻击伤害'], image: swordUrl,
  tooltipTextRenderer: (text, { kind }) => (
    <BitmapText font={yourFont} sampling="point" shader="bitmap"
      color={kind === 'name' ? '#ffffff' : '#447fff'}>{text}</BitmapText>
  ),
}} />
```

`renderer="cpu"` 默认保持已有 Canvas2D 路径，只支持 `profile="atlas-rect"` 且不接收 `background`。显式选择 `renderer="webgl"` 后，`atlas-rect` 支持任意合法矩形字格；`bedrock-unicode` 要求 256×256 原页、16×16 完整字格、x/y 按16对齐，使用 packed UV 与 corner 规则，不自动转换 trimmed 字格。`background` 是具体 CSS 色的 GPU target clear，省略时透明，不能用 CSS 背景替代其混合条件。

```tsx
<BitmapText font={fullCellFont} renderer="webgl" profile="bedrock-unicode"
  sampling="bilinear" shader="bitmap-smooth" color="#ffffff">钻石剑</BitmapText>
```

`renderBitmapGlyphs(options)` 是浏览器GPU函数，接收原页 /顺序runs /target背景；默认framebuffer返回预乘RGBA8，显式straight-alpha为可能舍入的8位反预乘。独立webgl每实例活context并GPU copy，公共函数完整readPixels合同保留。显式webgl-shared同Document复用Offscreen私有后端和有限program /buffer /page LRU /target，ImageBitmap转各实例bitmaprenderer，共享组件不readPixels。模块跨Document记账上限256MiB（非driver总VRAM），另限512leases /16MP呈现；同步多run仍非多实例batch或零拷贝。缺API /loss报告错误并保留原文，不静默换CPU；输入更新可取新session。当前资源治理的实现边界 /分项验证见 [BITMAP_RESOURCES_QA.md](docs/BITMAP_RESOURCES_QA.md)，历史独立 /共享验证见 [BITMAP_GPU_QA.md](docs/BITMAP_GPU_QA.md) / [BITMAP_SHARED_QA.md](docs/BITMAP_SHARED_QA.md)。

复用仅在session存续时成立；全owner同时更新仍可能微任务释放并重建，保持稳定owner的stress观察不代表任意全量更新newGL0。ledger不计临时JS顶点打包 /typed arrays、driver二进制、active fetch或host-held refs，不能据256MiB推断总JS heap或全部显存硬限。

共享0readPixels仅指GPU目标绘制 /显示链，colorRgba与字体loadTexture解码仍可使用Canvas2D /getImageData；公共renderBitmapGlyphs的完整readPixels也继续保留。

本轮最终kernel Node11、loader Node22 /首browser5、正式65与03实际React18 /19包已分别通过；固定8draw新共享native显示及48完整矩阵按独立参考通过、生产115辅助checks通过，旧nativebitmap诊断残差不因正式通过消失。provisional10与02成功包历史保留，不能移作最终source证据，见 [BITMAP_RESOURCES_QA.md](docs/BITMAP_RESOURCES_QA.md)。

`layout="visual"` 默认让外层占完整字图 / shadow 包络。显式 `layout="advance"` 则用最大逐行 pen advance 与行高作为 CSS 逻辑框，完整 canvas 按 bearing / origin 偏移保留外溢，不缩图或裁字。费用等 end 对齐容器建议同时使用 `style={{ display: 'block' }}`；inline-block / baseline 仍会受父级 line-height strut 影响，不能仅凭 advance 模式推断原生基线或费用 Y 坐标。

新实际GUI4留出帧直接观察到CJK为Bitmap / POINT，而此前GUI5 CJK为BitmapSmooth / LINEAR；SGA和费用在这两帧均为Bitmap / POINT。这不是所有scale的自动切换规则，因此sampling / shader仍由宿主显式提供，示例profile不冒充任意原生字号的默认。

工作站本机字体演示另执行 `python scripts/use-local-workstation-fonts.py "C:/XboxGames/Minecraft for Windows/Content"`，重启 Vite 后读取仅展示页可用的 `nativeWorkstationFonts={labels,costs}`。它只准备六个 CJK 字“附魔台物品栏”与 default8 的费用数字1/2：六张256² Unicode页加一张128² default8原图，留在 `.cache/local-fonts/workstation`。展示开关默认关闭，启用后以 shared GPU 绘制五处文字；不修改全局 font-face、旧十字符样本或 npm 默认。CJK末字 advance、行高 / 居中以及费用单字 advance 均含明确宿主配置；多位费用、多行与未测字符不由该样本认证。私有原图不随 Git / npm 发布，本机构建 site 可包含可选页面，发布前需自行处理素材。详见 [WORKSTATION_TEXT_QA.md](docs/WORKSTATION_TEXT_QA.md)。

本机样本可执行 `python scripts/use-local-unicode-sample.py "C:/XboxGames/Minecraft for Windows/Content"` 后重启 Vite。该仓库工具只准备已测的8张原页、10字符，保存在忽略目录；它不生成完整 Unicode 字体，也不改变全局字体。启用后 `site/` 构建可能包含这些本地字图，npm 包不含它们。

同一 `use-local-workstation-fonts.py` 现另生成ignored `gui-fonts.json`，由仅展示页虚拟模块提供 `nativeGuiWorkstationFonts={labels,costs,runes}`；缺失返回undefined，不是npm导出或全局font-face。它在旧七页原字节外增加一张原SGA页，共八张本机字体PNG，旧 `fonts.json` 与七张源页保持不变。新cost字典0..9仅有原alpha及advance6来源，实际原生费用只观察到1/2；SGA含95个可打印ASCII，period无墨但advance1，space零宽字格advance4，不恢复游戏符文生成 / 大小写转换 / 截断。新Composed GUI `#gui-layer` 示例可选GUI4/5、清空 / 恢复，仅此例在本机资源存在时默认启用图文层；原五处字体演示仍默认关闭。私有原页不进Git / npm，包含它们的本机site不能直接当作可公开字体包。

砂轮使用独立命令 `python scripts/use-local-grindstone-fonts.py "C:/XboxGames/Minecraft for Windows/Content"`，只写ignored `.cache/local-fonts/grindstone`；加 `--check-only` 可只验不写。八个完整256² Unicode原页只覆盖“修复与祛魔物品栏”，`gui-font.json`为直接GuiTextFont；`nativeGuiGrindstoneFont`仅属本地demo虚拟模块，不是npm导出，不注册全局字体，也不覆盖旧37个字体文件。宿主必须传明确fontScale / sampling / shader与label metrics；advance18 / lineHeight20仍是带来源的候选，不自动恢复native排版。缺原资源时保留CSS；本机构建site可能包含原页，不能将其当作可公开字体包。详见 [GRINDSTONE_IMAGE_QA.md](docs/GRINDSTONE_IMAGE_QA.md)。

早期 GUI4/5 字形、排版与 CPU / 软件后端反例保留在 [NATIVE_BITMAP_FONT_QA.md](docs/NATIVE_BITMAP_FONT_QA.md)。新 GPU 函数以真实捕获的8个 draw、原 API-before 背景和固定输入，在已测 NVIDIA 后端对完整 target / field＋halo 零 RGBA 差；这不认证默认 CPU、任意文字、透明 DOM 合成或完整 GUI。具体证据范围见 [BITMAP_GPU_QA.md](docs/BITMAP_GPU_QA.md)。

三工作站的六场景文字对照见 [WORKSTATION_TEXT_RENDERING.md](docs/WORKSTATION_TEXT_RENDERING.md)。提高局部文字画布分辨率没有统一改善原版差异，因此没有改为默认；完整 source 合成的有限零差结果与普通 DOM 字体的残差分别记录。

本地展示页也可以使用自己安装的 Bedrock 字体：

```powershell
./scripts/use-local-font.ps1 -FontPath 'C:/XboxGames/Minecraft for Windows/Content/data/fonts/Mojangles.ttf'
python -m pip install 'fonttools[woff]' brotli pillow
python scripts/prepare-pixel-font.py
python scripts/prepare-font-oracle.py
npm run dev
```

脚本只把该文件复制到忽略目录 `.cache/local-fonts`，不修改游戏。转换脚本保留原始轮廓与字宽，注册 Mojangles Pixel；Vite 启动时自动检测，存在时应用 20px 原版字号配置，不存在时使用 MCBE Pixel。npm tarball 始终只包含开源字体；启用原版字体后构建的 `site/` 预览会包含本地游戏字体，分享/发布预览前需按自己的使用场景处理该资源。

```css
@font-face {
  font-family: 'My Mojangles';
  src: url('/fonts/my-mojangles.woff2') format('woff2');
  font-display: swap;
}
:root {
  --mc-font: 'My Mojangles', 'Monocraft', 'Fusion Pixel', monospace;
  --mc-font-size: 20px; /* 50 font units map to one integer CSS pixel */
}
```

接入自有 Mojangles 时还可导入 `mcbeui/mojangles.css`，统一 20 / 40 / 60px 字号。Windows 上直接使用原始 TTF 可能出现彩边；本地转换使用 [COLR 前景色图层](https://learn.microsoft.com/en-us/typography/opentype/spec/colr)，不重绘字形。

当前 HBUI Death 的标题使用 Minecraft Ten v2，正文使用 Minecraft Seven v2；中文原生界面另用 Noto Sans SC。公开包仍使用开源 fallback，字形与原生有差异。持有适用原文件时，本地展示页可运行：

```powershell
python scripts/use-local-hbui-fonts.py 'C:/XboxGames/Minecraft for Windows/Content'
npm run dev
```

脚本将三份原始 OTF 与可选 HBUI loading GIF 复制到忽略的本地 cache，Vite 自动注册；不写入 Git、public 或 npm。启用后生成的 `site/` 可包含这些本地资源。身份与 SHA 见 [local-hbui-fonts.json](docs/local-hbui-fonts.json)。调用方也可自行托管有权使用的字体并覆盖 Death 令牌：

```css
@font-face { font-family: 'Minecraft Ten v2'; src: url('/my-fonts/ten.otf') format('opentype'); }
@font-face { font-family: 'Minecraft Seven v2'; src: url('/my-fonts/seven.otf') format('opentype'); }
@font-face { font-family: 'Noto Sans SC'; src: url('/my-fonts/noto-sc.otf') format('opentype'); }
:root {
  --mc-death-title-font: 'Minecraft Ten v2', 'Noto Sans SC', var(--mc-font);
  --mc-death-body-font: 'Minecraft Seven v2', 'Noto Sans SC', var(--mc-font);
}
```

```tsx
<Text as="p">Hello, Minecraft!</Text>
<Text shadow={false}>Without shadow</Text>
<TextField label="World name" defaultValue="My world" />
```

Text、输入内容、选择控件和按钮提供无模糊的像素阴影。可覆盖 `--mc-text-shadow`（默认 `2px 2px #3f3f3f`）和 `--mc-dark-text-shadow`。输入框还有参考纹理的凹陷亮暗边；错误、禁用、只读状态见展示页 Input states。按本项目需求默认启用文字阴影；Classic 按钮模板原始标签的 shadow 为 false，追求该模板设置时可覆盖为 none。

## 定制

CSS 仅定义 `--mc-*` 令牌和 `.mc-*` 组件样式，不对宿主页进行 CSS reset。令牌可在根节点或局部容器覆盖。

```css
.my-world {
  --mc-font-size: 16px;
  --mc-surface: #313233;
  --mc-focus: #ffffff;
}
```

Dialog 使用 portal 到 document.body，局部容器令牌不会自动传入：可使用 `className` 在 `.mc-dialog.my-dialog` 上覆盖。字体、文字、面板、焦点等令牌见 `src/styles.css` 开头。严格 Classic 控件表面通过 `--mc-skin-*` 图像令牌提供，修改普通颜色变量不会自动重染这些固定参考皮肤；自定义配色需覆盖相应 skin 令牌。当前不提供任意 GUI scale 自动缩放；保持整数像素尺寸和 DPR=1 有助于逐像素比较。按钮用 2px 文字偏移和倒角反向反馈，不使用平滑 scale 动画。

## 验证

- `npm run typecheck`：库、展示页、测试 TypeScript 检查。
- `npm test`：桌面 Chromium 与手机模拟的组件 / ComboBox 交互，以及 DPR=1 的精确皮肤像素对比；自动检查并缓存固定 commit 的参考文件。
- `npm run test:pixels`：独立运行原始 PNG 对比，要求 0 个差异像素；对照图与 JSON 在 `.cache/pixel-comparison`。
- `npm run verify:package`：把真实tarball分别安装至React18 /19消费者，检查ESM、SSR、strict TypeScript、样式、资源与许可。此前表情阶段检查143组件 /160值、完整表情屏幕文案 /ref /关闭回调、轮盘 readonly tuple /centerLabel、30份完整源文件，以及原有60皮肤、外观顺序和67份NPC原资源。表情轮盘范围见 [EMOTE_WHEEL_QA.md](docs/EMOTE_WHEEL_QA.md)；NPC157值在React18.3.1 /19.3.1的历史消费结果见 [GUI_ENTITY_QA.md](docs/GUI_ENTITY_QA.md)。此前142 /159轮盘、人物156值、NPC布局154值、ServerForms135 /149、Structure133 /147及更早包保持历史范围。
- `#books` 的27项生产辅助与旧6项导航回归已分别通过，覆盖真实编辑 / 签名请求 / 窄屏及既有锚点；它们不计入Book正式30项或原生像素认证，见 [BOOK_QA.md](docs/BOOK_QA.md)。
- `#signs` 的50项公开集成辅助已通过；新Sign29项、旧Dialog12项与修后完整导航6项分批验证，保留首次导航失败及修复记录，不作为原生整页像素或真实OS IME认证，见 [SIGN_QA.md](docs/SIGN_QA.md)。
- 自动无障碍检查不等于人工屏幕阅读器认证；尚未覆盖真实手机设备、Firefox 和 Safari。

## 许可

代码 MIT；开放字体 SIL OFL 1.1。像素图标、小岛和品牌方块是原创展示插画；物品、GUI 与书本素材的来源及权利说明见 THIRD_PARTY_NOTICES.md，它们不因代码的 MIT 许可而改变归属。Minecraft 名称属于其各自权利人。


UGC阶段新增UGCViewer /UGCItemCard与ImmersiveReader /ImmersiveReaderButton，当时177组件 /194运行时值。正式首74项67通过 /7方法失败保留，修正后14项12通过 /2只读断言失败，再修后2项通过；74个不同用例按各自最新方法均已验证，其中68项新增、6项相关导航，不合称单轮74全绿。42个完整源材质平面共1,986,950像素RGBA零差。React18.3.1 /19.3.1实际包的类型 /SSR /资源和默认Vite开发 /生产四组合通过，公开页12项通过。宿主White候选、静态reader图标、字体 /默认锚点 /provider /原生整页仍未认证。使用与明确宿主接口见 [UGC_VIEWER_QA.md](docs/UGC_VIEWER_QA.md) 和 [IMMERSIVE_READER_QA.md](docs/IMMERSIVE_READER_QA.md)。


14d修订新增Portfolio、PortfolioPhoto、PortfolioCaptionField、PortfolioPicker、PortfolioPickerItem与PortfolioPageTurnButton六个组件，该历史阶段为183组件 /200运行时值。该历史修订62个不同合同按实际受检阶段验证：46项行为来自同源07批，10项材质来自同源06批，6项导航在两个预览host修复后由08批重跑。06批50通过 /12收据断言失败及所有更早失败均保留；不累加重复执行、不称单轮62全绿。完全相同产品的06批10项材质检查通过，96个完整源／Web平面共1,982,470像素RGBA零差；07只重跑行为，保留该材质来源与具名Web采样合同。新的React18.3.1 /19.3.1实际183组件 /200运行时值包通过ESM、类型、SSR、原图、字体和许可证检查，身份区别于旧mounted4FAIL包；新包的默认Vite React18 /19开发／生产四实际安装组合通过；两项明确demo-host修复后的新site公开页16项通过，1440／390截图与320本地滚动边界分别记录；旧公开选择器失败和14通过 /1全页溢出失败保留。九张Portfolio三态图、截图frame／provider、精确大写White、默认锚点／字体和原生整页仍未认证。使用与宿主接口见 [PORTFOLIO_QA.md](docs/PORTFOLIO_QA.md)。


此前共享请求时序修订保持当时183组件／200运行时值及206行覆盖表不变。新的132项正式合同单轮全部通过（114行为＋18材质，8次新增可信输入回归＋124次原有执行；无跳过、flaky或源码漂移，未加算导航），138个完整源／Web材质平面共3,969,420像素RGBA零差。全新0907bc04包／f38bb1索引通过React18.3.1／19.3.1类型、SSR、资源及实际开发／生产四组合；公开30个不同检查来自Portfolio首阶段16项和UGC／Reader第二阶段14项，不能称单轮30全绿。UGC／Reader晚期document否决缺陷已在当前受检请求通道与实际包中修复；原生整页、字体、provider和真实服务仍未认证。

请求回调采用owner-window task；native onClick保持同步，延迟回调不保证SDK用户激活。早期Tab／网格方向键仍用microtask，任意直接DOM／原生属性修改不属于保证取消合同。旧包可信DOCUMENT缺陷、安装观察器四失败与公开29通过／1选择器失败均保留，见[共享请求时序说明](docs/PORTFOLIO_QA.md#共享请求时序修订当前实际验收)。


## Invite

Invite阶段的InviteScreen与可独立复用的InvitePersonRow、InviteCategory、InvitePagination、InviteFooter使当时源码为188组件／205运行时值。六组好友、三类身份、选择／party、分页及footer保留独立宿主输入；邀请、账号、头像provider和资料服务由宿主实现。Invite106个不同合同按02批与06批的实际身份验证，200个完整源／Web材质平面共11,473,278像素RGBA零差；4个自然分数栅格测量仍未资格确认。新包的React18.3.1／19.3.1类型、SSR和资源消费通过，实际React18／19开发和生产四组合均通过，公开页17项通过。不是原生字体或整页像素认证。使用与宿主边界见[INVITE_QA.md](docs/INVITE_QA.md)。


## Credits

> Credits阶段受检功能包确认191组件／209运行时值（191＋6数据＋12函数），含Credits三组件与layoutCredits。48不同Web合同跨阶段验证，React18／19包及真实默认Vite开发／生产四组合通过；source展示页9PASS，built9不同项为首轮8PASS＋观察器URL修正后的1PASS，不称单轮9全绿。完整原版字体／logo／整屏仍未认证。最终文档tar通过独立产物比对，Git身份及公网部署另记。

| API | 当前源码合同 | 边界 |
| --- | --- | --- |
| `CreditsScreen` | 必填`runKey`、`content`、`profile`、`bindings`、`scale`、`skipLabel`、`onCloseRequested`；普通模式还需`playback` | 高层播放器管理roll／cover／Skip子实例；`runKey`开始新run，单纯换content/profile不重置；ref为section |
| `CreditsRoll` | `content`、`profile`、`plan`、`bindings`、`offset`、`elapsedMs`、`scale`、`rasterPositioning`、`imageSampling` | 实际typed-data与字体排版／格式token／图片／滚动内容，不是renderer插槽；ref与viewportRef为div |
| `CreditsSkipButton` | `label`、`labelStyle`、`scale`；可选`labelSize`、`visible`、`disabled`及原生button属性 | source form-fitting light按钮，ref为真实button；label＋6、label盒高≤10是显式Web求值 |
| `layoutCredits(request)` | 实际内容／profile／plan／bindings，返回nodes、paragraphs、lines、images、stages与completionOffset | 纯函数，显式bitmap fallback／CSS metrics、预算、UTF-16来源范围；不带游戏文本或字体 |

```tsx
import { CreditsScreen } from 'mcbeui';
import type { CreditsContent, CreditsPresentationProfile } from 'mcbeui';
// content由宿主提供；profile是复用的字体／布局／材料／速度及Web路由配置。
// 此处没有捆绑原版staff、poem、quote或本机字体，也不猜测默认native profile。
declare const content: CreditsContent;
declare const profile: CreditsPresentationProfile;
<CreditsScreen runKey="credits-run-1" content={content} profile={profile}
  bindings={{ showEduIcon: false, showEndPoem: false, playerName: 'Player', scrollFaster: false }}
  scale={2} skipLabel="Skip"
  playback={{ playing: true, initialOffset: 0, hiddenPolicy: 'pause' }}
  onCloseRequested={detail => { /* 宿主处理button.menu_exit，组件不导航 */ }} />;
```

普通Screen不要求每帧维护factory。高级`mode="controlled-source"`才提供`position`与`snapshot`，保持panel、child、visible binding和exitInputActive独立；child五秒消失后仍可退出。`profile.completion='web-scroll-end-then-fade'`是明确Web串联：scroll_end后3秒黑cover再credits_end；用户menu_exit不伪造这两个自然结束事件。playing／hidden策略管理单调时钟，scrollFaster仅作用于距离；内容、字体、stage顺序、shader与native速度没有被公开默认值替代。完整API与当前验证边界见[Credits记录](docs/CREDITS_QA.md)。


## Active effects

`MobEffectScreen` 与 `MobEffectRow` 提供可见效果名、宿主格式化计时、原图图标与背景、独立 grid、源面板和关闭请求。字体度量、图标注册和浏览器滚动策略显式指定；完整原生与 Pocket 布局仍待核验。该阶段实际入口与受检功能包为193组件／211运行时值，React18／19和默认Vite开发／生产四组合通过。用法与边界见 [Mob Effect记录](docs/MOB_EFFECT_QA.md)。

`ChatScreen` 提供聊天、命令补全、坐标、设置和房主菜单，`ChatComposer` 与 `ChatTranscript` 可独立复用。展示页的 **Chat & commands** 可以直接打开和操作。Chat 接入时为196组件／214运行时值；React18／19实际包及默认Vite开发／生产四组合通过。11张完整材质参考平面为零像素差异，原生整页、字体路由和全部平台仍待校准。[使用方式](docs/CHAT.md) · [验证记录](docs/CHAT_QA.md)。


## Progress / 加载与云端界面

新增 `ProgressScreen`、`ProgressIndicators`、`ProgressPackGrids`、`ProgressResourceDialog`、`ProgressCloudPanel`、`ProgressCloudConflictDialog`，Progress接入阶段为 **202组件／220运行时值**。展示页的 **Progress & cloud** 可以选择15条源路由，也能独立预览指示器、资源包列表和弹窗。

组件使用完整原图和源结构。字体、内容测量、未恢复的图片提供者及 Web 动画／裁切／焦点规则为明确输入；原生整页像素一致仍未认证。React18／19实际安装包及默认Vite开发／生产四组合已验证；具体合同、历史失败和图像资格范围见 [Progress API](docs/PROGRESS.md) 与 [验收记录](docs/PROGRESS_QA.md)。

## File transmission

上一FileTransmission受检阶段公开205组件／223值。`FileTransmissionScreen`、`FileTransmissionPanel`、`FileTransferProgress`使用原版268×95传输结构与完整原图；字体、测量和独立绑定由精简profile提供。见[API](docs/FILE_TRANSMISSION.md)与[有限验收](docs/FILE_TRANSMISSION_QA.md)。原生整页、引擎布局和实际传输服务仍未认证。

BookEditor 的 layout.pencilRaster 可显式提供完整目标尺寸与Book逻辑原点，复用源图层绘制编辑铅笔，保留真实按钮和CSS回退。公开 #books 可切换预览；范围与原生残差见 [Book pencil QA](docs/BOOK_PENCIL_RASTER_QA.md)。

Book 的 layout.labelRaster 接受调用者分页位图字体，分别绘制页码与底部按钮，保留真实输入/动作和失败回退。原字页准备脚本及固定Book整帧验证范围见 [Book label raster QA](docs/BOOK_LABEL_RASTER_QA.md)。

Book 的 `layout.bodyRaster` 可在页面空闲时用原字页绘制正文，聚焦、选区、输入法组合和不支持的排版返回真实输入框。准备原字体及验证范围见 [Book body raster QA](docs/BOOK_BODY_RASTER_QA.md)。

合成台模型组合候选已做完整原生目标校准：相对旧D基线，差异由3,548降到2,097像素，同时保留2个新增误差。新增标准库离线复算工具，不修改默认渲染或宣称整页零差；见 [组合实验及范围](docs/CRAFTING_MODEL_COMPOSITION_QA.md)。


## 外部服务器表单

`ExternalServerForm` 是可嵌入的Classic表单，默认逻辑尺寸316×179、scale=2；`size`为逻辑尺寸，溢出裁切。它不包含全屏暗幕、modal焦点管理或服务器服务。源base / new / edit定义中的new / edit alias为空覆盖，所以宿主必须显式选择mode，并提供title、labels与四个独立binding；enabled与disabledVisible不能互相取反推导。源引用固定commit `15701fa9c13923f12662984c32c124327e40e3d3` 的 `add_external_server_screen.json`。

```tsx
import { useState } from 'react';
import { ExternalServerForm } from 'mcbeui';
import type { ExternalServerAction, ExternalServerValues } from 'mcbeui';
import 'mcbeui/external-server-form.css'; // 已包含field样式；styles.css也包含此入口
import 'mcbeui/fonts.css'; // 可选公开替代字体

export function AddServer({ onRequest }: {
  onRequest: (action: ExternalServerAction, value: ExternalServerValues) => void;
}) {
  const [value, setValue] = useState<ExternalServerValues>({
    name: '', address: '', port: '19132', // 宿主初值，不是库默认端口
  });
  return <ExternalServerForm title="Add Server" mode="add"
    labels={{ name: 'Server Name', address: 'Server Address', port: 'Port',
      play: 'Play', save: 'Save', remove: 'Remove', close: 'Close' }}
    bindings={{ playEnabled: true, playDisabledVisible: false,
      saveEnabled: true, saveDisabledVisible: false }}
    value={value} onValueChange={next => setValue(next)}
    onAction={(action, snapshot) => onRequest(action, snapshot)} />;
}
```

示例binding只是宿主明确允许操作的配置，不替代校验；保存、连接与移除要在onRequest中由宿主处理。`mode="edit"` 左侧为Remove，add为Play；`submitAction`默认Save，可设Play，Enter不会推断Remove。`onClose`分别报告close-button / escape，父层自行关闭；不需要关闭时可不传。

name / address / port始终保留字符串。Field默认maxlength分别16 / 256 / 6，port为text input加numeric键盘提示，既不清洗粘贴内容也不验证范围；可显式覆写maxLength / inputMode。`ExternalServerField`可独立使用并转发HTMLInputElement ref，className / style作用于真实input；Form ref为HTMLFormElement，fieldRefs可分别取得三处输入。受控value更新、原生reset和可取消事件包含在已验有限Web功能范围内。source browser04单批67／67通过、0skip／retry／flaky：交互48项为每个desktop／mobile的19fixture＋3gallery＋2真实状态检查；材质19项中15项完整RGBA零差，另4项仅源alpha参数合同通过，四个像素候选仍UNQUALIFIED。独立99＋66实验不支持把旧scalar opacity规则迁移到group，perpatch也未获资格；不改生产.8／.5或旧expected来追逐通过，旧四项FAIL保留，可由playwright.external-server-candidates.config.ts重现。真实forced-colors测试促成hover specificity下隐藏图层修复，普通模式未改。package02与旧四组合保留为修前CSS历史。修复后package03已完整通过：实际React18.3.1／19.3.1各207组件／225值、58项SSR／类型／12PNG／9metadata／CSS；实际安装四组合02全部通过，四个forced-colors场景逐项确认皮肤与三个close图层隐藏、真实input outline保留，built02为6／6、Node最终25项通过。功能受检快照SHA256为`f66179674712aeb86babf6f0936ae40acb68322b6ed345536ec5239f8004ec83`；后续仅文档重打包另记，不把该SHA冒作最终文档包身份。不能据功能／参数合同通过宣称alpha像素、native输入算法或整页像素相同。最终范围见 [EXTERNAL_SERVER_QA.md](docs/EXTERNAL_SERVER_QA.md)。


### Modern OreUI input parts

`OreTextField` 是实际 HTML input，`OreFieldSection` 拆出标签、描述和中性背景／上下阴影。两者与 Classic `ExternalServerField` 分开。

```tsx
import {OreTextField, OreFieldSection} from "mcbeui";
import "mcbeui/ore-text-field.css";

<OreFieldSection label="服务器名称" description="为服务器选择一个名称。" guiScale={2} locale="zh_CN">
  <OreTextField skins={{normal: normalWholeUrl, disabled: disabledWholeUrl}}
    value={name} onChange={event => setName(event.currentTarget.value)}/>
</OreFieldSection>
```

原图和 Seven／Noto 字体由宿主提供；包内不附带私有安装资源。本机预览可运行 `python scripts/use-local-ore-text-field-assets.py` 后重启 Vite，在 `#ore-text-fields` 查看正常、焦点、只读、禁用、invalid、中文、长文本、受控拒绝和原生重置。字段不继承 Classic maxlength 或端口过滤，不执行服务器服务。`invalid` 支持宿主反馈与 ARIA 状态；原版未闭合的焦点装饰／shake 不以猜测红边或动画代替。更多见 [ORE_TEXT_FIELD_QA.md](docs/ORE_TEXT_FIELD_QA.md)。


### Modern Add/Edit server screen

```tsx
import {OreExternalServerForm} from 'mcbeui';
import 'mcbeui/ore-external-server-form.css';

<OreExternalServerForm mode="add" title="添加服务器" backLabel="返回"
  labels={labels} skins={wholeFieldSkins} backIcon={yourBackIcon}
  size={[900, 560]} viewportSize={[900, 560]}
  safeArea={{top: 0, left: 0, right: 0}} guiScale={2}
  value={server} onValueChange={setServer} onAction={handleHostRequest}/>
```

默认 Enter 只退出输入并校验端口；传 `submitAction` 才显式启用 Web 表单提交。
端口允许 0，保留合法前导零；源 blur 校正可通过 `portValidation="host"` 交给宿主。
保存、连接、删除确认和未保存确认都是宿主请求，组件不调用 Minecraft 服务。
`OreButton`、`OreActionBar`、`OreScreenFrame` 与 `OreScrollArea` 可独立复用；
滚动区也被现有权限界面共用，并支持 React 19 callback-ref 清理。
材质和 Seven/Ten/Noto 字体由宿主提供，不随 npm 分发私有安装文件。
功能资格与原版像素资格分开记录，详见 [ORE_EXTERNAL_SERVER_QA.md](docs/ORE_EXTERNAL_SERVER_QA.md)。


## Classic Play三页组合

Play的12个公开部件与完整props／宿主边界见[PLAY_SCREEN_QA.md](docs/PLAY_SCREEN_QA.md)。下面三种pane是调用方提供的完整typed快照；库不从数组长度猜状态，也不根据网络状态偷偷连接。参考仓库`demo/play-screen-data.ts`可查看所有必需flags／labels的本地示例。

```tsx
import {useState} from 'react';
import {PlayScreen} from 'mcbeui';
import type {PlayScreenProps, PlayTabId} from 'mcbeui';
import 'mcbeui/styles.css';

type PlayData = Pick<PlayScreenProps, 'worlds' | 'friends' | 'servers'>;
export function PlayExample({worlds, friends, servers}: PlayData) {
  const [tab, setTab] = useState<PlayTabId>('worlds');
  return <PlayScreen viewportSize={[360, 300]} scale={2} inputMode="mouse"
    navigation={{value: tab, onValueChange: setTab,
      labels: {worlds: 'Worlds', friends: 'Friends', servers: 'Servers'},
      counts: {worlds: '27', friends: '9', servers: '4'},
      friends: {showBouncing: false, showNotBouncing: true,
        showInvites: false, inboxEnabled: false}}}
    worlds={worlds} friends={friends} servers={servers}
    exitButtonVisible={false} closeLabel="Close Play"
    onExitRequest={request => console.log(request.target)}/>;
}
```

`PlayScreen`不会自动接受服务器选择或连接请求；宿主在`servers.onAction`中接受`server_navigation_toggle`后更新selected／details，再由详情Join发出独立意图。可选本机字体与动态缩略图是宿主资源，缺图可明确为null，不提供假截图。Default Classic、Pocket、当前OreUI与Realms服务不能互相代替，完整Bedrock GUI目标仍未完成。本轮最终包／安装／生产验证结果待Root补入。
