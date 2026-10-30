# Jigsaw：拼图方块编辑

本页记录固定Bedrock Classic源的编辑器范围。目标是完整编辑表单与可复用优先级字段；组件提交的是宿主操作意图，不执行世界生成、结构序列化或方块写入。没有从Java界面引入Generate按钮或深度滑块。

## 使用

```tsx
import { useState } from 'react';
import { JigsawEditor, type JigsawValue } from 'mcbeui';
import 'mcbeui/styles.css';

function Example() {
  const [value, setValue] = useState<JigsawValue>({
    targetPool: 'demo:houses', name: 'demo:entrance', target: 'demo:road',
    finalBlock: 'minecraft:air', selectionPriority: '0', placementPriority: '-1',
    joint: 'rollable',
  });
  return <JigsawEditor value={value} onValueChange={next => setValue(next)}
    size={[320, 260]} scale={2}
    onDone={accepted => console.log('宿主验证并保存', accepted)}
    onHelp={() => console.log('宿主帮助')}
    onCancel={(_, { reason }) => console.log('宿主关闭', reason)} />;
}
```

这是inline `section`，不自行打开portal或关闭宿主页面。根ref为HTMLElement；`size` 是宿主已解析的逻辑viewport，默认320×260，scale默认2且为正安全整数。`labels` 可覆盖文案，`title` 可传ReactNode。按组件引入可使用 `jigsaw.css` 并加载基础控件、image /scroll-area的依赖样式；完整 `styles.css` 已接线。

`value` 接受完整draft，`defaultValue` 可提供初始部分字段；`onValueChange(next,{field,event})` 报告六个文本字段或joint变化。`inputProps` / `inputRefs` 按字段传原生属性与真实input ref；`jointRef` 是真实checkbox，`scrollViewportRef` 是真实viewport div。原生onChange可preventDefault以拦截该次修改；外部受控值仍是提交回调收到的已接受文本，不读取未接受DOM草稿。

`JigsawPriorityFields` 可单独复用，value仅含selectionPriority /placementPriority；根ref为fieldset，支持labels、inputProps /inputRefs、readOnly /disabled和scale。`fieldHeight` 默认32；完整编辑器对应 `priorityFieldHeight`，单位均为逻辑GUI单位。两者明确保留源16与host32的区别。

`onDone` / `onHelp` 接收已接受draft及点击事件；Back /Escape通过 `onCancel(value,{reason,event})` 通知宿主。编辑composition期间不发出这些操作，disabled阻止编辑和动作；readOnly保留阅读及宿主操作，不等同disabled。`jointEnabled` 由宿主提供，false时锁定开关；Web合同明确checked映射aligned、unchecked映射rollable，不宣称恢复引擎布尔绑定。

## 文本与宿主所有权

源表单依次为目标池、名称、目标名称、变为、选择优先级 /放置优先级，以及接点类型。六个文本字段均保留字符串draft和源 `maxLength:40`；空串、单独负号与未完成输入不应在每次按键时被解析、过滤或钳制。名称 /标识符 /最终方块的有效性由宿主验证。

选择与放置优先级的源数据类型为有符号int32，范围−2147483648…2147483647。保留字符串draft不等于已接受整数；宿主应在自己的提交流程中验证，不能把UI字段当无符号数或强制非负。接点枚举为 `rollable | aligned`，UI源只绑定toggle状态与动态文字，未证明checked到枚举的原生映射；任何显式Web映射应作为组件合同说明。

Done、Help、Back均交给宿主处理；源事件名不证明原生保存 /取消 /回滚算法。字体和本地化文字使用调用方已配置的资源，原图身份不解决任意输入字符覆盖。

## 源布局

来源是固定官方 `v1.26.60.5-full` 的 `resource_pack/ui/jigsaw_editor_screen.json` 及其common /settings依赖，commit `15701fa9c13923f12662984c32c124327e40e3d3`。以下尺寸为逻辑GUI单位，以宿主已解析viewport的W /H计算，不使用捕获矩阵或截图布局作为正常输入。

|区域|源声明与边界|
|---|---|
|页头|完整StoreTopBar，高23；标题位于[40,6]。fullscreen_header不消费传入的hollow3变量，不能另画一层整页hollow3。|
|滚动面板|W−16宽，top26，height H−72；hollow4外框，内部居中inset8，内容offset[4,4]。|
|滚动条|源5宽加两侧各2留白，总cross9；轨道图节点3宽、handle图节点5宽，隐藏浏览器原生滚动条。|
|footer|top H−46、高46；其中完整recipe_back_panel高40居中，Done与Help按钮高24。|
|一般字段|标题10＋输入22，随后buffer10；这不是普通TextField默认尺寸的自动认证。|
|优先级组|源wrapper确实声明高16，继承子内容却为10＋22。Web若分配自然32高以保持可用，应明确为宿主resolve，不将32冒作源常量。|
|接点组|标题10，row18、offsetX6，toggle30×16，标签gap2；disabled文字和可见性由宿主控制。|

主面板的H−72直接基于完整viewport H；不能先从H扣26，再重复计算。源screen背景alpha为.75，不套用Book /Sign的.4。原图复用与上述固定JSON均只提供来源依据；本GUI尚无原生捕获，未认证完整native画面、viewport取整、焦点 /控制器路由或pixel perfect。

## 原图与复验

新增四张完整原PNG为StoreTopBar、chevron_left、dialog_background_hollow_4、control；三份原始metadata与完整上游LICENSE一起保留。逐文件原路径、物理尺寸、raw SHA与切片见 [jigsaw-assets.json](jigsaw-assets.json)。页头、hollow4与control使用各自源切片，不把透明中心压成另一种通用倒角；footer与Help复用既有Crafting原图。轨道 /handle和输入 /toggle等已有皮肤也保持其独立来源。

```sh
python scripts/prepare-jigsaw-assets.py --check
python scripts/prepare-jigsaw-assets.py --check --reference .cache/references/bedrock-samples-v1.26.60.5-full.zip
```

第一条复验仓库原件，不依赖私有ZIP；第二条对固定官方archive做额外逐文件核对。素材保留Mojang原权属与EULA条款，原LICENSE随 `dist/assets/jigsaw` 保留，不随库代码重许可为MIT。完整素材字节一致不认证活动资源绑定或原生整页像素。

## 已验证范围

完整第二批27/27通过（desktop11 /mobile11 /pixels5），21.460806秒，零跳过 /重试 /flaky /report errors，875项选定输入pin前后不变。来源为 `.cache/jigsaw-independent-qa/formal-02/FINAL.json`。它认证真实draft /受控拒绝 /选择 /禁用 /合成composition、源几何及显式host POINT合同；不是原生GUI、真实OS IME或引擎joint绑定认证。

首批25通过 /2失败保留：harness的check强制checked，与受控拒绝应保持false不相容；改为click并核对aligned请求 /已接受rollable状态后完整重跑。产品、源几何和像素阈值未改。新React18.3.1 /19.3.1实际包消费通过128组件＋4数据＋10函数＝142 ESM值、SSR、strict TypeScript、样式 /素材 /许可，见 `.cache/jigsaw-root-close-01/package-verification-02.log`；首包验证因仍硬编码126 /140而失败，更新数量并保留精确导出名检查后通过，原记录保留。

整6项旧导航另通过，26.658229秒，870项选定输入加5 harness前后无变化。公开 `#jigsaw` 首个实际完整批38/38辅助通过，16.417秒：59个HTTP站点响应逐字节一致，6张原图从URL /registry inline来源核对完整字节，真实英文input的CDP字体为MCBE Classic，870source /336dist /59site均无变化。页面 /consoleError /HTTP /requestfailed /cancel为0，4条整页ReadPixels性能warning保留。记录见 `.cache/jigsaw-independent-qa/navigation-01/FINAL.json` 与 `.cache/jigsaw-public-focused-01/RESULT.json`；CPU binder先前对独立PNG路径的错误假设已保留，修为读取冻结registry的两张inline整图，不降低门槛。

27正式、6导航、38辅助分开记录，不加上首批已通过项；有限chevron364像素零差只属显式host POINT平面。最终文档包仍需独立非文档身份验证，本页不预先声称它成功；原生完整GUI、joint控制器映射、priority16的运行时resolve及真实OS IME仍未认证。
