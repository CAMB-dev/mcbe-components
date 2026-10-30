# Command Block：命令方块编辑

`CommandBlockEditor` 组合双栏表单、命令输入和历史输出；`CommandInput` 与 `CommandOutputPanel` 可独立复用。它们保留真实input /textarea及宿主数据所有权，不执行命令、读取剪贴板、写世界或模拟红石。

## 使用

```tsx
import { useState } from 'react';
import { CommandBlockEditor, type CommandBlockValue } from 'mcbeui';
import 'mcbeui/styles.css';

function Example() {
  const [value, setValue] = useState<CommandBlockValue>({
    hoverNote: 'Greeting', command: 'say hello', tickDelay: '0',
    blockType: 'impulse', condition: 'unconditional', redstone: 'needs_redstone',
    executeFirstTick: false, trackOutput: true,
  });
  return <CommandBlockEditor value={value} onValueChange={setValue}
    previousOutput="" previousInfo={{ blockType: 'Impulse' }}
    onPasteRequest={accepted => console.log('宿主粘贴请求', accepted)}
    onClose={(accepted, detail) => console.log('宿主验证 /关闭', accepted, detail.reason)} />;
}
```

`value` 为完整8字段值，`defaultValue` 可指定初始部分字段。`onValueChange(next,{field,event?})` 只报告修改意图；Combobox变更没有原生input ChangeEvent。受控宿主拒绝更新时，操作回调仍收到已接受值的副本。以下Web初始值不称为引擎默认规则。

|字段|值与边界|
|---|---|
|hoverNote|真实文本，默认空；源maxLength15，表示悬停说明而非方块标识符。|
|command|真实textarea，默认空；源maxLength32500。非composition的Enter被阻止；导入或粘贴的换行不自动改写。|
|tickDelay|默认 `'0'` 的raw string，源maxLength5；不推导NumberChars精确字符集合或数值上下界，由宿主校验。|
|blockType|impulse /chain /repeat，Web默认impulse。|
|condition|conditional /unconditional，Web默认unconditional。|
|redstone|always_on /needs_redstone，Web默认needs_redstone。|
|executeFirstTick /trackOutput|boolean，Web默认false /true；不从当前模式猜测可用性或历史输出。|

`enabled` 可分别限制8字段，`firstTickEnabled`、`pasteEnabled`、`charLimitWarning` 等独立源条件由宿主供应。warning不按命令长度自动计算。`cancelEnabled` 与 `trackOutputEnabled` 是两个独立body控制，均默认true；若需同一个宿主binding，可给两者相同值。Header Close /Escape独立于这两个flag，没有 `closeEnabled` 属性。

`onClose(value,{reason,event})` 的reason为cancel /close /escape，不自行保存、回滚或关闭宿主页面。`onPasteRequest` 只请求宿主粘贴，不调用clipboard API。`previousOutput` 和 `previousInfo` 是独立历史快照，trackOutput切换不清空已有输出，修改当前三enum也不伪造之前模式。`blockTypeIcon` 由宿主提供，源动态图标binding未恢复为固定enum→PNG映射。

## 复用、输入与展开

`CommandInput` 只管理命令字符串，`onPasteRequest` 接收已接受command；`expanded` /defaultExpanded和onExpandedChange报告maximize /minimize /escape。compact与expanded保持同一个真实textarea，CSS调整布局，保留ref与选择；composition期间暂缓视图切换。Escape在展开时先请求缩回，Enter不执行命令。展开不是第二份草稿或提交动作。

`CommandOutputPanel` 接收previousOutput /previousInfo，支持受控或defaultTrackOutput与onTrackOutputChange；输出使用只读pre。root ref为div，outputRef指向pre，trackOutputRef指向真实checkbox。完整Editor的root ref为section，另有真实textareaRef、两文本inputRefs、三dropdownRefs、firstTickRef、trackOutputRef及左右scroll viewport refs。

Editor默认viewportSize为[400,300]，默认scale2且为正安全整数；桌面候选panel按 `min(viewport−4,[370,viewportHeight−50])` 求值并居中，`panelSize` 可由宿主显式覆盖。它是inline组合，外部路由、背景与显示生命周期由宿主管理；完整styles.css已接线，单独引入command-block.css时须保留基础控件 /combobox /image /scroll-area等依赖样式。

## 源布局与素材

来源为固定官方 `v1.26.60.5` 的 `resource_pack/ui/command_block_screen.json` 及common /settings依赖，commit `15701fa9c13923f12662984c32c124327e40e3d3`。此屏的common_panel确实消费hollow3背景及control underfill，与Jigsaw fullscreen_header不同。

|区域|逻辑源范围|
|---|---|
|左右栏|左[8,23]、宽.4W−8；右[.4W＋5,23]、宽.6W−13；高均H−31。|
|divider|[.4W,22]、5×(H−29)，可见性由宿主给定。|
|滚动条|源5＋两侧各2，cross9；两栏真实滚动独立。|
|命令行|源高30，Paste /Maximize各30；编辑内容与展开共享同一值。|
|展开|top23、[W−16,H−31]；Header Paste /Minimize与body按钮分开绑定。|
|Header Close|holder18×16、继承hitbox21×21、图面15×15分别保留，不能混为一种尺寸。|

新增6张完整原PNG、2份原metadata与原LICENSE见 [command-block-assets.json](command-block-assets.json)。Paste /Plus图标、Book三态Close与Jigsaw control复用既有完整原图，不重复创造素材；原资源仍属Mojang并遵循其EULA，不按代码MIT重许可。

```sh
python scripts/prepare-command-block-assets.py --check
```

可加 `--reference` 对固定官方full ZIP复验。原图及静态JSON不证明活动引擎binding、真实OS IME、展开光栅或完整native GUI；本屏尚无原生捕获像素验收。

## 已验证范围

初始完整32项及公开02的61项保留为glyph tint修正前的受测范围。随后发现source `glyph_content_panel` 的颜色未传到Plus：仅修CSS，Plus默认.3、hover /focus /active为1、locked为.7；Paste保留源override默认1、locked.7，原PNG不变。

修后首个完整33/33通过（desktop13 /mobile13 /pixels7），32.156684秒，零失败 /跳过 /重试 /flaky /report errors，893项选定输入加5 harness前后无变化；来源 `.cache/command-block-independent-qa/glyph-tint-03/FINAL.json`。原32项未改，仅增1项源tint检查；Plus三态完整1,452像素严格RGBA0，host不透明RGB为76 /255 /178。原Minimize三态5,292像素零差也保留，均为显式CSS /POINT宿主合同，不认证native tint量化或原生GUI。

131组件＋4数据＋10函数＝145值API未变。初次React18.3.1 /19.3.1完整包消费记录保留在 `.cache/command-block-root-close-01/package-verification.log`；tint新构建的实际离线tar安装、ESM /SSR smoke /strict TypeScript与两消费者各346dist逐字节一致又通过，见同目录 `TINT-PACKAGE-03.json`。此前tar属于before-tint身份，不用于替代新样式验证。

Book80项与6项导航的受测源 /字体 /BookCSS未变，原范围见 `.cache/command-book-regression-01/FINAL.json`，不称为tint后重新执行。公开 `#command-block` 新03完整61/61辅助通过，29.905秒，893输入 /346dist /59site前后无变化，59个实际HTTP站点响应逐字节匹配；11张原图的实际CSS绑定 /img来源字节相同，真实英文textarea的CDP字体仅MCBE Classic。原02整批保留，不叠加成122项，也不将公开资源检查称为新增tint像素认证。

公开03的page /consoleError /HTTP /request错误及取消均为0，4条整页ReadPixels性能warning保留，报告 `.cache/command-block-public-focused-03/FINAL.json`。33正式、80回归、6导航与新61辅助各保原范围；最终文档包需另做非文档身份验证，不预先声称完成。

后续source链核对补回first-tick option的generic尾spacer4：标题10＋switch16＋尾4共30，另有后续gap2。此CSS修订不改变字段API；当前Command34项随第二完整66项（另Structure32）实际通过，55.333951秒，零失败 /跳过 /重试 /flaky，909项selected输入无变化。首62 /4保留，canonical `.cache/structure-editor-independent-qa/formal-02/FINAL.json`；上述33 /公开03仍属修订前范围，不重计为新纵向位置证书。当前133 /147新源码02包的React18 /19实际消费及349dist逐字节一致也通过，见 `.cache/structure-editor-root-close-01/INTEGRATION-PACKAGE-02.json`。
