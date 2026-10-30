# NPC：对话、编辑与复用部件

NpcDialogue提供student交互 /worldbuilder对话输入，NpcEditor组合basic /advanced /dialogue与maximized编辑；NpcActionEditor、NpcSkinPicker及NpcPortrait可独立复用。角色与权限来自宿主，不执行NPC命令、打开URL、写世界或生成角色模型。本轮布局与展开恢复修复后的44项客户端合同、React18 /19实际包消费和64项公开辅助检查已通过，不代表原生整页像素认证。

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

`NpcEditorValue` 含name、dialogue、skinId和actions；变更detail说明field、edit /add /delete原因及可选actionId /actionField /event。使用稳定id组织skins和actions，受控宿主决定是否接受请求。皮肤网格维数来自源动态binding；当前正常pack默认五列，显式columns /rows优先。这个有限pack选择不等于引擎固定网格数或所有分页binding已恢复。

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

独立使用NpcActionEditor时，展开视图在自身范围内预留21逻辑单位的Web按钮栏，正文最少169单位，总最小高度190；不要求宿主加负向外溢padding才能点击Minimize。组合进NpcEditor后仍使用源169单位正文与外层关闭栏。NpcSkinPicker的独立根不带源父布局偏移；后续Basic原生测量也否定了将左移1 /上移10直接套到父stack子项的做法，当前移除该位移，嵌套按钮自身offset仍保留。

## 固定源与素材

来源为官方 `v1.26.60.5` 的完整 `resource_pack/ui/npc_interact_screen.json`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。teacher源框325×200，student源为320×content的form-fitting框，不合并成同一个固定高度。basic /advanced /maximized、skins、action command /URL、student /worldbuilder及education条件各有独立节点 /binding。

student的嵌套百分比content sizing通用算法尚未恢复。`NpcDialogue.layout`（组合中为`NpcEditor.dialogueLayout`）允许覆盖`NpcDialogueLayout`的contentTop、contentInset、titleTop、bottomPadding，当前Web默认依次24、8、9、8逻辑单位；这不是已恢复的引擎form-fitting公式，不用截图半点拟合代替来源。educationEdition、readerVisible与onReaderRequest只提供Immersive Reader入口请求，不启动SDK或进程。

十张新增完整原PNG、两份原metadata与原LICENSE（13个原件）见 [npc-assets.json](npc-assets.json)。复用资源保持各自来源；部分复用编码仅RGBA一致，不声称完整PNG字节相同。Banners仅作皮肤选择 /模型窗装饰，不能冒作人物图。NPC两条URL通知分支用warning，不能因共享通知模板声明了info /update /error就声称这些状态也在本屏实例化。

```sh
python scripts/prepare-npc-assets.py --check
```

原图保留Mojang原权属与EULA，不按库代码MIT重许可。静态JSON、源材质与Web模型均不认证真实3D人物、活动路由 /权限、控制器焦点图、字体 /clip /光栅或完整native GUI；没有以来源身份替代原生像素验收。

## 原生来源与本轮布局校准

已保存真实basic GUI5捕获C14，原件与分析副本SHA256均为`fb27337a5824591a580e17f4db3854a4d9e0918b8716739844ec6f3977a24ba8`，见`.cache/npc-native-01/capture14.json`。WGC观察图为2560×1400，实际提取的native UI target为2570×1402；后者完整RGBA与原row-padded资源逐行字节一致，见`.cache/npc-native-analysis-01/FINAL.json`。WGC仅用于几何观察，不冒作raw RT oracle。人物虽已定位五个skinned draw并整理输入，真实actor renderer仍未完成。

`.cache/npc-basic-raw-study-01/FINAL.json`独立复核了Picker未偏移的父stack分配、正常pack五列及Dialog /Advanced的20单位父流和内部+1 /+2偏移：banner /Dialog /Advanced的相对顶部为97 /66 /164，Appearance墨迹与banner相隔10物理像素。raw Advanced宽46单位，纠正此前WGC估计45；文案宽依赖字体，不硬编码为宿主宽度断言。本轮DOM与公开截图已确认Appearance完整可见，五个宿主示例文本不再被遮挡，仍不等于人物渲染完成。

原生raw与完整原图正常nine-slice的有限源平面比较中，外框周边、两个按钮边缘、selected白框及四个未遮挡Banners区域严格RGBA零差；input边缘仍留60像素、close仍留90像素差异。这是原图到原生target的特定区域核对，不是Web整图比较，不以区域零差冒称整UI零差，也不推断唯一采样 /UV算法。

`.cache/npc-secondary-native-study-01/REPORT.md`记录empty worldbuilder的320×140外框、80×97人物区与222×97气泡；140高度只属于这一状态，`%c /%cm`通用算法、相对纵向位置和字体paint仍未知。当前layout四个Web默认保持24 /8 /9 /8，不拟合单帧的半点或补3单位来凑高度。

两个Advanced fit状态均观察到301单位卡片 /Add Command宽度；源可能对应隐藏bar参与尺寸或touch contained分支，尚不能决定引擎自动收起规则。实现采用有限Web策略：fit时不留空轨、卡片301；overflow时预留9单位槽位、卡片292。帮助文案按源intrinsic wrapper居中，并计入未绘制TTS边框的+5尺寸参与；两行正常10+12+10自然得到32，再由父尺寸37居中，Add Command顶部76，不固定帮助高度来凑截图。该Web布局及fit /overflow切换已经本轮验证；原生溢出状态、教育换行和单命令卡片106高度的完整规则仍未恢复。

## 人物渲染增量

`createNpcEntity`＋`GuiLayer`现提供有限NPC原模型、folded-idle与60张原皮肤，可作为现有人物槽传入。公共组件数仍140，数据 /函数增加至156个运行时值；正常相机、自动取景和UI到variant绑定仍由宿主处理或待恢复。实体14项、相关旧渲染77项、最终156值React18 /19包与五个原生整裁剪255,200像素RGBA零差各自按实际身份记录在[GUI_ENTITY_QA.md](GUI_ENTITY_QA.md)，不替代下述NPC布局44项或完整原生GUI认证。

## 首阶段验证

第二完整批44项全部通过（18 desktop /18 mobile /8 pixels），35.736005秒，0 skip /retry /flaky /reportErrors，797个选定输入前后字节不变。覆盖独立展开在普通局部横向滚动下的按钮可点击性、同一textarea ref与selection、Teacher关闭位置[302,1]和展开正文309×169、Picker独立原点与Editor的父布局偏移，以及readOnly与字体监听清理。8,892个完整POINT平面RGBA像素零差属于Web源图 /布局合同，不是Minecraft原生整页认证。

独立结果为`.cache/npc-independent-qa-01/formal-02/FINAL.json`（SHA256 `775207edaf4a84a3f94d84bffdf763b00fd53c7bd512e6b2c42a4b3c712a6f58`）。[覆盖表](BEDROCK_GUI_COVERAGE.md)只将npc_interact_screen.json更新为有限命名族A，其余205行不变。当前140组件 /154运行时值包含这五个组件，旧ServerForms /Book通过数不转移为NPC通过。

首轮44项实际为37通过 /7失败，原报告保留在`.cache/npc-independent-qa-01/formal-01`。其中两项发现独立展开编辑的Minimize位于上方−21、被普通横向局部滚动容器裁切；阶段02只改CSS，将其收入组件自身按钮栏。其余五项为测试对hidden模板计数、挂载后才传default值以及隐藏Minimize选择器匹配的错误假设。第二批完整复验通过，不累计首批通过数，也不把源码算术检查当作原生验收。

旧ServerForms整37项与原导航整6项分别实测通过，0 skip /retry /failure /reportErrors，798个选定输入前后不变；旧三份测试源未改。两批各自保留在`.cache/npc-integration-regression-01/EXECUTED-FINAL.json`，不混成NPC新增用例数。

`npm run verify:package`真实安装新tar到React18.3.1与19.3.1消费者：140组件 /154值、ESM /SSR、strict TypeScript、样式 /素材 /许可全部通过，两消费者各369个dist文件与构建逐字节相同，792个产品输入不变。依据`.cache/npc-root-close-01/PACKAGE-01.json`；这是文档收尾前的已测包，最终文档包须另与其非文档payload核对，不预填最终tar身份。

公开`#npc`首批56 /56辅助检查通过（30.458秒，未执行0），不加入正式用例数。792产品输入 /369dist /59site前后不变，59实际HTTP响应与site文件逐字节相同，27个独立原PNG及CSS绑定同源；name /dialogue /command有限CDP样本实际只用MCBE Classic。page /consoleError /HTTP /request错误与取消均0，保留四条ReadPixels性能warning。独立detached GL诊断为SwiftShader /Vulkan，不把它说成每个CSS平面的GPU路径或NVIDIA验收；actor示例仍是宿主节点，不执行外部服务。结果`.cache/npc-public-01/production-01/FINAL.json`（SHA256 `1aafb12186d1e8d60a9f7c61f1b744d86be99b0eb7046aceceeeb28af2f27b6b`）。原生actor、student controller高度、字体采样及完整GUI仍待独立恢复与像素比较。

## 本轮验证与保留失败

最终formal04完整44 /44通过（18 desktop /18 mobile /8 pixels），34.392768秒，0 skip /retry /flaky /reportErrors，792产品输入加5项测试输入前后不变。Basic两scale的行位置 /label gap /按钮命中 /默认五列均验证，居中只允许浏览器1 /64 CSS像素布局量化；8,892个独立POINT平面像素仍严格RGBA零差，不放宽像素阈值。Advanced覆盖empty→single→五项overflow→empty，并加入同一viewport展开→缩回→End /Home生命周期。依据`.cache/npc-native-layout-qa-01/formal-04/FINAL.json`（SHA256 `a262c54663f4bfdb390b57222d230c6f1739596c8f7920951b51003c316f338e`）。

本轮前批43 /1的中心断言失败保留；实际162.49609375与理想162.5只差浏览器布局量化。后续formal03的44通过也保留其当时范围，不能替代展开恢复验收。公开rev02先完成47项，随后End轮询失败、后17项未执行；诊断确认max时写overflow shorthand后，缩回移除它未正确恢复两轴，computed仍为visible，滚动失效。产品只改为两条overflow longhand，最终formal04实测同一viewport恢复hidden /auto、End511及Home0。原失败与诊断`.cache/npc-native-public-01/diagnostic-01/FINAL.json`完整保留，不拼接中间通过项。

修后`PACKAGE-02.json`位于`.cache/npc-native-layout-root-01`：React18.3.1 /19.3.1实际安装消费者的140组件 /154值、ESM /SSR、strict TypeScript、样式 /素材 /许可均通过，各369个dist文件与构建逐字节相同，792产品输入不变。PACKAGE-01为展开恢复修复前身份，保持历史；最终文档包须另与PACKAGE-02的非文档payload核对，不预填最终tar哈希。

公开rev03完整64 /64辅助检查通过，35.035秒，未执行0，不增加正式用例数。五卡片同一viewport展开 /缩回后hidden /auto，End916 /Home0；59实际HTTP响应、27个独立原PNG绑定及792产品输入 /369dist /59site身份全部一致。name /dialogue /command有限CDP样本仅MCBE Classic，page /consoleError /HTTP /request错误与取消均0，四条ReadPixels性能warning保留。依据`.cache/npc-native-public-01/rev03/FINAL.json`（SHA256 `bc5f4faef9dec6992b8ca9a8092b69cfc1960b3861c0f0dc8ab935a70c24ab0b`）。独立GL诊断仍为SwiftShader，不能认证每个CSS平面或跨GPU；宿主actor槽、字体采样、student controller /formfit及完整原生GUI仍有独立缺口。
