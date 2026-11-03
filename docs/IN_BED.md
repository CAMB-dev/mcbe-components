# 睡眠界面与可复用操作区

`InBedScreen`对应固定官方源`in_bed_screen.json`，包含状态文字、起床／聊天按钮、背景及平台输入提示区。`InBedControls`可独立复用同一按钮行。新增两个真实命名组件，当前为270组件、8数据和14函数，共292个运行时值。

```tsx
import {InBedScreen, InBedControls} from 'mcbeui';
import type {InBedLayout, InBedControllerHandle} from 'mcbeui';
import 'mcbeui/in-bed.css';

const layout: InBedLayout = {
  size:[320,200], contentRect:[0,0,320,200], scale:2,
  font:{family:'monospace',size:8,lineHeight:10},
  buttons:[
    {size:[64,20],labelSize:[54,10]},
    {size:[72,20],labelSize:[62,10]},
  ],
  status:{origin:[50,105],width:220,
    alignment:'center',verticalAlignment:'center'},
};
<InBedScreen open={sleeping} layout={layout} label="Sleeping"
  status={sleepStatus} labels={{wake:'Leave Bed',chat:'Open Chat'}}
  inputHint={{visible:false}} controllerRef={controllerRef}
  onAction={detail => {
    if(detail.action === 'wake-up') requestWakeUp();
    else requestOpenChat();
  }}/>
<InBedControls layout={{...layout,rowHeight:30}}
  labels={{wake:'Leave Bed',chat:'Open Chat'}} onAction={handleRequest}/>
```

以上数字为示例宿主配置，不是通用原生字体度量。`size`为整个逻辑帧，`contentRect`为已解析安全区在该帧中的逻辑矩形；背景覆盖整帧，控制定位使用内容区。组件不读取DOM反推原生坐标，也不推测安全区provider、默认锚点、字体或`100%c`引擎求解结果。

## 源布局与样式

- 按钮行固定128逻辑单位宽、高为内容区15%，底中锚点与负15%偏移合成顶部70%位置；两按钮之间固定20单位。行内按声明顺序排列，不把两个按钮重新平均居中或挤压到128以内。
- `buttons`分别提供完整form-fitting外框与已解析的label尺寸。label源上限120×10；背景复用完整原始light按钮PNG与focus border，普通／悬停／按下／锁定保持独立。当前Web绘制采用外框1单位内缩、文字5单位偏移，按下文字下移1单位。
- 状态label固定49单位高；`status.origin`相对`contentRect`，宽度及水平／垂直对齐由宿主明确给出。字体family、size和lineHeight也为显式输入，不用字形包围盒替代原生布局。
- 输入提示继承源`death.a_button_panel`的全内容区宽、26高、底中负5%偏移。宿主提供`inputHint.visible`与平台glyph／说明内容，不按浏览器型号假定Xbox／PlayStation按键。提示与纯文字不拦截下方按钮的指针输入。
- 源背景为`textures/ui/White`、黑色、alpha0.5。当前以CSS黑色50%作显式Web映射；没有借此认证原生White材质、混合／矩阵或整屏像素。组件保留`data-native-certified="false"`。
- 声明尺寸用于实际渲染，帧外内容裁切且不创建内部滚动条。缩放为1…8整数；宿主负责选择合适的逻辑帧、内容区和文本尺寸。Pocket布局不由本组件认证。

库不分发新增私有字体、不绘制替代物品／按钮材质，也不增加新的公共资产集合。现有五种按钮／边框图来自原始资源并复用`ClassicSkin`。示例在`/#in-bed`提供全屏预览与独立操作区；示例背景是宿主提供的原始dirt纹理，并非游戏世界重建。

## 请求、焦点与生命周期

`onAction`只提交`wake-up`／`chat`请求，附固定`buttonId`、源控件、触发来源及可用的持久化事件。组件不修改游戏状态、不发送服务器消息、不自动关闭。宿主更新`open`决定界面是否仍存在。

`controllerRef`提供逻辑`request(command)`：

| 命令 | 行为 |
| --- | --- |
| `button.wake_up_button` | 起床请求 |
| `button.chat` | 聊天请求 |
| `button.menu_cancel`／`button.menu_exit` | 源全局映射到起床 |
| `button.menu_select`／`button.menu_ok` | 只激活当前聚焦的本操作区真实按钮 |

返回true表示逻辑请求已排队；后续失活或失去输入归属仍可取消它。DOM按钮／键盘请求另外尊重祖先的`preventDefault`。没有物理手柄轮询或平台服务调用。宿主提示中的控件不能伪装成起床／聊天按钮。

默认`modal:true`使用库的共同焦点／输入租约：打开时聚焦、Tab循环、关闭时恢复触发器，嵌套源模态和原生dialog阻止底层请求。Escape只在当前界面有效且未被默认阻止、无修饰键／输入组合／自动重复时映射到起床。`modal:false`适合宿主自管模态或内联展示。

`disabled`／`readOnly`阻止操作；`hidden`／`inert`及关闭状态撤销当前活动会话。控制器读取最新已提交回调，关闭后保留的句柄不会控制后续重开会话。普通状态更新不替换句柄，可安全使用稳定的React useState setter作为ref。按钮与根节点ref复用React18／19兼容清理机制。

`buttonProps`／`buttonRefs`按wake、chat分别传递原生事件、ARIA及ref。强制颜色模式显示系统色按钮与焦点边界。SSR无浏览器IO，关闭时返回空；未使用或关闭状态的布局声明仍做纯校验。

## 来源与验证范围

来源为官方`v1.26.60.5-full`、commit`15701fa9c13923f12662984c32c124327e40e3d3`。核对`in_bed_screen.json`、`ui_template_buttons.json`、`ui_common.json`、`death_screen.json`与`_global_variables.json`的整文件字节。`common.base_screen`将背景放在no-safezone层，内容经过safezone outer／inner矩阵；本组件因此要求独立`contentRect`，没有把两种范围合并。

五项Node检查通过；最终源浏览器45项通过，其中16项为新睡眠行为，29项为相邻Disconnect／共同生命周期回归。覆盖源码比例／间距／状态上限、背景Web颜色、无内部滚动条、安全区定位、真实Enter／Space／Tab／Escape、三层默认阻止、六种控制器命令、最新回调、关闭／重开及旧句柄拒绝、嵌套模态、伪装提示、StrictMode setter-ref、按下一次位移与强制颜色。

新增原生dialog回归先真实复现：两个原生modal叠加时，独立操作区因只检查第一个modal而接受了底层合成点击。随后改为按实际聚焦modal判断输入归属，最终同一用例及整个45项批次通过。原失败保留，没有修改预期或绕过测试。

源预览初轮桌面／窄屏通过、移动端失败。诊断时可见窗口412×839，但预览仍持有早前822×1672的尺寸；宿主改为打开时在layout effect测量实际固定容器，并用ResizeObserver跟踪。修后桌面、Pixel7与320px三项同批通过。该更改只在展示宿主，不把浏览器viewport读数注册为组件的原生默认布局。

最终源预览与生产预览分别3／3通过；生产预览使用修正后的独立Vite site构建。实际功能包02通过React18.3.1／19.3.1的完整既有包门禁、新组件SSR／关闭／错误声明及正类型／两个负类型合同。功能包为7,346,554字节，SHA256 `189a7bdf2c62533fa75d4df61c7e706424af2bc4384c1864e882c8da6890e9e0`。早期功能包01尚未拆分安全区范围，作为历史保留，不替代本轮资格。

另有真实默认Vite开发／生产四种安装消费场景，无源码alias或优化器替代。只导入`mcbeui/in-bed.css`，使用真实组件／React state setter ref／DOM根和按钮ref；每场景验证控制状态、最新回调、聚焦select、原生modal阻断、显式安全区、关闭与重开旧句柄拒绝和ref释放。初始焦点、聊天悬停、只读安全区三种完整640×400 Web平面，形成6对开发／生产比较，共1,536,000个RGBA像素全部相等。这是同一浏览器环境下的Web一致性，既不是原生Minecraft参考，也不认证其字体。另打开实际安装消费的PNG目视检查了初始平面；45项source回归和四种安装场景属于不同批次。

证据保存在`.cache/in-bed-screen-20261103-01/`的`SOURCE-IDENTITY.json`、`browser01/02/03/04.json`、`package01/02.log`、`demo-source01.json`、`demo-diagnostic02.json`、`demo-source03.json`、`demo-built01.json`和`installed01/RESULT.json`。检查时没有运行中的Minecraft进程；本阶段没有打开Computer Use、游戏或PIX，也没有新的睡眠原生帧。上述资格是具名源码／Web／交互验证，完整原生字体、intrinsic与默认锚点、安全区provider、材质、状态／比例／平台及整页像素仍未认证。计入范围清单的有限A不代表完整Minecraft覆盖或原生完成。
