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
| `ItemSlot` | **必填** `label`；`selected`、`count`；原生 button 属性 | selected 映射 aria-pressed，计数纳入可访问名称；children 放自有图片或 SVG |
| `PixelIcon` | **必填** `name`；`size`，默认 20 | 16×16 原创 SVG 图标，默认装饰性 aria-hidden，图标按钮须提供标签 |

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
- `npm run verify:package`：分别在 `.cache/consumer-react18` 和 `.cache/consumer-react19` 安装实际 tarball，验证 ESM、SSR、20 个导出、类型、CSS、皮肤、字体及许可路径。
- 自动无障碍检查不等于人工屏幕阅读器认证；尚未覆盖真实手机设备、Firefox 和 Safari。

## 许可

代码 MIT；字体 SIL OFL 1.1。展示页的像素图标、方块小岛和物品插画为本项目原创 SVG。Minecraft 名称属于其各自权利人。
