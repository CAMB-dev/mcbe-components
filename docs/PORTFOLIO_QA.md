# Portfolio：双页照片、说明文字与选择面板

`Portfolio`按原版的查看与选择路径组合双页照片、独立页码、删除／转换、翻页、底部操作与阅读按钮。可独立复用的部分是`PortfolioPhoto`、`PortfolioCaptionField`、`PortfolioPicker`、`PortfolioPickerItem`及`PortfolioPageTurnButton`。组件已写入源码并接入公共源入口；14d历史修订的正式结果与各阶段身份为：同库源码的06批10项材质、07批46项行为和预览修正后08批6项导航覆盖62个不同合同，全新包、四实际安装组合及公开页资格已核对；原生整页未认证。本文件不能作为原生整页像素认证。

源身份及各项限制见 [portfolio-source.json](portfolio-source.json)，完整素材出处见 [portfolio-assets.json](portfolio-assets.json)。相机、截图文件系统、文件导出、删除、转换及阅读服务由宿主提供。

## 最小使用方式

以下示例已通过公共源入口的严格类型检查。本轮打包产物在React18／19下的类型、SSR及CSS子路径消费也已另行验证。

```tsx
import { useState } from 'react';
import { Portfolio } from 'mcbeui';
import type { PortfolioImageSource, PortfolioStateImages } from 'mcbeui';
import 'mcbeui/styles.css';

export function PhotoPortfolio({ image, frame, divider, previous, next, convert }: {
  image: PortfolioImageSource;
  frame: PortfolioImageSource;
  divider: PortfolioImageSource;
  previous: PortfolioStateImages;
  next: PortfolioStateImages;
  convert: PortfolioStateImages;
}) {
  const [caption, setCaption] = useState('A host photo');
  const [receipt, setReceipt] = useState('');
  return <>
    <Portfolio size={[384, 250]} scale={1}
      layout={{ kind: 'nominal', readerButtonSize: [20, 20] }}
      bindings={{ viewing: true, picking: false, previousVisible: false,
        nextVisible: true, leftPhotoVisible: true, rightPhotoVisible: false,
        exportVisible: true, noPhotosAlertVisible: false }}
      leaves={[{ id: 'photo-1', image, caption, captionEnabled: true,
        captionColor: '#000', visible: true }, null]}
      pageLabels={['Photo 1', '']}
      labels={{ title: 'Portfolio', previous: 'Previous', next: 'Next', close: 'Close',
        deleteLeft: 'Delete left photo', deleteRight: 'Delete right photo',
        convertLeft: 'Convert left photo', convertRight: 'Convert right photo',
        add: 'Add Photo', export: 'Export Portfolio', reader: 'Read portfolio',
        captionLeft: 'Left caption', captionRight: 'Right caption',
        captionPlaceholder: 'Caption', noPhotos: 'No photos' }}
      frameMaterial={frame} pageMaterials={{ previous, next }} convertMaterials={convert}
      picker={{ rows: [{ id: 'inventory', dividerVisible: false,
        cells: [{ id: 'photo-1', label: 'Choose photo 1', image, visible: true }] }],
        frameMaterial: frame, dividerMaterial: divider, headerLabel: 'Photo inventory',
        headerHeight: 12, noPhotosAlertVisible: false, emptyLabel: 'No inventory photos' }}
      onCaptionChange={(side, value) => { if (side === 'left') setCaption(value); }}
      onAction={detail => setReceipt(detail.target)} />
    <output>{receipt}</output>
  </>;
}
```

`PortfolioImageSource`描述完整宿主图片URL、真实物理`sourceSize`、可选说明和原生图片属性。`PortfolioStateImages`要求normal／hover／pressed三份完整输入。不要裁取白色texel、生成箭头，或把别族图片声明为缺失的Portfolio原图。

## 独立状态与宿主数据

|输入|范围|
|---|---|
|`bindings.viewing` /`picking`|两个独立boolean；两者都true或false均合法，不自动构造互斥mode。|
|`leaves`|显式两项tuple，缺失为null；每张照片有稳定ID、独立visible、captionEnabled、captionColor与完整宿主图／renderer。|
|`pageLabels`|独立左／右binding文字，不由照片数推导，也不等于库中的自动分页算法。|
|left／right photo action flags|源全局删除／转换可见性，独立于每条照片的collection可见性。|
|prev／next／export／no-photos flags|各自独立；空数据不自动显示提示或隐藏导航。|
|picker `rows`|显式row ID、cell ID／visible／disabled与每行dividerVisible；不假定源选择器固定两列。|
|`readOnly`|当前Web策略保留翻页、导出与退出；阻止说明编辑、选择、增加、删除、转换及Reader启动请求。|
|`disabled`|阻止所有动作请求；照片和文字仍由宿主状态显示。|

所有变更都通过回调请求。`onAction`携带原目标、稳定事件owner及已接收数据快照；宿主决定是否接受。组件不自己删除照片、分页、导出文件或启动SDK。opaque renderer及回调引用不是可伪深拷贝的数据。

## 可复用部分

- `PortfolioPhoto`绘制完整截图、必填的动态frame、四个原19×19角标；可传入caption节点。默认120×120只是默认160宽页面的75% own-X Web解析。
- `PortfolioCaptionField`转发真实textarea ref，容器另有containerRef。必填label／placeholder／value／textColor；原生输入事件、换行、IME和选择区保留。`maxLength=1000`是UTF-16 Web映射，不代表已恢复原生过滤或计数单位。源正常背景透明，hover边框RGBA为0；locked才使用原edit_box_indent。单独可见键盘轮廓属于Web辅助适配。
- `PortfolioPicker`是225×231的独立book_frame面板，pane为209×201、offset[8,21]。headerHeight是显式宿主测量值。鼠标与触控滚动分支不同；触控默认不显示thumb。每个显式列填充自己的slot，原cell仍为100×100；过多列可能在有限Web布局中裁切，不自动缩小照片。
- `PortfolioPickerItem`保留100×100 cell、92×92 photo与透明点击按钮；photo的Y偏移与button不相同。选择回调带item／row／column上下文，真实ref指向button。
- `PortfolioPageTurnButton`要求完整三态材质，24×24；仅请求prev／next，readonly下仍可导航。

## 源几何与明确的Web解析

固定官方`portfolio_screen.json`为26,550字节、58个定义，真实继承链已逐项核对。默认book320×207、page160×207；本轮nominal Web解析将其放在320×231内容中，book Y=2、footer panel Y=24。`resolved`允许调用方显式提供content／book／page／offset／footer／picker尺寸。原生默认anchor、父级max-size的求值顺序、`%x/%cm/%sm`不是这些字面值可以证明的结果。

照片为页面75%宽的own-X正方形，Y−2。说明85%×22，内部clipper再−6／−4，文字居中且无shadow。照片截图／frame／caption／角标分别使用局部层1／2／3／4；caption实例层3覆盖其模板层100。页码25%宽、offset±50%x／−88；空提示只在左侧，不添加对称右提示。

prev／next为24×24、底角[±6,−8]；trash与convert为18×18，保留源22%／28%与自身半宽的偏移表达式。底部add／export为110×20，源自身宽度65%的偏移按有限Web规则解析；原轻按钮的内容缩进、颜色与pressed Y+1须由正式源校准验收。Reader实例覆盖了继承16×16尺寸，`readerButtonSize`必须显式提供；示例20×20只是宿主的已解析值。

Picker的header在源中为自然／child-sum高度，网格由row与column factory绑定提供。行宽为viewport+4，divider为11高、其中1高完整White图alpha .05；行列布局、自然字体与空白child求值均不是原生引擎恢复证明。

## 原材质与缺口

本轮私有资源23个语义key：复用16张实体PNG和1张已有完整内嵌PNG，新增6张完整原图、2份原始元数据及原版许可证，旧580资源文件未改。12份原始元数据保留原值，book_spine的物理8×1／raw base8×2不被改写为相同尺寸。header_bar虽然存在，但header_panel没有从活动root挂载，示例不另加该顶栏。

九张Portfolio prev／next／convert三态图在固定包中连casefold或其他扩展名候选都不存在，必须由宿主给完整输入。截图路径／文件系统和`$screenshot_frame_texture`都是动态宿主接口，固定全局没有frame赋值。公开示例使用完整透明中心focus_border_white作为明确宿主frame；其原始5×5图片不等于原生截图边框。示例三态Book箭头只用于展示宿主输入接口，不认证为Portfolio原材质。

精确大写`textures/ui/White`仍未解析。示例divider显式给出完整15×15小写候选，含黑texel；不从中裁出纯白区，也不认证引擎alias。固定body／page-number颜色为RGB[.74,.64,.53]，close default为黑色；caption受全局`#edit_box_text_color`覆盖，示例显式给黑色，不套用body棕色。

## 动作与验证边界

|来源|源目标|
|---|---|
|翻页|`button.portfolio_page_prev` /`button.portfolio_page_next`|
|删除左／右|`button.portfolio_delete_photo_left` /`button.portfolio_delete_photo_right`|
|转换左／右|`button.portfolio_convert_left` /`button.portfolio_convert_right`|
|新增／导出|`button.portfolio_add_photo` /`button.portfolio_export`|
|选择照片|`button.picked`|
|X／屏幕Escape|`button.close_button` /`button.menu_exit`|
|Reader|`button.immersive_reader`|

X模板也有global menu_cancel→close_button，而screen另有menu_cancel→menu_exit。当前Web策略只发送一次Escape→menu_exit，X发送close_button；原生优先级、消费规则与屏幕stack仍未知。组合输入／key229／修饰键及祖先preventDefault不得被解释成全局退出。

## 当前验证与保留的历史阶段

14d修订新增Portfolio、PortfolioPhoto、PortfolioCaptionField、PortfolioPicker、PortfolioPickerItem与PortfolioPageTurnButton六个组件，当时及当前均为183组件 /200运行时值。该历史修订62个不同合同按实际受检阶段验证：46项行为来自同源07批，10项材质来自同源06批，6项导航在两个预览host修复后由08批重跑。06批50通过 /12收据断言失败及所有更早失败均保留；不累加重复执行、不称单轮62全绿。完全相同产品的06批10项材质检查通过，96个完整源／Web平面共1,982,470像素RGBA零差；07只重跑行为，保留该材质来源与具名Web采样合同。新的React18.3.1 /19.3.1实际183组件 /200运行时值包通过ESM、类型、SSR、原图、字体和许可证检查，身份区别于旧mounted4FAIL包；新包的默认Vite React18 /19开发／生产四实际安装组合通过；两项明确demo-host修复后的新site公开页16项通过，1440／390截图与320本地滚动边界分别记录；旧公开选择器失败和14通过 /1全页溢出失败保留。九张Portfolio三态图、截图frame／provider、精确大写White、默认锚点／字体和原生整页仍未认证。

历史首60项52通过 /8失败、修正14项11通过 /3失败、浏览器原生beforeinput2项通过、后续10项材质7通过 /3失败及再后10项通过，均保留原报告与源版本身份。旧包的四个实际安装浏览器组合随后全部失败，暴露了可信点击在React-root与后续document监听器之间进行microtask checkpoint的真实请求时序缺陷；不能把它改称fixture失败。当前修订的完整首62项实际为50通过 /12失败，12项失败位于旧行为断言对postdispatch请求的即时读取；新增可信document否决两项、10项像素和6项导航在该批均已通过。同源07批完整46项行为通过，06批10项材质沿用其原受检身份；两个preview-host修复后的08批6项导航通过，恰覆盖62个不同合同。材质来源只指向同源06批的10项像素检查与96完整平面；完整原版PNG与原始base_size／九宫格元数据保留，包括physical8×1／raw8×2书脊。私有skin采用像素中心floor POINT，wholeIMG采用独立坐标图确认的Chromium最近邻边界下取样。隔离验证单位二维平移，保留none／非none变换上下文并归零平移，将完整目标置于(24,24)，逐RGBA零容差并检查焦点、活动态与精确恢复。认证范围为96个具名Web材质平面；原生字体、整页、provider与缺失Portfolio材质仍待验收。最终资格仍为62个不同合同：完全相同库源码的10项材质来自06批，46项行为来自07批；两个预览host窄屏修复后，6项导航已由08批完整重跑替换旧导航身份。不把06失败回填为通过、不累加重复执行，也不称单轮62全绿。

探索截图曾发现照片角标在2×wrapper中仍按19物理像素绘制；parts rev02修正后，旧截图只对应旧源身份。完整平面隔离保留祖先transform建立的上下文；已验证的单位二维平移归零，原本的none保持none，并检查焦点、活动态和精确恢复。原首60项52通过／8失败，修正14项11通过／3失败，beforeinput两项通过，保留变换的材质10项7通过／3失败，保留变换上下文并归零平移的10项通过，所有记录保留。旧47d8包的类型／SSR通过后，实际安装四组合均暴露document原生取消晚于微任务请求的真实缺陷，旧e899索引已退役。本轮新增Portfolio私有owner-window任务边界，caption草稿随后结算，Reader转交统一request；Tab和共享UGC／Reader helper不变。修复后62项首轮50通过／12个早读断言失败，按任务屏障复验全部46行为通过；同源码06的10材质与两处已审计demo host局部滚动修正后08的6导航，按精确身份覆盖62个不同合同。新353008包／e0f11索引通过React18／19类型、SSR、资源及实际开发／生产四组合。公开首轮选择器歧义、次轮14通过／1个320px整页溢出失败均保留；收窄弹层归属并修复两处demo host后公开16项通过。在14d修订的验收范围内，共享UGC／Reader的document晚期取消仍为独立待办；后续共享修订的解决范围见文末。

完整host图片body一致性不等于GPU全图resampling的逐像素相同。九张缺失Portfolio图与demo提供的完整Book图属于不同身份；透明focus宿主frame也不等于未知$screenshot_frame_texture。

14d修订当时新增的私有`portfolio-event.ts`只调整Portfolio请求与caption结算的postdispatch task边界，等待可信native事件传播到document监听器后再检查否决。Tab焦点约束仍使用已有microtask时序；引用、modal与共享辅助的旧受测身份不因此扩大。当时UGC／Reader仍存在已知的late-document否决时序限制，14d没有修改或重新认证这两个族；该历史修订不能宣称所有家族一并修复。当前共享修订的实际解决范围见文末。

公开首轮因未限定到当前combobox控制的listbox而在第2项失败（首项通过），作为方法阶段保留。第二公开阶段14项通过、第15项320全页宽度失败：Portfolio本地边界已通过，真实溢出来自既有Storage预览的308宽控件与既有独立StartFooter的300宽控件，分别超出278宽host到right329／321。仅这两个demo host增加本地横向滚动／min-width收缩，不修改任何库组件、原图、fixture或材质oracle。只增加Storage预览host的overflowX:auto以及独立StartFooter host的minWidth:0／overflowX:auto，原库764份src文件和已测index字节均不变；新08批6项导航与重建site的公开16项均已通过，其他demo及Portfolio fixture／材质oracle无变化。新公开16项仍须在这些新demo和重建site上完整执行；旧公开失败不被覆盖或改称Portfolio库失败。

实际新包及公开验收证据：`.cache/portfolio-tests-01/run-06/RESULT.json`（SHA256 `1d338fe56a9b85bba9b47090813953a91d30c2284a6d3f7eee4f13c6190126d0`）；`.cache/portfolio-tests-01/run-06/report.json`（SHA256 `43910ba9a191471098489f482b0c57260eca5c5c92543f07436512dd3614a52a`）；`.cache/portfolio-tests-01/run-07/RESULT.json`（SHA256 `732522e3ccaecb4bd05c386b621ca59c396649e8036de321634bc9ba6f69cdd9`）；`.cache/portfolio-tests-01/run-07/report.json`（SHA256 `50f37857a63221fb2667f95447892882b48b1552b27788b8826ed45d76aa2b36`）；`.cache/portfolio-tests-01/run-08/RESULT.json`（SHA256 `674fb024c7c43c50fcf8451c81ed21a6f3ea53cabb0c600b8a41ce02899de6d0`）；`.cache/portfolio-tests-01/run-08/report.json`（SHA256 `4e43c488b42ec788df2710284ea1c47e3f26dd16d714794948e8d798a44f1ef9`）；`.cache/portfolio-root-01/PREVIEW-HOST-FIX.json`（SHA256 `93102f3686db0f574cbf8a5b864f7915e50e13756c0c020a81470f56b38e2522`）；`.cache/portfolio-tests-03/QUALIFICATION.json`（SHA256 `bcf5cb64f6cfabc922d2e689718f81a83e39033c96f56b4461824a1625717424`）；`.cache/portfolio-package-02/RESULT.json`（SHA256 `b23d41074ad25fa117966a1685fa4ba2c1239a82aeb0a3fe2181b9010f87771d`）；`.cache/portfolio-installed-browser-03/INPUTS.json`（SHA256 `412440fc93094689d173fb055d1708ff8bb14a69306b52b2ddf2b2b0cc859aff`）；`.cache/portfolio-installed-02/FINAL.json`（SHA256 `110478aae5b86c93a72dc48568501dccee7da4b65cd0dbe5d89008b9d926f7dc`）；`.cache/portfolio-public-03/FINAL.json`（SHA256 `16d4b04a57306bbc20cb32adc334ef58c29b586b902e5b22233bfc733af059c1`）。最终文档应用后还必须生成doc-only tar并逐文件比较所有代码／资源字节与已测包一致；预览host不进npm包，不因这两个host内联样式变化要求重建库产品。CPU／SSR／类型检查只保留各自范围，不回填为浏览器或新源版本的重跑。字体AA、默认anchor、native provider／controller、截图与Reader服务、完整原生GUI像素全部未认证。


## 共享请求时序修订：当前实际验收

共享请求时序修订保持183组件／200运行时值及206行覆盖表不变。新的132项正式合同单轮全部通过（114行为＋18材质，8次新增可信输入回归＋124次原有执行；无跳过、flaky或源码漂移，未加算导航），138个完整源／Web材质平面共3,969,420像素RGBA零差。全新0907bc04包／f38bb1索引通过React18.3.1／19.3.1类型、SSR、资源及实际开发／生产四组合；公开30个不同检查来自Portfolio首阶段16项和UGC／Reader第二阶段14项，不能称单轮30全绿。UGC／Reader晚期document否决缺陷已在当前受检请求通道与实际包中修复；原生整页、字体、provider和真实服务仍未认证。

宿主请求现在经owner window的task等待native传播结束，再检查否决与当前受支持的有效性；UGC query和Portfolio caption先排请求、后排草稿结算，Portfolio中的Reader入口沿已经延迟的受保护通道直接递送。Modal Tab及UGC Arrow／Home／End仍用早期microtask处理默认行为敏感的焦点移动，不能从请求task推导这些键的晚期document否决保证。native onClick仍同步先执行，需要手势的宿主API可放在该原生回调中；延迟请求回调不保证SDK所需的瞬时用户激活。守卫针对实现支持的React状态、身份、连接和只读／禁用等条件；任意直接DOM修改或原生属性改写不属于保证可取消待递送请求的合同。

旧e0f11实际包的五通道可信点击缺陷保留：UGC item／close／card和Reader activate／retry都在document晚期preventDefault前泄漏一次请求；各脚本否决控制组为零、正常可信点击各一次，错误为零。脚本点击不能替代可信输入。当前正式与实际安装合同验证请求递送／有效性，公开页额外验证三个真实DOCUMENT否决和三个正常可信点击的宿主状态DOM变化；公开MutationObserver证据不等于回调入口次数证明。安装首阶段四失败因观察器漏序列化event方法结果，修正方法后四组合通过，产品和断言未变；这段方法失败不能用于重分类旧包真实缺陷。公开首阶段29通过／1失败来自Reader状态定位同时匹配loading div与宿主p，最后Reader可信步骤尚未执行；只收窄两个宿主状态选择器后，完整重跑UGC／Reader14项并保留Portfolio16项。

实际证据：`.cache/classic-dispatch-tests-01/run-01/RESULT.json`（SHA256 `377bccaf2ed9b282d963b6170860506f72330330c2e6f93f20cd5fa4d6722f3f`）；`.cache/classic-dispatch-qualified-01/QUALIFICATION.json`（SHA256 `ade2d934f9daaf943e1fbb49a63aa5c6c468bb3e4d112d9919ed2011c725c21d`）；`.cache/classic-dispatch-package-01/RESULT.json`（SHA256 `e7ff771c3d490ad45f9107c786902b831c38574a96d75681fd2a1ac268f4ae5d`）；`.cache/classic-dispatch-installed-02/FINAL.json`（SHA256 `f93625d86c6c085da1e5dd0b6d8af2056761169c0fa78c3840030699edbbf9db`）；`.cache/classic-dispatch-installed-browser-02/INPUTS.json`（SHA256 `7326d89fd910dc7cfdd14a342b198acf169c66b0a3bde5622282ee1b2d9de9d2`）；`.cache/classic-dispatch-public-02/FINAL.json`（SHA256 `5ccd6eac8b0d669f14a15b2f945960e26677e7abca248d7c68068597ba1af7ea`）；`.cache/classic-dispatch-baseline-01/RESULT.json`（SHA256 `ff1410f72fde21a48cdc485b5766f8902ebf73487b3a407a18e9b8c91a199fe8`）；`.cache/classic-dispatch-installed-01/FINAL.json`（SHA256 `cfb288f744f93a3e182600990eee83a65bdb70eec2eff134b642d20efaa8812e`）；`.cache/classic-dispatch-public-01/FINAL.json`（SHA256 `16cdd2a2dc3f52142d25babe52516e452c83c1ec9df2c7afbd12701f07859e93`）；`.cache/classic-dispatch-public-02/PRECONDITIONS.json`（SHA256 `d2667a4f60cae2953eb4559da792297bfee0243f1e91a39bd877666465ebaf91`）。现有14d及更早阶段的结果保持各自历史身份。138个平面的RGBA零差仅认证有限源／Web材质合同，不新增native字体、默认锚点、provider／controller、真实截图或Reader SDK、OS IME和完整原生GUI资格。最终文档应用后须生成doc-only包，逐项比较所有产品代码／资源字节与已测0907bc04包一致。
