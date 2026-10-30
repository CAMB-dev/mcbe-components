# Structure Editor与XYZ字段

`StructureEditor` 提供结构方块表单、宿主预览槽与操作回调，`XYZVectorInput` 独立复用三个真实文本input。它们不读取世界、不生成预览网格、不保存 /加载 /导出结构文件，也不执行文件选择器；这些能力由宿主接入。

## 使用

```tsx
import { StructureEditor, XYZVectorInput } from 'mcbeui';
import 'mcbeui/styles.css';

function Example() {
  return <>
    <StructureEditor defaultValue={{
      mode: 'save', name: 'demo:room', saveSize: { x: '8', y: '6', z: '8' },
    }} preview={<div>宿主预览</div>}
      onAction={(action, accepted) => console.log('宿主操作', action, accepted)}
      onCancel={(_, { reason }) => console.log('宿主关闭', reason)} />
    <XYZVectorInput label="Offset" defaultValue={{ y: '-1' }} maxLength={5}
      onValueChange={(next, { axis }) => console.log(axis, next)} />
  </>;
}
```

Editor是inline section，root ref为HTMLElement。默认 `size={[480,270]}` 是宿主嵌入viewport，不称为游戏固定画布；scale默认2、须为正安全整数。`value` 接受完整 `StructureEditorValue`，`defaultValue` 可逐字段 /逐XYZ轴提供初始部分值；`onValueChange(next,{field,axis?,event?})` 报告请求，受控宿主决定是否接受。动作回调拿已接受值的独立快照，不读取未接受DOM草稿。

## 字段与模式

模式为save /load /data /corner /export，是源UI角色名，不是引擎数值enum。`capabilities.dataSupport`、`export3dSupport` 决定是否提供对应选项，`filePickingSupported` 控制相关导入 /导出入口；声明支持不会自动获得系统或游戏能力。

|字段|宿主数据与边界|
|---|---|
|saveSize /saveOffset /loadOffset /exportSize /exportOffset|每轴均为raw string；size源maxLength3、offset5，不解析整数、钳制范围或转换坐标。|
|name|纯文本，源maxLength30；标识符有效性、路径与命名空间由宿主校验。|
|integrity /seed /data /animationTime|raw string，源长度分别64 /256 /256 /10；不推导完整数值解析或引擎限制。|
|rotation|由宿主 `rotationRange` 明确min /max /step的原始slider值；Web默认0…1、step1，不映射成度数。可给rotationFormat与rotationLabel。|
|redstoneSaveMode /animationMode|memory /disk及none /layers /blocks，模式语义与世界效果由宿主实现。|
|includeEntities /removeBlocks /waterlogging /showBoundingBox /mirrorX /mirrorZ|独立boolean，不从当前世界、模式或其他开关猜测条件。|

`visibility` 供给各源面板及renderer /boundingBox /cornerText等可见性，progress与progressBar可分别控制，`enabled` 控制字段，`actionVisibility` / `actionEnabled` 控制动作，`footerVisibility` 独立控制各模式footer组。`toggleStateVisibility` 可独立覆盖各开关off /on文字的可见性，不把显式源条件强制改写成boolean推导。`labels`、nameColor及字段原生props可覆盖文案 /样式。

Save /Load /Export /Export3d /Detect /Reset /Import /Help均通过 `onAction` 发意图；Back /Escape通过 `onCancel` 报reason。没有隐式提交、自动关闭、文件读写或世界操作。disabled与readOnly保留各自含义，composition防止正在编辑时误触操作；合成事件合同不等于真实OS IME认证。

这些动作不是每个模式都同时存在。Corner源footer不添加Reset，保留Help与宿主提供的两段说明；data /3D export和文件选择相关分支须按明确capability提供，不能凭mode名称推定平台支持。

## 可复用XYZ与预览

`XYZVectorInput` 必填label，value为 `{x,y,z}` 字符串，defaultValue可部分指定，默认三轴 `'0'`。root ref为fieldset，inputRefs按轴指向真实input，inputProps保留事件 /ARIA /样式；默认maxLength3，可为offset显式给5。回调为 `onValueChange(next,{axis,event})`，空串、负号与未完成数值由宿主保留 /验证，不擅自清洗。轴字段按源纵向排列，组自然高70是Web resolve，不将它冒作原百分比父布局已恢复。

Editor按字段 /轴提供inputRefs，另有dropdownRefs、toggleRefs、rotationRef及scrollViewportRef。`preview` 是调用方ReactNode，previewRef指向容器；`onPreviewTurn` 仅报告start /move /end /keyboard和deltaX /deltaY，不计算相机或修改结构。pointer delta使用事件坐标，方向键为离散单位，宿主自行解释。无preview时不绘制假世界。feedback、progress、cornerText与exportDisabledText也由宿主供给。

## 来源与还原边界

来源为固定官方 `v1.26.60.5` 的 `resource_pack/ui/structure_editor_screen.json`，commit `15701fa9c13923f12662984c32c124327e40e3d3`，结合common /settings /screen依赖。页头、hollow4、control、footer /Help等复用各自已核实原图；新增素材逐项身份见 [structure-editor-assets.json](structure-editor-assets.json)。原Mojang素材保留其许可，不按库代码MIT重许可。

本屏header传入的hollow3变量未被实例消费，不另加整页hollow3；源screen backdrop为.95，区别于其他编辑器。新增原图仅Rotate；源上传progress的empty /full /nub已有对应系统屏幕完整原图，初次经验条候选不作为新增素材或混用同尺寸generic Progress的依据。

此阶段以静态源布局和显式宿主输入为边界，未恢复原生 `structure_renderer`、turn相机算法、权限 /能力binding、全部平台布局或完整native像素。原JSON与图片来源不能代替真实游戏逐屏验收。

## 已验证范围

第二完整66/66通过（Structure32 /Command34），55.333951秒，零跳过 /重试 /flaky /report errors；909项selected输入无变化，按报告包括900 root与9 harness，未加载的4份Book QA输入独立排除。首批62通过 /4失败保留，不重复累计。canonical `.cache/structure-editor-independent-qa/formal-02/FINAL.json` 认证真实字段 /refs /宿主拒绝 /模式 /能力条件、源几何及whole-PNG CSS /POINT /tint合同，不是native整页零差或真实OS IME。

当前实际React18.3.1 /19.3.1包消费已通过133组件＋4数据＋10函数＝147 ESM值、SSR、strict TypeScript及样式 /素材 /许可；新源码02又实际安装消费者，349dist逐字节一致，见 `.cache/structure-editor-root-close-01/INTEGRATION-PACKAGE-02.json`。Book83与另6导航也分别实际通过，见 [BOOK_QA.md](BOOK_QA.md)，不重计为Structure新用例。

公开phase02完整64/64辅助检查通过，30.640秒：五mode /八action请求、XYZ /能力条件 /只读禁用 /重开reset /390px与Book独立host导航均实际执行。904输入 /349dist /59site前后无变化，59个HTTP站点响应逐字节匹配，7张完整原PNG来源字节一致；Rotate的.6只验证computed CSS绑定，CDP所测真实name input仅用MCBE Classic。page /consoleError /HTTP /network错误及取消为0，4条整页ReadPixels性能warning保留，记录 `.cache/structure-editor-public-focused-01/phase02/FINAL.json`。

66正式、Book83 /6导航与64辅助分范围保留；最后文档包仍由单独非文档身份比较确认，不提前登记未执行的成功。preview渐变方向、popup百分比布局、小viewport与真实字体栅格仍为明确Web候选，不由静态源或SSR替代原生验收。
