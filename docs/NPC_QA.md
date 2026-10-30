# NPC：对话、编辑与复用部件

NpcDialogue提供student交互 /worldbuilder对话输入，NpcEditor组合basic /advanced /dialogue与maximized编辑；NpcActionEditor、NpcSkinPicker及NpcPortrait可独立复用。角色与权限来自宿主，不执行NPC命令、打开URL、写世界或生成角色模型。44项客户端合同、React18 /19实际包消费和56项公开辅助检查已通过；这些范围不代表原生整页像素认证。

## 使用

```tsx
import { useState, type ReactNode } from 'react';
import { NpcEditor, NpcDialogue, type NpcEditorValue, type NpcEditorPage } from 'mcbeui';
import 'mcbeui/styles.css';

function Example({ actor }: { actor: ReactNode }) {
  const [page, setPage] = useState<NpcEditorPage>('basic');
  const [value, setValue] = useState<NpcEditorValue>({
    name: 'Guide', dialogue: 'Welcome!', skinId: null, actions: [],
  });
  return <>
    <NpcEditor value={value} onValueChange={setValue}
      page={page} onPageChange={setPage} actor={actor}
      commandsEnabled educationEdition
      onClose={accepted => console.log('宿主保存 /关闭请求', accepted)} />
    <NpcDialogue title={value.name} value={value.dialogue} actor={actor}
      actions={[{ id: 'visit', label: 'Visit', kind: 'url' }]}
      onAction={id => console.log('宿主动作请求', id)} />
  </>;
}
```

这些是inline组合，宿主管理其显示和路由；onClose只是请求，不自动卸载。文案通过labels覆盖，actor是调用方ReactNode。不给actor时不生成NPC人物。官方源包含npc.geo.json、npc.animation.json及人物材质，但其真实renderer的camera、pose、material、scissor与native vertex尚未恢复；当前slot不等于原生人物渲染已完成。完整styles.css接线，按组件加载npc.css时也须加载基础控件、Image /GuiIcon与ScrollArea等依赖。

## 五个公共组件

|组件|值与宿主合同|ref|
|---|---|---|
|NpcPortrait|actor /variant skin或dialogue、size /scale；裁切 /装饰框不等于原生actor_portrait_renderer。|div|
|NpcSkinPicker|skins、value /defaultValue、onValueChange；page /defaultPage、onPageChange，columns /rows与cycleVisible由宿主明确。|div；buttonRefs按skin id|
|NpcActionEditor|value /defaultValue、onValueChange、state、commandsEnabled；maximized /defaultMaximized与onMaximizedChange，onDelete发已接受动作。|section；textareaRef /buttonNameRef /toggleRefs|
|NpcDialogue|value /defaultValue纯文本、onValueChange；worldBuilder /disabled /readOnly、actions /onAction与onClose；layout与reader请求独立提供。|section；textareaRef /scrollViewportRef /actionRefs|
|NpcEditor|value /defaultValue及onValueChange；page /defaultPage、maximizedActionId /defaultMaximizedActionId及独立回调，onClose接收已接受快照。|section；name /dialogue /action字段、skin按钮和viewport refs|

`NpcEditorValue` 含name、dialogue、skinId和actions；变更detail说明field、edit /add /delete原因及可选actionId /actionField /event。使用稳定id组织skins和actions，受控宿主决定是否接受请求。皮肤网格维数来自源动态binding，不把某个Web页数或columns /rows当成引擎固定数量。

## 文本、动作与展开

|值|源限制 /边界|
|---|---|
|name /buttonName|128，单行。|
|dialogue|1000，多行；student显示与worldBuilder编辑权限分别提供。|
|action text /maximized text|1024，多行；command与URL都是raw draft，不执行或自动导航。|
|buttonMode /onEnter /onExit|三个独立boolean，不擅自合成互斥enum或强制某个必须为true。|

长度映射为Web原生maxLength；不据此恢复native字符单位、敏感词、文本布局或复制时机。`NpcActionValue` 另有稳定id、kind为command /url及buttonName。`NpcActionState` 可独立给visible、文本 /按钮名编辑条件、mode /buttonName label可见性、删除 /展开条件和各toggle条件；URL的EmptyUri /InvalidUri由宿主给定，不靠猜测正则或网络探测产生。

`commandsEnabled`、`educationEdition`、`addButtonsEnabled`、helpVisible、pageVisibility及actionStates保留源主要分支，不能当作已恢复的游戏权限公式。teacher /student可见性与$is_worldbuilder也不是一个相同布尔值；Web可以选择一致的预设，但不反推引擎controller关系。

本Web合同让maximized与普通编辑实时绑定同一个已接受action draft；展开 /缩回发导航请求，不隐式提交另一份内容。原源使用collection action文本与global maximized缓冲区，实际引擎何时copy /commit尚未恢复；不能把Web live-bound策略称为相同缓冲算法。真实输入、ref与composition应由同一值所有者维持，具体浏览器和OS IME另验。

独立使用NpcActionEditor时，展开视图在自身范围内预留21逻辑单位的Web按钮栏，正文最少169单位，总最小高度190；不要求宿主加负向外溢padding才能点击Minimize。组合进NpcEditor后仍使用源169单位正文与外层关闭栏。NpcSkinPicker的独立根也不带源父布局偏移；原左移1 /上移10仅属于Editor的basic组合。

## 固定源与素材

来源为官方 `v1.26.60.5` 的完整 `resource_pack/ui/npc_interact_screen.json`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。teacher源框325×200，student源为320×content的form-fitting框，不合并成同一个固定高度。basic /advanced /maximized、skins、action command /URL、student /worldbuilder及education条件各有独立节点 /binding。

student的嵌套百分比content sizing尚无原生高度测量。`NpcDialogue.layout`（组合中为`NpcEditor.dialogueLayout`）允许覆盖`NpcDialogueLayout`的contentTop、contentInset、titleTop、bottomPadding，当前Web默认依次24、8、9、8逻辑单位；这不是已恢复的引擎form-fitting公式，不用截图半点拟合代替来源。educationEdition、readerVisible与onReaderRequest只提供Immersive Reader入口请求，不启动SDK或进程。

十张新增完整原PNG、两份原metadata与原LICENSE（13个原件）见 [npc-assets.json](npc-assets.json)。复用资源保持各自来源；部分复用编码仅RGBA一致，不声称完整PNG字节相同。Banners仅作皮肤选择 /模型窗装饰，不能冒作人物图。NPC两条URL通知分支用warning，不能因共享通知模板声明了info /update /error就声称这些状态也在本屏实例化。

```sh
python scripts/prepare-npc-assets.py --check
```

原图保留Mojang原权属与EULA，不按库代码MIT重许可。静态JSON、源材质与Web模型均不认证真实3D人物、活动路由 /权限、控制器焦点图、字体 /clip /光栅或完整native GUI；没有以来源身份替代原生像素验收。

## 验证状态

第二完整批44项全部通过（18 desktop /18 mobile /8 pixels），35.736005秒，0 skip /retry /flaky /reportErrors，797个选定输入前后字节不变。覆盖独立展开在普通局部横向滚动下的按钮可点击性、同一textarea ref与selection、Teacher关闭位置[302,1]和展开正文309×169、Picker独立原点与Editor的父布局偏移，以及readOnly与字体监听清理。8,892个完整POINT平面RGBA像素零差属于Web源图 /布局合同，不是Minecraft原生整页认证。

独立结果为`.cache/npc-independent-qa-01/formal-02/FINAL.json`（SHA256 `775207edaf4a84a3f94d84bffdf763b00fd53c7bd512e6b2c42a4b3c712a6f58`）。[覆盖表](BEDROCK_GUI_COVERAGE.md)只将npc_interact_screen.json更新为有限命名族A，其余205行不变。当前140组件 /154运行时值包含这五个组件，旧ServerForms /Book通过数不转移为NPC通过。

首轮44项实际为37通过 /7失败，原报告保留在`.cache/npc-independent-qa-01/formal-01`。其中两项发现独立展开编辑的Minimize位于上方−21、被普通横向局部滚动容器裁切；阶段02只改CSS，将其收入组件自身按钮栏。其余五项为测试对hidden模板计数、挂载后才传default值以及隐藏Minimize选择器匹配的错误假设。第二批完整复验通过，不累计首批通过数，也不把源码算术检查当作原生验收。

旧ServerForms整37项与原导航整6项分别实测通过，0 skip /retry /failure /reportErrors，798个选定输入前后不变；旧三份测试源未改。两批各自保留在`.cache/npc-integration-regression-01/EXECUTED-FINAL.json`，不混成NPC新增用例数。

`npm run verify:package`真实安装新tar到React18.3.1与19.3.1消费者：140组件 /154值、ESM /SSR、strict TypeScript、样式 /素材 /许可全部通过，两消费者各369个dist文件与构建逐字节相同，792个产品输入不变。依据`.cache/npc-root-close-01/PACKAGE-01.json`；这是文档收尾前的已测包，最终文档包须另与其非文档payload核对，不预填最终tar身份。

公开`#npc`首批56 /56辅助检查通过（30.458秒，未执行0），不加入正式用例数。792产品输入 /369dist /59site前后不变，59实际HTTP响应与site文件逐字节相同，27个独立原PNG及CSS绑定同源；name /dialogue /command有限CDP样本实际只用MCBE Classic。page /consoleError /HTTP /request错误与取消均0，保留四条ReadPixels性能warning。独立detached GL诊断为SwiftShader /Vulkan，不把它说成每个CSS平面的GPU路径或NVIDIA验收；actor示例仍是宿主节点，不执行外部服务。结果`.cache/npc-public-01/production-01/FINAL.json`（SHA256 `1aafb12186d1e8d60a9f7c61f1b744d86be99b0eb7046aceceeeb28af2f27b6b`）。原生actor、student controller高度、字体采样及完整GUI仍待独立恢复与像素比较。

## 截图复查后保留的原生校准项

公开截图 `npc-teacher-desktop.png` 中，Basic 的 Appearance 文案受到皮肤横幅覆盖；源声明中的偏移、层级与 stack 内容尺寸如何在原生引擎共同解算，仍需真实 NPC 页面采集确认。当前尺寸及原图用例不能证明这处可见排版已与原版一致，不以额外拟合偏移充当修复。

皮肤预览槽中的示例纯文本也可能被角色裁切区域挡住；当前并未实现原生人物绘制。后续应核对原生页面及 actor renderer，再完善宿主预览示例。以上属于尚未完成的视觉工作，不包含在 44 项客户端合同或 56 项公开辅助的通过结论中。
