# mcbeui

React + TypeScript 的 Minecraft: Bedrock 风格 UI 组件库。方角、像素字体、硬边倒角、绿色交互状态、原生表单与键盘操作。首版采用 **Bedrock Classic / JSON UI** 作为方向，非 Ore UI。

> 这是独立粉丝项目，与 Mojang、Microsoft 无关联。开源替代字体和 Web 布局与游戏存在差异；未声称整套 UI 与任何游戏版本零像素偏差。视觉来源与差异见 [FIDELITY.md](docs/FIDELITY.md)。

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

```tsx
import { useState } from 'react';
import { Button, Panel, Switch, TextField } from 'mcbeui';
import 'mcbeui/styles.css';
import 'mcbeui/fonts.css'; // 可选，自托管像素字体

export function WorldSettings() {
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

各组件的完整类型由包内 `.d.ts` 导出，例如 `ButtonProps`、`DialogProps`、`TabItem`。除 Dialog 和 PixelIcon 外，各组件转发 ref 到主要原生节点。ReactNode 属性支持文本、图标或组合内容。

| 组件 | 主要属性 | 行为 |
| --- | --- | --- |
| `Text` | `as`: span / p / h1…h4；`size`: sm / md / lg / xl；`shadow` 默认 true | 像素文字与无模糊阴影，转发 HTMLElement ref |
| `Button` | `variant`: default / primary / danger / ghost；`size`: sm / md / lg；`loading`、`fullWidth`、`startIcon`、`endIcon` | 默认 `type="button"`；loading 保留文字，禁用并设置 aria-busy；继承 button 属性 |
| `IconButton` | Button 属性；**必填** `aria-label` | 正方形按钮，children 放图标 |
| `Panel` | `title`、`footer`、`variant`: default / inset | Classic 浅灰九宫格面板 / 灰色凹陷面板；section，标题自动关联 aria-labelledby |
| `TextField` | **必填** `label`；`description`、`error`；原生 input 属性 | 标签关联、错误与描述自动关联；error 设置 aria-invalid |
| `TextArea` | **必填** `label`；`description`、`error`；原生 textarea 属性 | 可垂直调整尺寸 |
| `Checkbox` | **必填** `label`；`description`、`indeterminate`；原生 checkbox 属性 | 原生 checked/defaultChecked、name/value、required、键盘 Space |
| `Switch` | **必填** `label`；`description`；原生 checkbox 属性 | 原生 checkbox + role=switch，支持表单 |
| `RadioGroup` | **必填** `label`、`options`；`value` / `defaultValue`；`onValueChange`、`name`、`disabled`、`required`、`orientation` | 原生 fieldset/legend/radio，自动独立 name，原生方向键操作 |
| `Slider` | **必填** `label`；`value` / `defaultValue`；`onValueChange`、`min`、`max`、`step`、`formatValue` | 原生 range，显示格式化值，支持方向键、Home、End |
| `Combobox` | **必填** `label`、`options`；`value` / `defaultValue`、`onValueChange`、`placeholder`、`name`、`form`、`required`、`disabled`、`description`、`error` | select-only combobox，原版样式列表，当前选中与活动项分离；原生表单提交 / 校验 / reset；ref 指向可见按钮 |
| `Select` | **必填** `label`、`options`；`description`、`error`；原生 select 属性 | 原生选择控件作为可选替代，展开列表由操作系统绘制；默认展示使用 Combobox |
| `Tabs` | **必填** `label`、`items`；`value` / `defaultValue`；`onValueChange`、`orientation` | items 为 `{ value, label, content, disabled? }[]`；方向键循环，Home/End，跳过禁用项，保留面板状态，支持 RTL |
| `Dialog` | **必填** `open`、`onOpenChange`、`title`；`description`、`footer`、`closeLabel`、`closeOnBackdrop` | Classic 灰色标题栏、深色凹陷内部、原版三态关闭图像；原生 modal dialog，Escape、遮罩关闭、焦点循环与恢复；closeOnBackdrop 默认 true |
| `Badge` | `variant`: default / success / warning / danger | 非交互标签 |
| `Progress` | **必填** `label`；`value`、`max`、`showValue` | Classic common.progress_bar 纹理，高 10 CSS px，完整填充图按进度裁切；省略 value 为不确定进度，数值限制在 0…max；reduced motion 下静止 |
| `Alert` | `title`；`variant`: info / success / warning / danger | danger 使用 role=alert，其余 role=status；可覆盖 role |
| `Separator` | 原生 hr 属性 | 双层硬边分割线 |
| `ItemSlot` | `item`、`label`、`image`、`count`、`selected`、`durability`、`placeholder`、`underlay`、`showTooltip`、`onSecondaryAction`；原生 button 属性 | 真实 container cell，36×36 槽位 / 32×32 物品；蓝色选中、绿色悬停、白色键盘焦点；0 为空、1 隐藏角标；underlay 在物品下方常驻，placeholder 仅空槽显示 |
| `ItemTooltip` | **必填** `item`；div 属性 | 名称、lore、耐久说明；ItemSlot 自动处理焦点 / hover / Escape，并在 Dialog 内挂载提示 |
| `InventoryGrid` | **必填** `label`、`items`；`size`、`columns`、`selectedIndex` / `defaultSelectedIndex`、`onSelectionChange`、`onSlotAction` | 单一 Tab 入口，方向键 / Home / End / Ctrl+Home/End，跳过禁用项；primary / secondary 操作事件 |
| `ItemImage` | `src`、`alt`、`imageProps`、children；span 属性 | 独立 32×32 物品区域，最近邻渲染；缺图不生成替代图案 |
| `ItemCount` | `count`、`hideSingle`；span 属性 | 共享槽位数量角标；默认隐藏 0 / 1，拒绝非有限数量 |
| `DurabilityBar` | **必填** `value`；`max`、`hideWhenFull`、`label`、`color` | 独立 meter，12 游戏像素宽；原生颜色 renderer 仍待验证，可提供自定义颜色 |
| `SlotPlaceholder` | `src`、`alt`、children；span 属性 | 共享空槽占位图层；由调用方提供原始资源 |
| `ResultSlot` | ItemSlot 属性；`available`、`size`: normal / large、`onTake` | 大结果槽 52×52，物品仍 32×32；空结果保留焦点并阻止取出操作 |
| `PlayerInventory` | `items`、`hotbar`、`label`、`hotbarLabel`、`selectedIndex`、`onSelectionChange`、`onSlotAction` | 27 格背包与 9 格快捷栏，共享 0…35 的选中索引 |
| `WorkstationFrame` | **必填** `title`；`inventory`、`hotbar`、`inventoryLabel`、`onClose`、`closeLabel`、`onInventoryAction` | 176×166 游戏像素 Classic 容器外框，以 GUI 2 显示；窄屏局部滚动 |
| `Grindstone` | `inputs`: readonly [item, item]；`result`、`invalid`、`onInputAction`、`onTakeResult`；Frame 属性 | 砂轮双输入、结果、原始箭头 / 无效标记和玩家背包；结果由调用方提供 |
| `EnchantingTable` | **必填** `options`；`item`、`lapis`、`book`、`onInputAction`、`onEnchant`；Frame 属性 | 附魔台输入、青金石、三档选择、级别消耗与禁用态；book 支持自定义渲染 |
| `EnchantmentOption` | **必填** `id`、`label`、`level`；`tier`: 1 / 2 / 3、`runes`、`disabled`、`buttonId`、`onEnchant`；button 属性 | 可独立使用的附魔选项；id 是业务 ID，buttonId 是可选 DOM id；onClick.preventDefault() 取消选择回调 |
| `EnchantingRunes` | **必填** `text`、`atlasUrl`；`scale`: 1…4、`color` | 按原始 SGA 图集采样字形与字距；图集由调用方提供，不随 npm 捆绑 |
| `EnchantingBook` | `textureUrl`、`open`、`pageFlip`、`lighting`: calibrated / unlit、`yaw`、`pitch`、`roll`、`onRendererError`；canvas 属性 | 真实材质、封面 / 书脊 / 厚页块 / 翻页的可选 WebGL 书本；默认 pitch=20、lighting=calibrated，以本机 Bedrock 无损 PNG 校准视角和分面光照，模型仍参考 Mojang Java BookModel 重建 |
| `ProcessingArrow` | `progress`: 0…1、`label`、`variant`: smelting / crafting；div 属性 | 原始箭头纹理，smelting 从左向右裁切完整填充图；crafting 使用静态箭头 |
| `FuelIndicator` | `progress`: 0…1、`label`；div 属性 | 原始火焰纹理，自底部显示剩余比例，保留 full 图原尺寸 |
| `RecipeGrid` | InventoryGrid 属性；`columns`、`rows`: 2 / 3 | 共用合成网格；尺寸决定槽位数，支持 2×2 和 3×3 |
| `CraftingTable` | `inputs`、`result`、`selectedInputIndex`、`onInputAction`、`onTakeResult`；容器库存属性 | 源 3×3 工作台右面板，大结果槽与共享库存；配方书及外部 toolbar 尚未实现 |
| `Furnace` / `BlastFurnace` / `Smoker` | `input`、`fuel`、`result`、`progress`、`fuelRemaining`、`onInputAction`、`onTakeResult`；容器库存属性 | 共用原版熔炼右面板，原始浮点槽位布局、火焰与进度裁切；游戏规则由使用方提供 |
| `PixelIcon` | **必填** `name`；`size`，默认 20 | 16×16 原创 SVG 图标，默认装饰性 aria-hidden，图标按钮须提供标签 |
| `Image` | **必填** `src`、`alt`、`sourceSize`；`size`、`scale`；img 属性 | PNG 物理尺寸与 GUI 逻辑尺寸分离，静态 SSR，无加载后测量；空 alt 表示装饰图 |
| `NineSlice` | **必填** `src`、`sourceSize`、`slice`；`destinationBorder`、`size`、`scale`、`fill`、`alt`、children | 源切片用物理像素，目标边距用逻辑像素；边框层与内容分离，children 保持可访问和交互；非法几何抛 RangeError |
| `ContainerFrame` | **必填** `title`；`height`、`titleAlign`、`titleOffset`、`inventory`、`hotbar`、`inventorySelectedIndex`、`onInventorySelectionChange`、`onInventoryAction`、`onClose` | 352 CSS px 宽、可变高度容器，共享底部锚定的玩家物品栏；height / titleOffset 用 CSS px |
| `Chest` | `rows`、`items`、`selectedIndex`、`onSelectionChange`、`onSlotAction`；容器库存属性 | 3 / 6 行箱子及 1…6 行数据驱动布局；行数取整并限制范围，非有限值回退 3 |
| `Hopper` / `Dispenser` / `Dropper` / `ShulkerBox` | `items`、`selectedIndex`、`onSelectionChange`、`onSlotAction`；容器库存属性 | 共用存储 API，分别保留 5 / 9 / 9 / 27 格与原始面板高度；空槽允许操作回调 |
| `Anvil` | **必填** `name`；`onNameChange`、`inputs`、`result`、`invalid`、`cost`、`renameDisabled`、`renameReadOnly`、`onInputAction`、`onTakeResult` | 原版重命名框、30 字符限制、修复槽位与费用；结果守卫空槽、无效、经验不足和过贵状态，保留焦点 |
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

### ComboBox 与选中态

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

初次焦点在关闭按钮；也可在子表单中指定原生 `autoFocus`。原生 showModal 让背景失去交互，组件额外处理 Tab 首尾循环和滚动锁定。需要浏览器原生 HTMLDialogElement 支持，目标为现代 Chromium、Firefox、Safari。标题超过可用宽度时显示省略号，完整文字仍用于可访问名称；正文与按钮区域可随内容滚动。

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

物品图由调用方提供，npm 不捆绑游戏物品纹理。展示页已使用实际 PNG，来源与 SHA 见 [item-materials.json](docs/item-materials.json)：26 张示例素材均取自官方 `v1.26.60.5 full` 合并资源，并记录本机 59 个 vanilla / 版本覆盖目录中的候选。钻石剑采用与公开合并资源一致的 198-byte PNG；此前 22 像素差异来自基础包与合并资源，不能据此认定运行时最终材质。资源存在与 manifest 不证明当前激活顺序。草方块使用官方 GUI 类目图标，保留 17×17 原图的整数缩放，不冒充 native block renderer。`durability` 为剩余比例 0…1；组件显示角标、耐久和提示，并发出操作事件，不自行计算配方、附魔或搬移物品。右键 / Shift+F10 为 secondary，Enter / Space / 点击为 primary。原生 `onContextMenu` 可阻止默认 secondary 处理。

槽位依据 common.container_item 重做，cell_image 的 PNG 为 10×10、逻辑 base_size 为 5×5，因此源切片为 2px、GUI 2 的显示边宽仍为 2px。普通 / 悬停 / 选中 / 聚焦已有独立原图对照。ItemTooltip、数量基线、耐久色相和 disabled filter 仍需游戏 renderer 截图校准。已移除伪紫色 glint；`enchanted` 仅保留数据标记，缺图时也不会自绘替代物。

砂轮布局来自 grindstone_screen.json，附魔台来自 enchanting_screen.json；逐级锚点与百分比推导见 [workstation-geometry.json](docs/workstation-geometry.json)。附魔选项保留源浮点边界，不人为取整。砂轮空结果槽保留 hover / focus，通过 `aria-disabled` 与回调 guard 阻止无效领取。真实关闭按钮支持容器内部的原始键盘导航。

`book` 提供原生自定义 3D renderer 的接入点，省略时不绘制假书图。展示页显式使用带真实材质的 `EnchantingBook` 重建；默认 `pitch={20}` 与 `lighting="calibrated"` 根据本机 Bedrock 1.26.6005.0 无损 PNG 校准视角和分面颜色，`lighting="unlit"` 可检查未着色图集。网格仍是重建，闭合 / 打开样本的校准不等于所有翻页动画和整屏 renderer 均已吻合。`runes` 可传 `EnchantingRunes`，省略时不生成假英文符文，但按钮仍有完整可访问名称。原图集可仅在本地预览接入：

```powershell
python scripts/use-local-runes.py 'C:/XboxGames/Minecraft for Windows/Content'
npm run dev
```

SGA 的 AIZ 样本已通过原图逐像素对照；这不证明 native renderer 的字号和基线。详见 [enchanting-renderer.json](docs/enchanting-renderer.json) 与 [WORKSTATION_QA.md](docs/WORKSTATION_QA.md)。库存布局保持固定游戏坐标，320px 窄屏在局部滚动。

## 完整组件范围

当前 **86 个已实现组件**；按用户要求，以 Bedrock 原生控件和 GUI 为边界，优先拆可复用零件。[组件清单](docs/COMPONENTS.md) 与 [component-catalog.json](docs/component-catalog.json) 当前整理 106 项（含 RecipeSelectionGrid / CrafterSlot / BeaconEffect 公共零件），逐项标记 implemented / planned；implemented 只代表已导出，不等于 pixel-perfect 已验收。

- 基础控件：文本、图片 / 九宫格、按钮、输入、选择、设置行、标签页、弹窗、提示、滚动区域。
- 容器零件：槽位、物品图 / 数量 / 耐久、背包网格、配方格 / 搜索 / 分类、燃料、处理箭头、附魔选项、交易条目。
- GUI：已有附魔台、砂轮、工作台与熔炉族主面板、铁砧、酿造台、现代锻造台、制图台、切石机、织布机、信标、合成器、箱子族、漏斗、发射器与投掷器；继续交易、玩家 / 创造 / 坐骑背包，以及尚缺的配方书和 screen wrapper。
- HUD 与页面组合：已有快捷栏、生命 / 饥饿 / 护甲 / 氧气 / 经验 / Boss 条、准星、聊天、计分板、效果、标题和手持提示；继续玩家列表及触屏控制，以及暂停 / 设置 / 世界 / 服务器 / 资源包等组合。

完整 GUI 由这些基础零件组合。planned 项仍在开发，不作为已有导出；原生 3D renderer、最终像素取整与真实游戏整帧差异单独验收。

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

上述纹理 URL 由使用方提供。`sourceSize` / `slice` 描述 PNG 物理像素，`size` / `destinationBorder` 描述缩放前的 GUI 逻辑像素：例如 cell_image 的物理图为 10×10，逻辑 base_size 为 5×5，不能把两个尺寸混用。Image / NineSlice 的 sourceSize、slice 与 scale 必须为合法整数，非有限、负数或越界切片抛 `RangeError`；内容尺寸和目标边距可用有限逻辑值，像素验收仍要求对齐物理像素。`style` 可覆盖默认布局，但不包含在默认参数的像素证明中。

`AnvilCost` 支持 `{kind:'levels', levels, affordable?, label?}` 或 `{kind:'too-expensive', label?}`；费用与可用性来自调用方，不推算游戏规则。重命名字段遵循原版模板的 `shadow:false`，费用文字保留 `shadow:true`。费用阴影色与原生 baseline / snapping 仍待实拍验证。

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

## 字体

字体文件在仓库中，构建和运行均不依赖字体 CDN。样式与字体分开导出，不导入 `fonts.css` 就不请求字体。

| 字体 | 版本 | 文件 | 用途 / 差异 |
| --- | --- | --- | --- |
| MCBE Pixel | 基于 Monocraft v4.2.1 | WOFF2，44.3 kB | 默认英文；保留字形与字宽，重命名并加入前景色 COLR 层，减少 Windows ClearType 彩边；基准字号 18px |
| MCBE CJK | 基于 Fusion Pixel 2026.10.25 | WOFF2，1.06 MB | 中文前景色 COLR 版本，保留全部轮廓与字宽，示例 24px；生成记录见 pixel-cjk-font.json |
| [Monocraft](https://github.com/IdreesInc/Monocraft) | v4.2.1 | WOFF2，31.5 kB | 英文像素字体。等宽，含重绘字形，**非原版 Mojangles** |
| [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font) | 2026.10.25 | 12px proportional zh_hans WOFF2，960 kB | 简体中文及 CJK 回退，建议 12 / 24 / 36px 整数倍率 |

这些字体采用 SIL OFL 1.1，字体许可及继承来源声明随包提供。Monocraft 仅转换格式，Fusion Pixel 保留上游文件。两个 MCBE 字体的 COLR 转换记录见 [pixel-font.json](docs/pixel-font.json) 和 [pixel-cjk-font.json](docs/pixel-cjk-font.json)。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

原版字体：如已持有可用于该场景的 Mojangles 字体，可以自行接入；npm 库不包含游戏原版字体。重建控件皮肤的来源见视觉基准文档。

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
- `npm run verify:package`：分别在 `.cache/consumer-react18` 和 `.cache/consumer-react19` 安装实际 tarball，验证 ESM、SSR、86 个导出、类型、CSS、皮肤、字体及许可路径。
- 自动无障碍检查不等于人工屏幕阅读器认证；尚未覆盖真实手机设备、Firefox 和 Safari。

## 许可

代码 MIT；开放字体 SIL OFL 1.1。像素图标、小岛和品牌方块是原创展示插画；物品、GUI 与书本素材的来源及权利说明见 THIRD_PARTY_NOTICES.md，它们不因代码的 MIT 许可而改变归属。Minecraft 名称属于其各自权利人。
