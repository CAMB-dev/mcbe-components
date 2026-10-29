# Anvil失焦名称显示：实现与分阶段验证

本轮为Anvil普通DOM名称增加私有失焦显示层，不新增公共API或组件，仍120组件 /134runtime。保留原受控input处理编辑 /selection /focus /IME，失焦时装饰文字由React的name值独占。产品04正式57项、实际package03、独立产品C /source比较及171生产辅助检查按各自范围通过；普通DOM native残差仍非零，未完成广义像素目标。

## 调用与编辑合同

继续使用原接口，无新增name renderer参数：

```tsx
<Anvil name={name} onNameChange={setName} inputs={inputs} result={result} />
```

原input节点、value /onNameChange、maxLength30、disabled /readOnly、ARIA与方向键 /选择保持。focus或composition时显示真实input；失焦且显示层ready时，仅隐藏input文字paint、显示aria-hidden装饰层。imageRender自身name ready优先，loading /error /关闭source name时回普通DOM显示，不重复绘字；正式与生产分别验证这些路径。synthetic composition不认证真实OS IME。

装饰文字只使用JSX `{value}`，不从input事件临时DOM value命令式复制。宿主接受 /转换 /拒绝onNameChange均以最终受控prop为准，不新增valueRef /timer延后同步，不写input.value、scrollLeft或selection。该实现不计算游戏重命名规则。

## 两个源box与浏览器子行政策

原common.text_edit_box给clipper game `[42.4,22.73,123.6,15.32]`，内部label高10game，right-middle锚定、min-width100%，文字本身left/start对齐。GUI2 CSS外clip相对field left6 /top4、width−12 /height−8；内部label right0 /高20px /width:max-content /min-width100%。短值因此靠左，长值由宽label右锚向左延伸；不能用text-align:right替代。

私有helper读取真实input的computed font-size F、line-height L与fixed height H：L非有限值、F≥L或H>L时，text子行使用normal；否则保留L。子行flow-root，20px父label以 `align-content: unsafe center` 居中，允许负free space。该C政策依据报告中的Blink156单行editor机制，不按font-name /字符 /原型残差选偏移，也不写死23px行高。它不等于已恢复其他engine /RTL /writing-mode /百分比高的完整input算法。

为防自身透明paint污染computed style，helper只在同步读取期间设置measuring marker，并在finally恢复；监听focus /blur /input /composition、祖先style /class /dir、resize及font loading来刷新样式。清理移除observer /listener /RAF并恢复自己拥有的marker，不改input inline样式。父ref生命周期与controlled reject的真实失败及修复见下文，不能凭CPU模型替代浏览器验收。

## 来源与cache原型，非产品native验收

`.cache/anvil-input-layout-study-01` 独立读取安装版 /官方JSON与旧native VB /CBV，区分右锚的label box与固定clipper；source未声明blur scroll reset /数值caret策略。原QA /Long都有scissor LTRB `[1057,400,1675,476]`，Long完整字符串原点向左，但不据此硬编码捕获坐标。

`.cache/anvil-dom-name-layout-01` 的首固定20px子行原型改善Classic long，却在Mojangles短值出现真实354像素退化，原报告不覆盖。后续 `.cache/anvil-input-scroll-probe-01` 独立比较A（原input只写scrollLeft=max）与C（源两box＋浏览器子行规则）：三font的短QA C /原input完整pair均0，Long的完整native差异如下：

| Profile /Long | 原input | A: scroll到末尾 | C: 两box＋子行 |
| --- | ---: | ---: | ---: |
| Open18 | 66,928 | 64,608 | 61,458 |
| Local20 | 71,612 | 67,031 | 68,845 |
| Classic20 | 60,343 | 54,385 | 52,998 |

Classic C有改善，但Local A优于C，不能只挑有利profile。以上是cache原型、完整2570×1402 /完整ROI /零容差，非产品04实测；非name区域与alpha未变也不等于native完整GUI0。原样本font /AA /shadow /clip取整差异继续保留，不把旧source0当本轮重新验证。

## 产品迭代与保留的失败

`.cache/anvil-name-display-independent-qa/formal-01` 实际45 PASS /11 FAIL：child layout effect时祖先field ref尚未attach，真实产品ready路径未建立。修后使用已commit input的parentElement并检查归属，原报告 /source pins保留，不将其归为harness错误。

formal-02实际55 PASS /1 FAIL。该剩余case发现截图工具在隐藏caret时把input inline style从null改为空字符串；测试改用初始caret设置避免工具写入，不通过把null /空串规范化来放宽cleanup合同。该报告保留，不能冒称56全部通过。

另真实 `.cache/anvil-name-controlled-reject-probe-01` 在phase03证明：固定name="QA"宿主拒绝键入x且同步blur，input恢复QA但装饰层仍QAx，多RAF /fonts.ready后仍旧；接受转大写positive control两者QAX。这是产品受控值所有权bug，原report SHA256 `1d1266fc10d136e2c277927c868741cd8275342735b95806f3e19861316f21c5`不改。

产品04仅删除 `content.textContent = control.value`，交JSX值独占。`.cache/anvil-name-display-core-04/FINAL.json` SHA256 `6838431e9778d5035f6c7d08de02d76488756dffa2a8aa1f996d590c3eedfe71` 记录13项CPU policy /ownership /style /IME /cleanup /SSR与source /demo tsc通过；mock显式模拟JSX commit，与下述真实React浏览器检查分层。

## 最终57项正式合同

`.cache/anvil-name-display-independent-qa/FINAL.json` SHA256 `70529d9386d950c0f3dcc4f1fd77c8c723c4282a10be0b83846e358d94a19d55`，RESULT.md SHA256 `ca21b9db3ac6c211896d814e9dcb52a70cf90b71082dcf5d03a94f1f1f8b59df`。formal03实际57 /57 PASS、129.984505秒，0skip /retry /flaky，894pins不变。预声明standard Chromium156 /SwiftShader /Vulkan /worker1；新name12＋sourceAnvil13＋fidelity10＋Classic10＋desktop /mobile Anvil各6，不重复累计前45或55个PASS。

7个完整field plane共72,800RGBA像素，相对同浏览器 /同skin真实失焦input参考0差，覆盖三font /三line metrics /uppercase与wordSpacing。固定原区域 /零mask /零容差，不以浏览器参考0声称Minecraft native Smooth或任意长name0。首次mount /Strict、external styles /清理、source ready /pending /error owner均实际运行。

拒绝case真实键入x，宿主handler不setState并同步blur；React恢复后input与可见装饰层均QA、selection2 /2、同节点 /inline不变。接受uppercase positive两者QAX、selection3 /3。截图使用失焦时caret:initial避免工具改inline，不通过归一化null /空串放宽原合同。原两formal失败与真实拒绝负控保留其身份。

## 包身份与版本范围

包01的npm /两个consumer实际成功保留，但PowerShell5 snapshot不全、wrapper guard失败，只提供partial source proof；不能把wrapper问题说成npm失败或当完整源码身份。包02为phase03真实fresh React18 /19成功：617 source /demo /test /font /config pins不变，257dist与tar /两个新安装consumer同字节，134runtime，tar SHA256 `cab4d313dc83f5f4f4f58d9775f3759f9c83643935ffefd15de883dc2e8e03c9`。

包02包含删除命令式赋值前的helper，被产品04 supersede，不用其成功认证新JS。真正修后package03 `.cache/anvil-name-production-03/package/consumer-identity.json` SHA256 `0436ace55933423c258522770a794351d95a04bdb3de1a89a9f8d4108c4af06d` 实际npm exit0、40.40128秒（wrapper41.98630秒）：fresh React18.3.1 /19.3.1 ESM /134runtime /SSR /strictTS /styles /assets /licenses通过，617完整source /demo /test /all-font /config路径 /counts /bytes不变。

本次immutable consumer-verified.tgz SHA256 `04e65ecf219f049058e097ddd70dc18b6e12342ccd31b8e16759be080f6b4483`，dist/index.js583,783bytes，SHA256 `1e676daf78f4169f3a5a65c708492704d4e5be1f1dc95cc23753f7868b357f23`。257dist在tar /build /两个fresh consumer逐byte相同，49site /260非文档条目登记于pins；compiled sourcemap中helper /Anvil为当前精确源码，dist Anvil CSS精确匹配。私有三font /metadata不入包。

后续补文档重pack须独立证明260非文档 /257dist与本已测包同字节，不将该身份链说成再次consumer执行。

## 产品实际完整比较：C复现与native残差分开

`.cache/anvil-name-integration-01/FINAL.json` SHA256 `02e8fa5629977a756a603505e3b366f63e41012f5a6121d29855861da9f94307`、REPORT.md SHA256 `4eae90d9deb2422ed2601db6267527258c9a9ea09968d29bbf7a24463bff63f4`。实际导入产品Anvil，不注入原型hook /label DOM /scroll setter；NVIDIA RTX3050 /ANGLE D3D11、DPR1。8个ordinary产品截图、4个source profile及4个native-copy共16图为辅助证据，不增加正式57。

| 产品font /value | 对原input完整差异像素 | 对冻结C | 对native |
| --- | ---: | ---: | ---: |
| Open18 QA | 0 | 0 | 55,734 |
| Open18 Long | 11,175 | 0 | 61,458 |
| Local20 QA | 0 | 0 | 61,197 |
| Local20 Long | 10,605 | 0 | 68,845 |
| Classic20 QA | 0 | 0 | 49,631 |
| Classic20 Long | 11,000 | 0 | 52,998 |

每项完整2570×1402 /3,603,140像素逐RGBA比较，无mask /容差。六个产品对C是真正全图字节相同，不只是残差计数相同；三QA对原浏览器input全0，所有pair非name与alpha保持。LocalLong旧A67,031仍优于产品C68,845，不按font挑A；Classic C虽优于A仍非native0。

Classic Empty /Invalid额外两ordinary产品已实际截图，native残差34,886 /38,081。raw prototypeComparisons保持null，因为六case原型没有这两态；after-run CPU supplement另与不可变旧普通DOM整PNG比较，完整RGBA /alpha /nonName0且PNG文件bytes也相同。`SUPPLEMENT-EMPTY-INVALID.json` SHA256 `548be397dc9cb181e0c587dfedf21fd4a0777ff43ba88e6f728bd18cbf4d269f` 不回填raw或run-start pins、不新增browser执行。八ordinary均保留非name paint。

四source profile对原native完整3,603,140像素、747,600 ROI及alpha全0，四native-copy同完整target0；source ready时DOM nameclip隐藏、仅源glyph绘制。ordinary Classic四态对native仍为49,631 /52,998 /34,886 /38,081，不能把source0转移给普通DOM或全部默认GUI。

98source /33原资源 /50不可变证据pins前后0变。ordinary请求失败0、page /console /非取消网络0；raw source QA /Long共6 ERR_ABORTED留存、generation未instrument，allRequestsSucceeded=false。原图像零差与取消分类分开，不宣称全部网络请求成功，也不把目录开始至report写入区间冒作进程Stopwatch时长。

## 实际生产171辅助检查

`.cache/anvil-name-production-03/production/FINAL.json` SHA256 `ae62b2552dab08bbf3f1c3780c3494aa5c0246c24664f7c32db232494f64d959` 首轮完整exit0、40.30203秒：96profile /普通name＋75Source Anvil＝171辅助，不沿用旧147或计新增formal。实际standard SwiftShader /Vulkan、CDP只记录有限真实family，不作nativeRGBA或总VRAM证明。

三profile失焦单aria-hidden label /input字透明；focus同input与selection保留 /label隐藏，synthetic IME、无编辑theme刷新、30字符右锚与390px单paint通过。长名width356 /356 /360大于clip247.1875且右端对齐。source ready独占，focus还给input，GUI4 /off用DOM C，恢复source后隐藏DOM clip，均实际验证。

8 HTML /JS /CSS入口与49site同byte，257dist及617source pins仍绑定04e65真实consumer包；main-HPn6GNgz.js171,992bytes SHA256 `f1dfc4072b10c4fef303bff64e8f9cad5b80c023d70463940c893485e4b23196`。10登记HTTP字体与1 inline ASCII分别对HTTP bytes /解码SHA，inline无HTTP状态；29个observed font HTTP逐byte相同。profile raw0，Source Anvil raw2 ERR_ABORTED保留、两URL回访200 /byte0；page /console /render /非取消网络0，不混成native阶段的6取消。

后台浏览器finally关闭、临时服务释放，用户tabs未动，无CUA /桌面操作。正式 /原型复现 /有限source0 /生产各自留证，不认证其他engine /任意字体与文本 /真实OS IME /native Smooth、动态场景、其它GUI或最终world /Present。广义Goal继续ACTIVE。
