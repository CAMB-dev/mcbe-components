# ServerForms：动作与自定义表单

`ServerActionForm` 对应源LongForm的动作列表，`ServerCustomForm` 对应schema驱动的CustomForm。它们是宿主控制的Web表单，不是ServerList，不连接服务器、发送协议响应或执行服务器动作；本范围不提供第三种MessageForm。

## 使用

```tsx
import { ServerActionForm, ServerCustomForm } from 'mcbeui';
import 'mcbeui/styles.css';

function Example() {
  return <>
    <ServerActionForm title="Choose a destination" body="Select an action."
      rows={[
        { id: 'heading', type: 'header', text: 'Travel' },
        { id: 'line', type: 'divider' },
        { id: 'home', type: 'button', text: 'Home', icon: { state: 'none' } },
      ]} onAction={(id, detail) => console.log('宿主动作', id, detail.index)} />
    <ServerCustomForm title="Preferences" fields={[
      { id: 'name', type: 'input', label: 'Name', defaultValue: 'Alex' },
      { id: 'sound', type: 'toggle', label: 'Sound', defaultValue: true },
      { id: 'level', type: 'slider', label: 'Level', min: 0, max: 10, step: 1 },
      { id: 'mode', type: 'dropdown', label: 'Mode', options: [
        { value: 'survival', label: 'Survival' },
        { value: 'creative', label: 'Creative' },
      ] },
    ]} onSubmit={accepted => console.log('宿主提交', accepted)} />
  </>;
}
```

两者是inline section，root ref为HTMLElement。必填title，size默认[225,200]逻辑单位、scale默认2且为正安全整数；宿主管理显示、路由与提交后的关闭。`closeVisible` 控制图标可见性，`closeEnabled` 控制Close /Escape可用性，二者仍受全局disabled约束；readOnly限制值和动作，不等同禁用关闭。`onCancel` 报close /escape意图，不自动提交或断开连接。

## Action四种row

rows支持button /label /header /divider，id必须非空且唯一。button可独立disabled，所有row可用visible隐藏。`onAction(id,{row,index,event})` 的index是原rows数组位置，包含非button及隐藏row，不当成恢复的服务器协议索引；row提供副本。`body` 是独立文本，label /header也保留语义。

icon显式为none /loading /ready。loading由宿主切入并可单独控制visible；ready提供完整URL。`onIconError` 只报告失败，不自动改宿主状态或假造替代图片。完整loader纹理复用系统资源，静态CSS步进是宿主呈现合同，不恢复原生下载状态机或时钟。

## Custom九种field与typed值

fields支持以下九种type。所有id必须非空且唯一；options的value也必须唯一。`value` / `defaultValue` 为id到typed值的映射，`onValueChange(next,{id,type,event?})` 报告请求；不把全部输入转成字符串或把数字index当服务器packet。

|type|值与范围|
|---|---|
|label /header /divider|静态内容，不生成值条目。|
|input|string draft，默认空；默认HTML maxLength100，可由inputProps显式覆盖，不做引擎字符类别或命令解析。|
|toggle|boolean，默认false。|
|slider|有限number；schema须给min /max /positive step，未给默认值时取min。|
|step_slider|string option value，显示对应label；不是对外暴露的步进index。|
|dropdown|string option value；未给默认值时取首个非disabled option或空串。|
|multiselect|readonly string[]，默认空；展开状态与选择值分开。|

受控宿主决定是否接受；submit /cancel读取已接受值并复制数组，隐藏字段仍按schema保存值，静态field不进入输出。动态重排请保持稳定id；类型变化不靠字符串强制转换修补，错误typed值与无效schema会显式拒绝。

`submitVisible` / `submitEnabled` 与字段enabled条件分开。multiselect支持expanded /defaultExpanded与 `onExpandedChange(id,next,event)`，headerDisabled也与选项disabled分开。inputRefs指向真实input /toggle /slider，dropdownRefs及multiselectRefs指向真实trigger，optionRefs按field id与option value指向checkbox。表单不据此模拟服务器验证、权限或结果packet。

## 来源与呈现边界

固定来源为官方 `v1.26.60.5` 的 `resource_pack/ui/server_form.json`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。源LongForm /CustomForm框为225×200，滚动cross为7，区别于其他编辑器的9；共用真实ScrollArea，隐藏浏览器滚动条，不复制一份隐藏输入维持值。

只有提供tooltip内容的editable field才添加信息入口。原图与条件分支复用既有tooltip背景 /infobulb，按above /below使用两张原chevron；hover /focus /click与viewport避让是明确Web策略，不是已恢复的原生触发 /定位算法，实际控件与ref不被移入tooltip。

说明入口与字段可编辑性是独立条件。源info的enabled关联two-line布局、focusEnabled为true，并不由字段enabled推导；本Web合同在global disabled /readOnly或单字段disabled时仍允许阅读tooltip，但阻止值变更、动作 /submit及global disabled时的Close /Escape宿主请求。提供说明不代表这些变更能力恢复；field.visible=false时说明入口隐藏、popup关闭，卸载时清理其监听。不能把disabled概括成“所有UI均不可交互”。

新增3张完整原PNG（divider与两chevron）、1份原metadata及原LICENSE见 [server-form-assets.json](server-form-assets.json)。完整640×8 loader复用系统token；generic dropdown与源PNG的编码字节不同、完整解码RGBA相同，不能称whole-PNG字节相同。原图保留Mojang权属和EULA，不按代码MIT重许可。

```sh
python scripts/prepare-server-form-assets.py --check
```

静态源 /原图身份与typed状态模型不认证活动服务器协议、原生整页像素、所有controller /locale或真实OS IME；客户端与包结果应按实际执行范围另记。

## 已验证范围

第四完整37/37通过（desktop15 /mobile15 /pixels7），28.676959秒，零失败 /跳过 /重试 /flaky /report errors，927项root加5 harness前后无变化；canonical `.cache/server-forms-independent-qa/formal-04/FINAL.json`。typed状态、受控拒绝 /动态schema、真实refs与输入、disabled可读说明但不发变更请求、隐藏 /卸载清理及Escape生命周期均实际覆盖；这些仍为Web /原图host合同，不是native页面或真实OS IME认证。

前三批原报告保留：33 /4包含真实重复hover重置ready却未重新定位的产品问题与SSR属性大小写harness错误；随后两批均35 /2，分别为缺少源依据的“disabled必须隐藏tooltip”假设，以及审计工具漏计bubble focusin。后两项修测试合同 /审计，不为通过而再改产品；最终完整37重新执行，不累计前批通过数。

当前135组件＋4数据＋10函数＝149值已实际通过React18.3.1 /19.3.1包消费；修ready后的stage包又实际离线安装两消费者，ESM /SSR /strict TypeScript及各355dist逐字节一致通过，见 `.cache/server-forms-root-close-01/INTEGRATION-PACKAGE-05.json`。初始包属于ready修复前身份，不代替当前源验证；最后prose包需另做身份比较，不预先登记未执行的成功。

公开phase02完整64/64辅助通过，31.142秒，计划内后续未执行项为0；927输入 /355dist /59site前后不变，59个HTTP站点响应逐字节一致，12个实际资源绑定 /11张唯一whole PNG同源。该公开popup只显示当时选中的一侧chevron，另一侧仅有静态pin；两侧的正式host合同在37项中的7 fidelity独立覆盖，不能写公开两侧都已绘制。

CDP所测真实name input使用Classic；公开页码autoHan /forcedUnicode使用Unicode，inherit /forcedLatin使用Classic，各为所测label的6glyph，且父级精确family继承 /无inline family、Reader正文隔离、原textarea节点 /选区和英语reset均检查。首公开53通过 /1失败是私有harness误拒合法fallback family字符串，后续未执行保留；修为源一致的父级computed family与marker /无inline检查，并加CDP实际face正控，不是产品bug，也不累计首批通过数。

公开page /consoleError /HTTP /request错误及取消为0，4条整页ReadPixels性能warning保留；见 `.cache/server-forms-public-focused-01/phase02/FINAL.json`。37正式、Book85与6导航、64辅助各保原范围，不等于全部GUI /后端协议 /native像素通过。
