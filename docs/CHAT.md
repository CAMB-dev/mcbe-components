# Chat：聊天与命令

`ChatScreen` 组合聊天记录、消息输入框、命令补全、坐标工具条、聊天设置、主机选项和提示层。`ChatComposer` 和 `ChatTranscript` 可独立使用，适合嵌入自己的界面。三者使用同一套类型、原始材质与显示参数，旧的 `ChatPanel` / `ChatMessage` 继续保留。

```tsx
import { ChatScreen, ChatComposer, ChatTranscript } from 'mcbeui';
import type {
  ChatScreenProps, ChatComposerProps, ChatTranscriptProps,
  ChatPresentationProfile, ChatDraft, ChatComposerHandle,
} from 'mcbeui';
import 'mcbeui/fonts.css';
import 'mcbeui/chat-screen.css';
```

完整屏幕的样式入口包含各子层样式。独立输入框可以只加载 `mcbeui/chat-composer.css`，独立聊天记录可以只加载 `mcbeui/chat-transcript.css`。主样式入口的导入方式以 README 为准。

## 数据和尺寸

组件不连接 Minecraft。消息、命令结果、坐标、历史、设置、主机列表和所有语言字符串均由宿主传入。`demo/chat-demo-data.ts` 提供一套可阅读的完整显示参数和数据示例；这些 demo helper 不属于库的运行时 API。

| 字段 | 用途 |
| --- | --- |
| `runKey` | 当前聊天会话的稳定标识；变更会创建新的编辑会话，旧异步操作失效。 |
| `profile.availableSize` | 明确的逻辑宽高；屏幕根据此尺寸布局，不从页面内容猜测尺寸。 |
| `profile.scale` | 逻辑单位到 CSS 像素的倍率。建议整数倍率，避免浏览器缩放模糊原始像素。 |
| `profile.fonts` | 分别指定聊天、编辑器、界面文字、平滑文字的字体族、逻辑字号、行高。 |
| `profile.labels` | 以原始语言键为索引的显示文本。设置面板实际需要的键必须完整提供。 |
| `profile.whiteMaterial` | 显式传入原始完整图片、天然尺寸及来源；精确大写 `textures/ui/White` 资源尚未恢复。 |
| `profile.gamepadImages` | 宿主选择的 B/X/Y 完整图像；不推断真实设备或平台映射。 |
| `maxChildren` | 固定 `100`，来自消息工厂上限。 |
| `overflowPolicy` | `reject` 拒绝超限，或显式选择 `last100-explicit-web` 仅显示最后 100 条。 |

设置、主机选项、命令补全均接收结构化记录；不可用插入任意整页 children 的方式替换。物品图可传入原始完整贴图，或者只替换命令提示中有限的 9×9 物品叶子渲染器。所有已知数据会在文字或物品回调执行前完成校验。

主机选项的五个可见标志彼此独立：`mainVisible`、`teleportMainVisible`、`teleportPlayersVisible`、`timeVisible`、`weatherVisible`。demo 导航会切换这些标志；库自身不会把它们折叠为互斥菜单。列表 `navigation` / `subCommand` 是不透明宿主数据，库不执行它们；玩家列表的有效 `subCommand` 遵循原始绑定，使用 `gamertag`。

## 受控编辑器

编辑状态包含原始文本、选区方向、选区范围和修订号。宿主接纳 `onDraftChange` 的完整状态即可；只同步 `text` 会丢失选区或异步更新身份。

```tsx
import { useState } from 'react';
import { ChatComposer } from 'mcbeui';
import type { ChatComposerProps, ChatDraft } from 'mcbeui';

type ComposerEnvironment = Pick<ChatComposerProps,
  'bindings' | 'profile' | 'capabilities' | 'onAction'>;

export function MessageEditor(environment: ComposerEnvironment) {
  const [draft, setDraft] = useState<ChatDraft>({
    text: '', selectionStart: 0, selectionEnd: 0,
    direction: 'none', revision: 'host-initial',
  });
  return <ChatComposer {...environment}
    runKey="session-1" cheatsOn={false} history={[]}
    mode="controlled" draft={draft} onDraftChange={setDraft}
    historyPolicy="host-requests"
    inputProps={{ 'aria-label': '消息', placeholder: '输入消息' }}
  />;
}
```

`onAction` 里的 `rawDraft.text` 保留空白和 Unicode，不自动 trim、不清空。发送成功后是否清空、写入本地消息、更新历史，均由宿主决定。示例完整屏幕明确在发送后清空；独立输入框示例保留内容。

`composerRef` 暴露 `getDraft()`、`focusEditor()`、`request()` 和 `applyDraft()`。异步补全可以把请求时的 `runKey` / `revision` 作为 `expectedRunKey` / `expectedRevision`，连同新文本、选区和新修订号传给 `applyDraft`。过期请求返回 `false`。受控模式只通知宿主更新，不替宿主接纳草稿。

库生成的 Web 修订号是 `mcchat:web:` 加 32 位十六进制的 128-bit 随机身份，固定 43 字符。它不依赖宿主 `runKey` 长度，也不把宿主修订号解析成共享计数器。编辑和非受控初始化需要 `crypto.getRandomValues`；缺失或连续返回当前活动身份时明确报错，不降级到 `Math.random`。这是概率身份，不是排序号、鉴权凭据或数学上的绝对唯一证明。宿主修订号本身是不透明字符串。

## 非受控编辑和原生事件

把受控示例中的模式相关字段替换为以下字段即可：

```tsx
mode="uncontrolled-web"
defaultDraft=""
historyPolicy="local-oldest-first-web"
```

此时删除 `draft`，`onDraftChange` 可选。`history` 按最旧到最新排列，本地历史支持返回进入历史前的草稿。原生表单 reset 恢复挂载时的 `defaultDraft` 并清除本地历史状态，不伪造发送或 change 事件；`preventDefault()` 可以取消 reset。

编辑框是真正的 `<input type="text">`，保留浏览器粘贴、选区、组合输入和原生事件。`inputProps` 可以传入 `onChange`、`onKeyDown`、`onSelect`、`onBeforeInput`、`readOnly` 等；`type/value/defaultValue/maxLength/disabled/children` 由组件拥有。长度限制由 `profile.maxTextEditLength` 与明确的 `web-utf16` 策略指定，宿主初始值和 `applyDraft` 不会被静默截断。

`profile.inputPolicy.submit='web-enter'` 允许 Enter 提交语义请求，也保留外层原生 form 的默认提交。若外层表单不应提交，请在宿主 `onSubmit` 中 `preventDefault()`。`host-only` 则不启用该键盘发送策略。事件先经过原生/宿主处理，再异步提交语义请求，后续 document 监听器的 `preventDefault()`、卸载、会话变化、禁用变化等仍可使请求失效。

## 完整屏幕、设置和控制器

`ChatScreen` 初始建议 `open={false}`，由用户动作打开，便于记录正确的返回焦点。屏幕拥有 modal 焦点边界；设置面板是其内部独立 modal。Escape 先关闭当前下拉框，再请求关闭设置，最后才请求关闭聊天；关闭请求由宿主接纳并更新 `open` 或 `settings.popup`。

`bindings.backAccessibilityText` 应包含可见的 `backText`，例如“返回，关闭聊天”，让语音操作与读屏名称一致；两者仍是独立宿主输入。

设置值通过 `onSettingChange` 回传，坐标选择通过 `onCoordinateChange` 回传，主机传送选择通过 `onHostSelectionChange` 回传。设置 `popup.instanceId` 标识真实实例：字体区域的 once 可见性在这个实例创建时采样；更新实例标识才重新采样。滑块明确提供 `min/max/step`，`steps` 是独立原始元数据。

`controllerRef.request()` 只接受声明的逻辑输入 ID 与目的地，不模拟物理手柄。聚焦输入与全局输入的路由分开；通用 select/ok 操作需要实际控件焦点。`notifyPlayerHurt()` 是明确的宿主生命周期通知，可以请求关闭屏幕；组件不模拟伤害或游戏事件。

## 字体、阴影和资源边界

先导入 `fonts.css`，再用 `document.fonts.load()` 等待具体字体加载后挂载要做视觉比较的界面。demo 等待已打包的 `MCBE Pixel` 与 `MCBE CJK`，并采用 `"MCBE Pixel", "MCBE CJK", monospace` 的角色字体族；平滑选项明确使用系统无衬线，不声称已提供游戏原版 Noto Sans 或 Mojangles。

`profile.messageShadow` 独立控制消息文字阴影；编辑框原始规则是无文字阴影，组件不会从全局 `text-shadow` 继承不相关的阴影。字号、行高、`chatFontScaleFactor` 和 `chatLinePadding` 均为显式显示参数。`renderText` 仅替换非编辑文字的 glyph 输出，不接管输入框，也不替换整页；调用方仍需保证字体覆盖和度量。

运行时材质引用原始完整 PNG 和原始九切片元数据，不使用界面截图作为纹理。demo 的 `demo/assets/chat/IDENTITY.json` 保留四张完整宿主图片的固定归档来源和 SHA：小写 `white.png` 是明确的宿主替代选择；Xbox 图是明确的显示选择。大写 `White`、平台图标提供者、原生字体 shader/字形路由、原生 `%c` 布局求值器仍未恢复。

当前源码采用原始 Chat 结构与标志，尺寸相关未恢复部分采用 `finite-parent-percent-intrinsic-web-profile`。11 张独立预冻结的完整材质参考平面在 Chromium 中为零像素差异，覆盖键盘按钮四态、编辑框两态、设置外框、开关四态；这不等于原生整页、所有字号、所有屏幕倍率或所有字体已经逐像素校准。实际命令执行、剪贴板、TTS、过滤、联机、游戏状态和物理控制器接入由应用负责；demo 只展示本地 UI 状态。
