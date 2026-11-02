# Disconnect：三种源布局与可复用部件

`DisconnectScreen` 组合 `DisconnectMessage` 与 `DisconnectActions`，提供普通断线、Realms 断线和 Realms 警告。它使用固定 Classic JSON 的真实消息区、按钮布局和原始背景；不把 Loading、Dialog 或 OreUI 弹窗当作此屏幕。

来源为 Bedrock Samples commit `15701fa9c13923f12662984c32c124327e40e3d3` 的完整 `disconnect_screen.json`（8105 B，SHA256 `9883f0aff478dd446a65cbdec5b09fb49323465ea36928685895513bfe9aff5e`），并核对其 common / button 继承。源与布局证明不是原生整页像素认证；尚未恢复的引擎默认值由显式 Web profile 提供。

## 使用

```tsx
import {DisconnectScreen} from 'mcbeui';
import 'mcbeui/disconnect.css';

const enabled = (label: string) => ({label, visible: true, enabled: true});

<DisconnectScreen
  label="连接已断开报告" title="连接已断开" body="与服务器的连接已断开。"
  layout={{
    size: [320, 240], scale: 2,
    hiddenSlots: 'reserve', rowAlignment: 'center', uriButtonAnchor: 'center',
    textAlignment: 'center', textVerticalAlignment: 'center',
    font: {family: 'My Mojangles, monospace', size: 10, lineHeight: 10},
  }}
  contentRect={[0, 0, 320, 240]}
  background={{renderer: 'css', sampling: 'point', tileOrigin: [0, 0], originRounding: 'floor'}}
  actions={{variant: 'disconnect', ok: enabled('确定'),
    openAccount: {label: '打开账户帮助', visible: false, enabled: true}}}
  onAction={detail => handleRequest(detail)}
/>
```

所有尺寸都是逻辑单位，`scale` 是正整数。组件的物理宽高为 `layout.size × scale`，必须是正整数、每轴不超过 8192、总面积不超过 16,777,216。背景覆盖完整 frame；`contentRect` 是宿主已解析的安全区内容矩形，必须在 frame 内，消息和按钮在其中独立布局。没有根据浏览器窗口猜测游戏 GUI scale、安全区或 DPI。

独立使用 `DisconnectMessage` 时提供 `layout/title/body`，ref 指向 div；`DisconnectActions` 提供 `layout/model/onAction`，ref 也指向 div。两者只占所声明的 frame，可由宿主定位。Screen ref 指向 section。`buttonRefs` 指向真实按钮，兼容 React 18 / 19 的 callback cleanup；`controllerRef` 是逻辑请求句柄。

## 三种动作模型

每个按钮都有独立 `{label, visible, enabled}`。`label` 是最终宿主文本；没有 Retry 或重新连接服务。

| `actions.variant` | 控件 | 源结构 |
| --- | --- | --- |
| `disconnect` | `openAccount`、`ok` | URI holder 30，OK holder 26；stack 底部在内容区高度 80% |
| `realms-disconnect` | `openAccount`、`store`、`back`、`storeIgnored` | URI holder 30，水平按钮行 holder 30；stack 中心在内容区中心 Y+30 |
| `realms-warning` | `store`、`continue`、`cancel`、`storeIgnored` | 水平行 26＋垂直间隔 5＋Cancel holder 26；没有 URI 分支 |

普通菜单按钮 128×26，URI 按钮 200×26，Cancel 256×26。水平行中 Store 后面的 5×0 间隔是独立源节点；`storeIgnored` 只移除 Store，不移除该间隔，也不推断用户平台。两种 Realms 分支复用同一原始 portal 背景。

`hiddenSlots` 是明确的 Web 布局政策：`reserve` 保留隐藏按钮及 URI holder 的空间；`collapse` 移除隐藏按钮的宽度，URI 隐藏时也移除其 30 高 holder。其他固定 holder 和显式间隔仍保留，不能因为所有子按钮隐藏就删除源 holder。只有 URI holder 的可见性是此文件的动态源绑定；其他按钮的 `visible/enabled` 是独立宿主能力接口。

`rowAlignment` 控制尚未恢复的水平 stack 默认对齐；`uriButtonAnchor` 控制 URI 在其 holder 中的垂直位置。URI 没有继承菜单按钮的显式 top-middle anchor，不能暗中把两者当成相同。字体、文本内部对齐也必须显式提供。

消息区保留正文 50 高、中心偏移 Y−40，以及标题 40 高、中心偏移 Y−10，最大宽度是内容区宽−20。DOM 采用 CSS max-content 和显式换行，超出源框的文字裁切，没有浏览器滚动条；它不等于已恢复的引擎 intrinsic 或自动换行。两处文字和按钮文字都无 shadow。正文过滤、TTS once 及实际字符串由宿主负责，组件不实现游戏过滤器或语音服务。

## 输入与请求

| 动作 | 源 button ID |
| --- | --- |
| OK / Back / Escape / controller menu-cancel | `button.menu_leave_screen` |
| Continue | `button.menu_continue` |
| Store | `button.menu_check_store` |
| Open account help | `button.menu_open_uri` |
| Warning Cancel | `button.cancel_join_realm` |

`onAction` 只报告包含 action、buttonId、variant、source、button 及可选真实 event 的请求。URI 请求附带源固定 `https://aka.ms/MCMultiplayerHelp`，不会自动打开窗口。宿主决定关闭、继续、购买或连接行为；组件不调用任何服务或自动改变 variant。

事件请求等原生传播结束后再检查 `defaultPrevented`，叶控件、祖先或 document 可以否决。发生源快照替换、禁用、隐藏、inert、卸载或模态输入所有权变化时，过期请求不发出。`disabled` 阻止所有请求；单独 `menuCancelEnabled` 只控制全局取消，不控制 OK / Back 按钮。

`controllerRef.current.request('button.menu_cancel')` 走相同 leave 请求与当前能力检查，返回是否已排入请求队列，不表示服务已完成。它不推断物理手柄型号或监听 Gamepad API。可选 `inputHint` 提供明确 `visible`、宿主已解析的全 frame 逻辑 `box` 和真实 controller glyph 内容；不内置猜测的 A 按钮或 intrinsic 尺寸。

默认是 inline region。`modal` 显式开启 Web focus containment、背景 inert、Tab 环绕、关闭后的焦点恢复及滚动锁；原生焦点算法仍未认证。宿主应通过 `hidden` 或卸载关闭，不靠不相关 CSS 隐藏一个仍占有焦点的模态层。

三个部件均支持 `inert`，在 React 18 / 19 下保留标准 HTML 属性，阻止输入而不移除背景。嵌套原生 `<dialog>` 的 Escape 由该 dialog 处理；原生模态 dialog 持有焦点时，外层断线页的 controller 请求也不会越过它。

## 真实背景与采样

普通背景是 `textures/ui/bg32.png`，Realms 背景是 `textures/ui/portalBg.png`，两者都是完整原始 32² PNG。portal 节点没有局部动画、时钟或流动 UV；不添加世界传送门的动画。原图与未改写许可见 [disconnect-assets.json](disconnect-assets.json)，代码 MIT 不改变图片权属。

`renderer:'css'` 用完整原图平铺。`renderer:'gpu'` 复用现有 `GuiImageLayer`、原 PNG、整 frame projection 和显式 tiling；当前只支持 point，不会把请求的 bilinear 静默改为 point。CSS 可显式选择 bilinear。`tileOrigin` 每轴在 [−32,0]，源物理相位的 floor / truncate 是宿主选择，不是恢复的默认值。

GPU 加载或丢失 context 时保留当前 CSS 背景；不支持 `:has` 的浏览器使用 CSS。隐藏或卸载释放该可选画布，再显示可重建。背景没有额外的黑色洗色层、伪造 portal 动画或默认 alpha；base-screen 过渡、实际 native tile 相位、safe-zone evaluator、全语言字体与整屏 RGBA 仍待原生验证。

准备工具只读取固定公开样本 ZIP：

```sh
python scripts/prepare-disconnect-assets.py --check
```

展示页入口为 `/#disconnect`。当前源研究、纯模型、浏览器与实际包验证按各阶段记录在 `.cache/disconnect-screen-qa-20261103-01/FINAL.json`；未完成的检查不能由实现数量代替。

## 本阶段实际验证（2026-11-03）

- 纯模型 16／16，通过严格 TS 编译；没有 React、DOM、GPU、服务或时钟依赖。
- 同一 browser04 批次 50／50，无跳过或重试：桌面与 Pixel 7 的交互、三种源分支、固定间隔、宿主安全区、事件否决、过期请求、IME 标志、inert、嵌套原生 dialog、模态焦点、真实 refs、forced-colors、Axe、GPU ready／context loss／卸载；包含六个完整背景平面。
- 六个 CSS／GPU 原始平铺背景，共 921,600 个 RGBA 像素与独立原 PNG 重复期望严格零差。这是 Web 源材质检查，不是原生游戏整页对照。
- 全新 package04 tar 实际安装到 React 18.3.1／19.3.1：274 个运行时导出、SSR、严格声明、CSS、字体和许可检查通过。每 peer 的 Disconnect 18 组 SSR／资源合同和 12 个负类型合同通过。
- 同一已安装包在两 peer 的默认 Vite 开发／生产四场景通过，包含真实输入、原生 inert／dialog、焦点恢复、GPU 和 ref 清理。三分支四状态的 24 个开发／生产完整 frame 对比，共 1,843,200 像素严格零差；这说明这四场景输出一致，不是 native 认证。
- 已构建的公开预览页另有桌面／Pixel 7 共 4 项检查通过，包括真实按钮请求、三分支控制、GPU 背景及 320px 窄屏边界。

早期真实失败保持记录：窄屏示例溢出后改为按宿主实际可用宽度布局；包校验器旧导出数量和 Vite 内联 URL 假设修正；原生 dialog Escape 串到外层以及 React 18 inert 属性丢失均先复现再修复。没有放宽像素容差或替换源图。

固定源 JSON、两张完整 PNG 与所有宿主政策不能恢复游戏字体 atlas／baseline、safe-zone evaluator、默认 intrinsic／换行、tile 相位、TTS／过滤／账户服务或完整原生 frame。此前字体 SwiftShader 38 像素差异及 ResourcePacks 的原生残差仍独立保留，本阶段没有宣称修复。
