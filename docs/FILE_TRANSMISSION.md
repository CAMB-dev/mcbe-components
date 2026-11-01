# FileTransmission：文件传输源界面

`FileTransmissionScreen` 组合源 `file_transmission_screen`，内部保留固定 268×95 内容面板。`FileTransmissionPanel` 可单独嵌入界面，`FileTransferProgress` 可单独复用原始经验条纹理。旧的通用进度组件保持原有接口。

```tsx
import {
  FileTransmissionScreen, FileTransmissionPanel, FileTransferProgress,
} from 'mcbeui';
import type {
  FileTransmissionModel, FileTransmissionPresentationProfile,
} from 'mcbeui';
import 'mcbeui/fonts.css';
import 'mcbeui/file-transmission.css';
```

## 模型和布局

`model` 只包含本源族需要的 `runKey`、`disabled/readOnly`、`bindings`、`profile`、`stackLayout`、`materialPolicy`、`imageClipPolicy`、`onAction` 和可选的 `renderText`。不需要创建 Progress 路由、资源包或云状态。

十个显示绑定彼此独立：`singleTitleVisible`、`dualTitleVisible`、`uploadContentVisible`、`warningContentVisible`、`messageVisible`、`progressTextVisible`、`progressVisible`、`playVisible`、`cancelVisible`、`warningButtonsVisible`。库不会将它们转为工作流枚举；单/双标题、警告/传输内容和多组按钮都可能同时出现。源父子显隐仍生效，例如 upload 父级控制其内部消息、文字和进度条。展示页的场景按钮仅由宿主修改示例数据，不是组件的状态机。

六个文字绑定是 `singleTitle/leftTitle/rightTitle/message/progressSize/totalSize`。大小字符串和百分比独立，组件不会推算已传输字节、总量或单位。

`profile.availableSize` 定义完整逻辑画布，`scale` 为正整数。内部源面板为 268×95，标题区域为 `[7,7,254,10]`，正文为 `[10,23,248,30]`，按钮区域为 `[7,58,254,30]`。组件按照设置尺寸裁绘，不增加原生浏览器滚动条或假关闭按钮。

`stackLayout` 明确提供 `height/messageY/progressTextY/progressBarY` 与来源。源 stack 的三个声明行是 10、10、5 高，但隐藏行是否参与 `%c` 尚未恢复。展示页显式选择保留三行、总高25并居中，不把此规则称为原生默认。

## 独立显示参数和字体

`FileTransmissionPresentationProfile` 只需要以下字段：

- `availableSize/scale`。
- `fonts.title/progress/button`，各含字体族、逻辑字号、行高和 provenance。
- `measurements.singleTitleWidth/leftTitleWidth/rightTitleWidth/messageWidth/progressSizeWidth/totalSizeWidth/warningHeight`。
- `labels.play/cancel/continue/mobileDataWarning/progress`。
- `bodyColor/titleColor/provenance`，以及 `textPolicy:'explicit-host-font-no-shadow-web'`。

展示页等待实际的开放字体 `MCBE Pixel` 与 `MCBE CJK` 加载，再用 Canvas 测量文字宽度与警告换行。它们是明确的开放字体替代，不是捆绑的原版字体，也不证明原生字形栅格、default anchor 或未声明阴影已恢复。可用 glyph-only `renderText` 处理 title/progress/button 三个角色；布局、源控件和可访问文字由库保留。

`materialPolicy:'explicit-common-hollow2-and-light-web'` 明确声明未限定 namespace 的 hollow2 与按钮状态在 Web 中如何解析。运行时使用完整原始 PNG 与九切片元数据，不使用界面截图或自绘资源。背景与平台标题通过 Screen 的 `baseLayer/titleArt` 显式传入；示例选择蓝灰色宿主底层和完整普通标题图，不声称它们是所有平台、教育版或原生根画面的默认提供者。

## 请求和宿主接纳

`onAction` 提供真实 `control`、事件（有原生事件时）、`runKey`、`sourceControl`、`origin` 与精确目标：

| 控件或逻辑输入 | 目标 |
| --- | --- |
| 开始 | `button.file_upload_play` |
| 单独取消或警告取消 | `button.file_upload_cancel` |
| 警告继续 | `button.file_upload_wifi_warning_continue` |
| 根取消 | `button.menu_exit` |
| 左/右逻辑 tab | `button.menu_tab_left` / `button.menu_tab_right` |

语义回调延后到 owner window 的任务，在原生事件传播完成后重新检查会话、连接、禁用、只读及控件有效性。`onNativeClick/onNativeKeyDown` 可以先调用 `preventDefault()`，后续 document veto 同样可使原请求失效。宿主回调可返回 `false`；组件不乐观更新显示绑定，也不自动传输文件、打开世界、访问网络或处理资费。

`readOnly` 阻止按钮修改请求，保留根取消出口。`controllerRef.request('button.menu_cancel')` 是逻辑请求，映射为 `button.menu_exit`；左右 tab 同样是明确逻辑输入，不推断硬件按键。

Screen 使用模态焦点边界，打开时记录外部触发点，关闭后恢复焦点。Panel 是可独立嵌入的内容，不注册根级取消映射。展示页将 Screen 放在宿主 body portal 中，保留整数倍率和完整画布；点画布外空白处通过 controller 发出取消。极小视口只滚动宿主容器，不改变源 GUI。

## 进度条

```tsx
<FileTransferProgress width={248} scale={2}
  percentage={fraction} visible={true}
  imageClipPolicy="visible-fraction-web"
  label="文件传输进度" />
```

比例必须是有限的 0..1，不自动取整或 clamp。`visible-fraction-web` / `left-removal-web` 是两种明确的 Web 裁剪解释，不代表原生 `clip_ratio` 已恢复。nub 保持源纹理平铺，不跟随百分比移动。

本源族仍有未恢复的字体、原始 default 布局、平台标题与引擎提供者边界。源结构、原图材料的局部验证、Web 交互、包消费及整页原生校准属于不同证据范围；公开组件和展示页不构成原生整页 pixel perfect 声明。

颜色支持受限且可在SSR校验的CSS形式：3/4/6/8位hex、逗号rgb三通道／rgba四通道，以及空格rgb三通道加可选slash alpha。数值必须有限；无效颜色在任何glyph回调之前拒绝。所有字体、文案、测量与来源字段都预先校验，包括当前隐藏的分支。

Screen/Panel的scale为1…30整数，完整画布面积乘scale²最多16,777,216像素；独立进度条允许1…64整数，条宽至少10逻辑单位且物理宽不超过8192。测量宽度允许0，以保留空文字的真实测量结果；当前可见文字的宽度仍不能超出源父区域。
