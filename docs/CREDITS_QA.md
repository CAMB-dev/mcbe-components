# Credits：实际数据渲染、播放器与有限源／Web验证（有限源／Web资格）

2026-11-02 后续：[底层栅格原点验证](GUI_LAYER_RASTER_ORIGIN_QA.md)在指定D3D11后端使捕获的背景整平面RGBA零差，SwiftShader保留80像素差异。它使用内部prepared网格边界，不证明公开Credits源布局或整页已还原；下文旧CPU1530残差仍作为原阶段结果保留。

随后增加[公开源平铺验证](GUI_TILED_IMAGES_QA.md)：明确的ceil stage／center／零offset候选可由公开GuiLayer生成完整网格，指定D3D11整背景及真实React DOM零差。它不恢复原生默认锚点、动画时钟或CreditsScreen整个播放器；旧阶段边界与失败仍保留。

接续的[可选GPU背景](CREDITS_GPU_BACKGROUND_QA.md)已接入CreditsScreen连续呈现与公开示例；空内容、intro完成的明确受控快照也通过整背景原生对照。旧CSS路径保留，播放器整体及原生字体／时钟仍未认证。

状态为**SOURCE_WEB_PACKAGE_INSTALLED_SOURCE_AND_BUILT_DEMO_QUALIFIED_NATIVE_UNVERIFIED**。当前实际barrel与受检功能包为191组件／209值，含CreditsScreen、CreditsRoll、CreditsSkipButton及纯layoutCredits。包、React18／19实际安装消费及source／built展示页已按具名阶段验证。最终仅文档tar及Git部署身份待root操作。覆盖表仅Credits一行E→有限A，A39／E0不代表所有Minecraft GUI或native完成。

## 已确认的源与实际数据

固定`v1.26.60.5-full`中的`resource_pack/ui/credits_screen.json`为4,028字节，SHA256 `9a30b84328cbb6d499f336889456c9148a03e28695308a4f9863770d7baf7ea1`。安装版1.26.6005.0的对应UI为2,596字节；原字节不同，解析JSON相同。自有11个定义、7次嵌套control完整记录；188名保守共享闭包不等于188个挂载控件。可读源搜索未找到custom renderer实现，不证明引擎二进制中不存在它。

安装资源确有`data/credits/credits.json`，240,433字节、SHA256 `acd3f38b536ec9270e9ac62c4724f132657c97df31d22d08545fce7da27e9401`。实际schema为：

```ts
type CreditsData = readonly {
  section: string;
  disciplines: readonly {
    discipline: string;
    titles: readonly { title: string; names: readonly string[] }[];
  }[];
}[];
```

469个对象均符合该精确结构：22section、39discipline、408title/name组、3,098个名字、3,567个字符串。21个discipline和2个title为空；保持数组顺序和空标题，不造说明文字。JSON没有数值、布局、字体、速度、颜色或图像字段，所以该数据不提供行距／滚动速度。`end.txt`与`quote.txt`的路径、字节和hash见来源JSON；仅记录PLAYERNAME及§格式token存在，不复制诗文、quote或staff原文，不声称恢复换行、乱码动画和姓名替换算法。

## 源合同与尚未恢复的renderer

credits_renderer为custom，大小65%×100%，绑定showEduIcon／showEndPoem／playerName／scrollFaster，结束事件为scroll_end。源未给出文字排版、logo、滚速或加速倍率。黑色遮盖fade-in是alpha1→0／3，fade-out是0→1／3并发credits_end，不是文字淡入淡出；scroll_end、factory、outro、关闭之间没有可恢复的自动编排。

背景继承原32×32 bg32、tiled_scale2×2、区域100%×2000%、offset由−0%y到−25%y、duration503。503是背景动画时长，不能写成Credits滚动时长；%y解析、窗口client矩形与安全区未知。精确大小写White仍未恢复；小写white.png只作为明确候选，不冒充原生White。

Skip为form-fitting light text源链，bottom-right offset−8,−8，visible由skipButtonVisible独立控制；5时长wait在结尾销毁skip_button，不能理解为5秒后出现。whole-screen select／ok／cancel→show_skip；生成的panel cancel→menu_exit。映射共存优先级、实例寿命和不同入口策略没有由JSON自动恢复。

## 三张完整PNG与Settings输入

三张无损PNG均为2568×1400，原始窗口位图保存后未缩放、裁剪或重绘，hash见来源JSON。它们有host样式边条；与2560宽CU JPEG相差8像素不证明client范围，不据此裁8px。JPEG仅说明输入／入口观察，不能作RGBA golden。

实际Settings／General／Credits路径中，首次Escape显示灰色Skip而roll继续；约48.521～51.894秒后观察不到Skip，未测到精确5秒边界；57.583秒时再Escape返回General。另一次Return显示绿色焦点Skip。第三张名字含skip-request的PNG距Return约11.186～11.595秒，**没有捕到Skip**，只供后续文字／背景holdout。panel输入资格不能与可见child按钮等同；保留panel的解释是寿命假设，不是引擎对象图或通用两次Escape规则。poem／quote／education、其他入口、按住加速、重复键／controller／touch及完整结束链尚未实测。

## 字体、logo与背景的有界结果

97份分析artifact已逐项核对原hash，这个数字是研究文件数，不是97个运行时测试。完整default8页面与glyph_00及原Mojangles.ttf均有真实资源身份；实际使用哪一个native资源、Unicode查找和fallback仍未知。本机TTF不随库复制。

首图在achromatic minRGB75诊断gate与有限平移搜索下，10个可构造default8候选中7个完整行mask零差。独立第三图使用固定origin[648,2]／100px stride／physical5、无逐姓名拟合，在另一个minRGB128主画面gate下14行中10行mask零差，余4行差异3,725／70／5／1,405保留。两个gate是不同诊断域，不能冒称RGBA相同或偷偷更换既有像素oracle。extended ó映射、褪色边缘与长行覆盖仍未解决；现有CPU文字路径与14个人工源候选alpha一致，只证明可复用实现一致，不是第二个独立native oracle。特定Pillow／FreeType TTF实验非零，不排除引擎以其他策略使用TTF。

原title.png的510个point／bilinear候选中，最佳point框[536,371,1505,255]在**预测源alpha255域**的356,072像素里有41,344个RGB不同。源内容身份很有支持，但UV／quad／sampler及透明／半透明合成仍未恢复，完整logo RGBA不合格；不抹去残差或取native裁图当替代素材。

原bg32的重复2×2块支持320×320物理tile候选；它不是已恢复的native坐标求值器。首、二PNG的3个背景ROI共645,000次RGB比较零差，因重叠仅470,000个distinct像素；首、三PNG另有200,000像素ROI比较零差，独立记账，不能合称新的全图唯一像素数。它们只表明这些样本背景位置稳定，不证明背景无动画、时间同步或滚速。5px右下／约四分之一强度阴影和边缘衰减是候选；native颜色、gamma、AA、vignette及opacity_override0含义未恢复。

公开示例的整图身份、许可及自带字体策略见 [credits-assets.json](credits-assets.json)。现有公开字体是OFL替代，不是安装版字库；示例文字独立编写。

## 当前实际源码接口

- `CreditsRoll`是具体数据渲染器，直接消费content/profile/plan/bindings及offset/elapsedMs；解析层级、UTF-16来源范围、纯文字／§格式、playerName字面插入、wrap、图片与字体，并保留无障碍原文。必填scale、rasterPositioning和imageSampling。bitmap face／最多16个显式bitmap fallback face或纯CSS metrics是窄宿主接缝，不是整个renderer注入。无children/render占位合同。
- `layoutCredits`是纯函数；输入内容、profile、plan、bindings，输出nodes/paragraphs/lines/images/stages、预算使用量、completionOffset和nativeCertified:false trace。保持空heading／原数组顺序；所有度量和资源优先复制／校验，不带原staff／poem／quote／游戏字体。
- `CreditsScreen`默认playback模式。必填runKey/content/profile/bindings/scale/skipLabel/onCloseRequested，另需playback的playing/initialOffset/hiddenPolicy；runKey开启新会话，content/profile改变本身保持时钟。profile包含layout、plan、surface、显式速度／faster、Skip字体、栅格／采样与input策略。`open`与hidden、disabled各有边界。controllerRef.request需要原始fromButtonId与明确destination。
- 高级`mode:'controlled-source'`提供position与snapshot，不背后创建factory；panel、button、skipButtonVisible、exitInputActive和fadeOut独立。普通播放器内部维护这些字段，调用者不必手拼引擎实例。
- `CreditsSkipButton`是真实type=button，转发button ref，原生onClick同步、语义请求在owner task后接受外层DOCUMENT否决。必填label/labelStyle/scale；可选visible/disabled/labelSize/requestKey/isActive/onRenderError。按实际font/fallback度量单行；源normal/locked文字30%、hover/pressed白色、shadowfalse；Web label+6／图内缩1与正常3,3／pressed3,4偏移均显式标记，不冒充未知%c解析。

自然结束为明确`web-scroll-end-then-fade`策略：当前有效layout达到completionOffset时发scroll_end，3秒黑cover后发credits_end。用户menu_exit/onCloseRequested独立，不伪造自然事件或导航。原JSON没有恢复自动编排，所以这个策略不是native认证。普通模式的5秒child消失不删除panel退出输入；在controlled-source模式，父输入与child／可见binding依旧独立。黑cover DOM solid是未知精确White的明确Web替代，coverPlacement必须显式选择。

单调owner-window时钟积分前一段flags/rate，再应用新值；scrollFaster只乘滚动距离，不乘presentation age。playing与hidden pause/continue控制时钟，控制模式来回切换不计入受控期间的隐性时间债；普通open/hidden暂停边界与disabled输入边界分开。输入接收时复制上下文，task后与host callback后均查最新policy、parent/child身份、membership、native veto、disabled/hidden/inert；迟到的旧布局、子图错误、旧factory通知不污染新实例。SSR与ref／外部字体的实际资格按各自证据记录，不因类型通过冒称全部行为已验。

## 当前实际验证与保留历史

|批次／身份|实际结果|解释|
|---|---|---|
|Roll首批run01|10PASS／6FAIL，共16|六个自编平面因fixture-host整数对齐失败，原结果保留|
|Roll run02|6PASS|仅重跑六平面；首批未改的10行为保留各自身份|
|Screen targeted run01|5FAIL|五个真实行为缺陷复现，不能当测试方法失败抹除|
|Screen+Roll run02|42PASS／2FAIL，共44|两项restart/ref观察失败保留|
|run03|2PASS|observer-only host焦点恢复后只重跑这两项，产品未变；不是单轮44全绿|
|policy targeted run04|1FAIL|原生传播期间policy撤回仍发请求的真实缺陷|
|Screen run05|30PASS|834pins零漂移，修订后全部30个Screen合同|
|host-callback policy targeted run06|1FAIL|宿主onAction撤回policy后仍close的真实缺陷|
|run07|8PASS|修后受影响请求合同；6项旧执行＋2项新执行，834pins零漂移|

汇总身份已由`.cache/credits-web-qualification-01/FINAL.json`（`fabc3f5d8033265bcc8aeaaa3dddd4066c4fa764a4444277bfce66ee2c2ba2d6`）在冻结时核对功能字节与各阶段pins；随后仅两份文件EOF变化另记，旧pins保留时间身份；当前48个不同执行身份按latest受检范围组成：run05未受最后修改影响的24＋run07八项＝Screen32，再加run02的未改Roll16。不能把重复执行相加，也不能称单轮48全绿。所有这些终端结果为0skip／0flaky；具名批次仍各自保留。六个完整自编Web平面合计108,000物理像素RGBA零差，是**自编Web输入／期望平面**，不是游戏原材质或native整页。

七个已证实mounted缺陷：parent input资格撤回；宿主action移除control；内容替换却使用旧短layout完成；从controlled-source返回时错误累计期间时长；含冒号的不同factory身份发生通知碰撞；原生传播期间移除keyboard policy；host callback期间移除policy。修复与回归保留原身份。另有纯model shape检查初次7PASS／1FAIL，问题是非null panel漏写button字段时被当默认值；修后8PASS，不能混称第八个mounted缺陷。早期layout CPU的copy/accessor/来源范围/换行问题和checker自身run边界假设纠正也保留各自记录；独立core24与fallback9组是纯CPU资格，不是native字体路由。

此前三个第一图集边缘候选给出相同空ó，缺350个native前景像素；该阶段和四个完整行holdout失败保留。它没有恢复native lookup／sampler／shader。后续新增原始分页数据的独立限定预测见下文；logo41,344差异、旧分析artifact和第三PNG未捕到Skip均保留。

### 受检功能包、实际安装与展示页

受检功能tar是`.cache/credits-package-01/credits-built.tgz`：5,751,012字节，SHA256 `a190d4aba6317981b44dcc22f8d6fad419d4a4a526232a03e3d73adcbc828c30`；ESM index为`d9d53684cd2cfe01c230ef888695e53b92e71053e6592f78530aed744fdea5ba`，声明为`498623713c68e381969e6b4d9640de58d62aaa181e0a98f34fdd832ebc461747`。191组件＋6数据＋12函数＝209运行时值已由这个实际tar消费确认，三个Credits组件和layoutCredits属于其中。archive identity逐份验证838包文件／699dist文件与当时workspace叶节点及两个真实npm安装消费者相同；这不是后续文档包身份。

phase01实际build与React18旧smoke／类型／Invite检查先通过，随后新增negative fixture出现unused @ts-expect-error。`.cache/credits-package-observer-02/FINAL.json`证明：installed声明确实没有children；TS对带spread JSX nested children的检查与期望不同。只将该负例改成fresh typed object并保留解释，未改API／runtime／资源，也未重建tar。same-tar phase02补跑React18 Credits检查并完成原React19 loop。这个失败保留为测试观察合同修正，不写成产品修复或删去初次失败。

React18.3.1与19.3.1每个实际消费者分别通过：15组SSR、7组layout、13个runtime非法输入、3份CSS、47个公开类型与15个negative合同；严格NodeNext、skipLibCheck:false、无source alias，SSR无callback／ref／timer／decode副作用。旧全库smoke与字体／许可检查也保留实际阶段身份，不能称原始单轮verify-package全绿。

实际安装浏览器为React18／19×默认Vite development／production四组合，均PASS，每组合10组检查、零输入漂移。整包838文件身份相同，没有alias／dedupe／optimizer workaround；真实6类DOM refs与controller、StrictMode挂卸、DOCUMENT可信点击／键盘否决与不同positive宿主DOM修改、run重置及child缺席时parent退出均实际验证。每组合120个完整自编canvas像素严格RGBA零差，仅该自编输入域，不是native屏幕。

source主展示页本轮9项通过、1223pins零漂移，root查看1440／390截图。**built展示页首轮run02为8PASS／1FAIL**、1296pins零漂移；desktop字体与CSS Canvas advance检查在originalBody等待response时60s超时。原trace与built CSS随后证实：观察器把外部CSS的相对字体URL按page解析，等错URL，真实两字体请求当时均200。仅将测试URL基准修为实际CSSStyleSheet.href（inline才用document.baseURI），产品／site／字体／严格byte oracle均未改。run03只复跑该1项并PASS，1296pins零漂移；与run02唯一差异为tests/credits-public.spec.ts。built9个不同合同由原8＋复验1组成，不称单轮9全绿，也不与source9重复加总成新的不同合同数。原因和复验hash见来源JSON。

两项源格式变化独立记录在EOF-FORMAT：credits-types.ts与credits-layout.ts各只删除末尾4字节／两个空CRLF行。旧Web／core报告的pins保持原受检时间身份，不能宣称它们与当前源码全部字节相同或重跑了未改像素逻辑；新build／package使用修后实际文件。

公开demo复用完整bg32与既有完整title，使用OFL MCBE Pixel／MCBE CJK与独立编写的中英内容。素材身份及许可见[credits-assets.json](credits-assets.json)；demo FINAL与独立assets-prep证明205静态记录／3215字符、27条emitted记录／131个whitelist字符无缺字，原OFL字体和许可证不变。这是源准备／字集证据；实际字体transport／paint另由展示页与消费检查记录。未复制安装版原staff／End Poem／quote／私有字库，未提供假education图。

最终catalog改为已验状态后另构建展示页：entry仅改变三个publication与三个validation字符串，另外71份文件（含CSS、字体、其他JavaScript、材质及calibration）字节相同。最终新entry的启动／Code及字体运输／Canvas两项smoke再次PASS；这两项不是新的不同合同，不将它们加进原built9的唯一计数。该最终构建关系见SITE-EQUIVALENCE与public04，运行时库index／声明／样式／资源未改变。

后续字体有界候选仍未晋升：只让ó走原glyph_00的两种固定混排分别有448／354个mask差；Mojangles em10 mono的14个ink拓扑虽吻合，保留原空列的固定paint仍500差，灰度128候选250差。纯源对源95ASCII统一转换只74个同时满足形状与真实字距，因此未把它用于ó或四个native holdout。没有删除空列、逐字拟合或把拓扑吻合当位置／RGB认证。

## 新采集帧的字体绘制核验（2026-11-01）

在已解锁桌面上，通过已安装的 PIX 2610.28，以 Packaged App / GPU Capture 模式启动实际 Minecraft for Windows 1.26.6005.0，沿 Settings / General / Credits 采集一帧。未进入世界或修改设置。原始 `.wpix` 与独立分析副本均为63,686,400字节，SHA256 `5f7b2995bcfab2cdbc84c18d49508f7557f49c0b79b959497cdfc56e7ebfc550`。保存与有限读取记录见 `.cache/credits-pix-live-02/LIVE-FINAL.json`，SHA256 `3f273cd2b84010a98b38450165112bbdc0d9a7d99b55eb3e750cfd9e656b9435`。游戏、PIX 界面和 Computer Use 均已关闭。

本次限定对象是首组**十二个重复的 `=` 字符**。实际 queue0 / API76、82（Global16、17）绑定的完整128×128字体纹理235，与本机原始 `default8.png` 全 RGBA 一致。实际 DXIL、VB/IB、常量及 sampler 共同证明：该组使用8×12字格、point/clamp 采样，并将 UV 钳制在字格的半 texel 边界内；阴影 Tint 为0.25，正文为1，阴影矩阵比正文向右、向下各偏移1个 GUI 单位，即本帧5个物理像素。

分别从真实绘制前画面出发，CPU 重放阴影和正文，对两份完整2570×1402目标逐 RGBA 比较均为0差异，每份3,603,140像素。读取严格遵循原 footprint 的10496字节行距，未把带 padding 的 blob 当紧排图像。研究见 `.cache/credits-pix-cpu-study-01/FINAL.json`，SHA256 `ba49877344fb894693700c282746c1f473e34bd31f4839ef554414dab1fc03c5`。

独立 CPU 复核再次得到两份完整目标逐像素、逐字节 RGBA 零差，并核验原始帧、字体及带 padding 的输入。它独立解析了原始 vertex 字节和 shader 实际引用的常量，没有再次解压整个捕获资源流；该流的出处仍依赖冻结的 decoder。复核见 `.cache/credits-pix-independent-01/FINAL.json`，SHA256 `ca433f20330c51061f6833307ef4ff2218feea243b418fd7fa562eda523ae046`。首次比较未引用常量尾部 NaN 的失败保留，后续按实际引用的字节核验；没有放宽像素门槛。

这不是独立生成整屏：两次重放都使用真实的绘制前背景，且字符只有上述 `=`。单独重建背景仍在Y1392一行有1530像素差异，最大通道差30，保留未通过结果。分页／变音字符／fallback、其他文字、logo、后续合成和完整 GUI 仍未由本帧认证；本轮没有修改库的默认字体、shader 或公开 API。

## 原始分页字格的限定预测（2026-11-01）

同一本机原始`font.brarchive`还包含完整的`default8_1.png`和`default8_2.png`。它们都是128×128，与第一张图的字格排列不同。原`default8.json`写有字高12、Y偏移−3和`ascii_extended:true`，但没有直接声明引擎怎样选择分页。源文件字节与行／字格分析见`.cache/credits-native-default-pages-01/FINAL.json`，SHA256 `50e5d05fe619cdab988de6b73f9a5c8884273ae302612ae9fdeb905b744bd800`。

新的候选使用每页16列×10个完整行、共160格：CP437 byte除以160选择页，余数选择整格。其协议先冻结，再执行源门槛和native比较；没有采用失败的TTF转换。CP437162选择原`default8_1.png`的`[16,0,8,12]`，完整字格含14个ink像素、bbox`[0,2,5,10]`，按此前相同的alpha右边界＋1规则得到字距6。95个可打印ASCII及å／ö仍取原第一页，源像素与字距不变。

对原来的`Carlos Lidón`整行，固定字格原点`[648,819]`、physical scale5、ROI`[648,821,1100,59]`及minRGB75／通道差≤2的同一前景分割门槛，得到**0差异、0缺失、0额外**，双方均3175个前景像素。新的源字距自行预测末尾n位于933，没有沿用旧模型从native测得的后缀位置，也未调整图形、空列、位置、字距、字号或阈值。

该阶段168个先前证据文件／FINAL的hash保持不变，14条独立第三图holdout的源字格也未改变，四个旧失败仍是3725／70／5／1405。结果只证明新增原始分页候选解释了这一固定整行的前景形状；没有新增原生采集，也没有证明唯一引擎索引、RGB、阴影、sampler、shader、vignette、其他文字或整屏。协议与完整结果见`.cache/credits-native-pagination-01/FINAL.json`，SHA256 `303d86e5e44db7892bf39ab51c3938ba3680b5a684b009e3b04ece7547ca55b5`。

### 范围映射与最终身份

包、实际安装与built展示页门已具名完成，覆盖表仅Credits行E→有限A；其余205行保留。A39／E0仅为固定206文件命名族快照，B16部分、C34通用候选、F16 Pocket未认证、G63可选未映射、H6未知仍在。受检功能包191／209与接下来仅文档重打包是两层身份。

最终**仅文档重打包**身份另记在`.cache/credits-release-01/PACKAGE-FINAL.json`，不能将上面的a190受检功能tar直接写成最终文档包。该产物比较要求新tar的executable／DTS／CSS／资源与受检tar完全相同；Git commit／push身份按Git历史和发布记录，本地source/built展示页不等于公网部署。

主要源与native证据见credits-source.json。当前Web实现并未恢复原生renderer阶段顺序、字体fallback、精确logo采样、end-poem／edu／held-speed、默认锚点／安全区或完整GUI RGBA。scope实施／Web合同／包消费／native逐屏仍分层记账；A39／E0只属于该206文件快照，不代表所有Minecraft GUI或native完成。
