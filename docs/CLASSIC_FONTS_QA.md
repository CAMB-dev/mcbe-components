# Classic DOM字体：来源、显式作用域与分阶段验证

初始Classic阶段增加从用户原font.brarchive准备有限COLR字体的本机工具，以及可选 `mcbeui/classic-fonts.css`；不将原字体编入公共npm，不自动恢复游戏字体选择 /布局 /Smooth shader。当时首批134列项中133通过 /1旧预期skip，normal-line受影响16项通过，React18 /19实际包经公共payload同字节链关联，生产147辅助检查通过。以下历史批次不自动认证后续字体和编辑布局修订。

## Book / Sign正文度量修订

本轮工具默认使用显式版本 `body-bounds-v1`：原Unicode printable ASCII的非空alpha横界为 `[L,R)` 时，advance取 `R-L+2`、源X偏移取 `1-L`；完整16×16字格和原像素保留，偏移同时应用于base和COLR paint轮廓。default8分支不变，space8源像素仍是声明的宿主策略；非ASCII不套用普遍alpha裁宽，CJK /全角保留full-cell＋2候选。可用 `--unicode-metrics legacy-host` 复现此前三face及旧metrics，历史原件不回写。

CPU研究的128个正文glyph实例涉及51个不同字符（25个ASCII、26个宽字 /非ASCII），以每run pen从零开始直接对照quad位置为零差；全角冒号18的有限字符串约束也保留，不代表95个ASCII或通用Unicode已原生验收。两条Sign caret预测各差1game单位，保留失败，不添加专用补偿。旧“相邻quad左边delta就是advance”的解释遗漏bearing；例如窄I /1会同时改变偏移。space与terminal独立拆分、任意文本、所有脚本及引擎selector仍未恢复。

来源研究 `.cache/font-advance-bearing-study-01/FINAL.json`（SHA256 `2a6d5c61c4c6a832bad94829dcd5cfa16a3991877e4b25514db5cf6e0a753a34`）和独立 `.cache/unicode-metrics-independent-01/FINAL.json`（SHA256 `d57b499266d0b89abacc501dbcef3f2214833c8398c88695e5c6812604153c99`）只认证有限CPU几何关系，不沿用旧字体的通过结论。

初次修后产物由 `.cache/classic-native-metrics-01/FINAL.json` 和独立 `.cache/classic-body-bounds-independent-01/FINAL.json`（SHA256 `411fde6fb94eccac7638082dc0322efeaf2669f49cc8dbf05afe128f46716623`）实际核验。当时字集补“像素字测试”五字，三face为194 /194 /95，共483；默认清单仍是下表189 /189 /95。47整原页、186,496个base＋COLR源cell中心采样零差，19个重叠Unicode ASCII轮廓仅做规则允许的X平移，94项重叠advance改变；default8与vertical模型不变。legacy同环境5文件逐字节复现，历史备份只有3WOFF＋metrics这4文件字节相同，provenance环境记录不同并单列；134份其他字体文件未改。

194阶段的79项、导航6项及React18 /19包实际通过，原报告 `.cache/book-font-role-qa-01/FINAL.json` 与当时package日志保留原范围；后续扩集不覆写这些结果，也不重复累计相同用例。

公开预览首批实际只执行7项，6通过 /1失败：Welcome样本6个Han使用了MCBE CJK fallback，尚未执行后续native宽度检查。报告 `.cache/book-sign-typography-public-01/FINAL.json`（SHA256 `d79d5a7cc38e900462f547081991cd7ee28e55b6a3f5bcf0121178d4748ea23b`）保留；有限字体原本允许fallback，但该样本不满足整值Unicode face的严格示例目标。本轮选择补齐实际示例字符，不采用放宽断言的备选方案。

206阶段的可复现corpus `scripts/book-sign-font-characters.txt` 当时含两个Book /Sign demo与native样本所需21个Han，排除注释。相对194字集缺12字，输出扩为206 /206 /95（507 mapped）；脚本默认189清单、度量规则和UI未因此改变。独立 `.cache/classic-demo-glyph-extension-independent-01/FINAL.json`（SHA256 `8aa9823cbb74e6a1d5f7c58ff9fcf2ba6143a956966249778a56d5a8bd6cb2c4`）核实旧483字形base /COLR /hmtx /源metadata /vertical不变，新12Han的12,288原cell采样零差；47原页保留，只增glyph_56为第48页，134份其他字体及archive不变。当时corpus的唯一一次check-only实际exit0 /9.521秒，active5文件SHA与mtimeNs不变。

206字集已实际完整重验79/79（Book39 /Sign30 /Classic10），84.256286秒，零跳过 /重试 /flaky /report errors，747项选定输入加5 harness共752 pins不变；三face实际206 /206 /95均加载。7幅240×48源POINT平面80,640像素严格RGBA0，固定host x8 /baseline24、不遮罩 /拟合；Book原翻页13,824像素另计。canonical `.cache/book-font-role-qa-01/formal-206-01/FINAL.json` SHA256 `efdebb158b97c01c2998b46785929088711d60a1631a1c61465ca4f17abbf936`。整6项旧导航在此profile另通过，26.321183秒；不重计旧Dialog或194同项。当时React18.3.1 /19.3.1实际包消费也通过140值 /SSR /新类型及factory /strict TypeScript /样式 /资源 /许可，日志 `package-verification-206.log` 位于 `.cache/book-sign-typography-close-01`。文档包另做非文档身份比较，不借此改变历史消费者范围。

公开03批37/37辅助检查通过，20.477秒，三私有face真实加载，747输入 /327dist /59site前后不变。真实Book逐页 /Sign整值Unicode家族、输入身份 /选区 /合成composition /只读禁用 /重开 /portal /窄屏均检查；严格single-Unicode gate未放宽。Book已知混排Canvas advance231 CSS px在244内容宽内，Sign为236 /240；这只是有限浏览器度量，不是native自动换行或RGBA比较。记录 `.cache/book-sign-typography-public-03/RESULT.json`，页面 /consoleError /HTTPerror /requestfailure为0，4条整页ReadPixels性能warning保留。旧01首败保留，02未执行；补字后的成功不回写旧失败。

该corpus不包含字体二进制或字形艺术，也不代表其他demo /任意Unicode覆盖。37项辅助不加入79正式；私有字体仍不进npm，native Smooth /AA、精确clip下边、全95ASCII宽度、未知字符对、caret与完整DOM原生栅格均未认证。

后续Book实际组件比较暴露页码 /签名标签还需“共第签页”四字，当前corpus明确扩为25个Han，输出210 /210 /95共515 mapped，默认189清单与度量策略不变。独立 `.cache/book-ui-font-independent-01/FINAL.json` 实核旧507字形 /度量不变，新增四字4,096原cell采样零差，仅增完整glyph_98为第49页，134份其他字体及archive不变。

实际postFont比较的CDP确认所测两页码与footer节点均只使用其Classic /Unicode face，旧MCBE CJK fallback在这些有限节点上消失；但四个完整native目标仍有48,661 /52,275 /46,489 /50,103不同像素。来源为 `.cache/book-native-component-compare-01/FINAL-FONT-03.json`，详细分区见 [BOOK_QA.md](BOOK_QA.md)。这是新字集独立审计与实际有限比较，不套用旧206证据或声称all-Unicode /整GUI通过。

## 三个face与有限字符集

`scripts/classic-font-characters.json` 默认95个可打印ASCII（U+0020…U+007E）及94个demo用到的CJK /中文标点 /全角字符。94字符由实际TypeScript AST的StringLiteralLike /JSXText /template片段提取，排除注释；清单是一次有限snapshot，不是所有中文或动态用户文本覆盖证明。

| Family /本机文件 | 默认glyph数 | 明确角色 |
| --- | ---: | --- |
| MCBE Classic /MCBE-Classic.woff2 | 189 | ASCII取default8，非ASCII取原Unicode页 |
| MCBE Classic Unicode /MCBE-Classic-Unicode.woff2 | 189 | 同字符集全取Unicode页，包括glyph_00中的ASCII /digit |
| MCBE Classic ASCII /MCBE-Classic-ASCII.woff2 | 95 | 仅default8可打印ASCII |

每个face的space是有advance的合法空glyph，非空paint分别188 /188 /94。default8完整8×12 cell及原y offset−3保留，Unicode完整16² cell转换为独立原texel轮廓，不从截图 /capture mesh拟合、不trim字格或重采样源图。COLR foreground layer使用当前文字颜色；原白色binaryalpha单元与重新打开字体后的base /实际paint轮廓分别检查，不只检查cmap /advance或外观空壳。

当前字体内部host模型为EM1000、建议20px字 /metadata lineHeight20：glyph construction baseline仍8game /800units，typographic ascent /descent另为900 /−100（9 /1game），Win metrics900 /100；两者不能混作同一baseline。它不是主题对所有控件的line-box指令。native相邻pen仅在有限ledger已观察字上标记来源，其余advance是host候选。独立space /terminal拆分与通用Unicode宽度算法仍未恢复，源像素一致不证明浏览器Smooth /AA一致。

### 已有native的Unicode“+7 ”约束

`.cache/classic-font-metric-constraints-01/FINAL.json`（SHA256 `51dde50ab82491bc54a000642e633ab11d4552cf0a5e64d05dbb0a467cff0be2`）独立重读原VB /CBV：Global95的plus pen0、digit7 pen4.5game，Global100首CJK pen12.5game，且使用相同MVP。直接约束为Unicode plus advance9CSS20、“+7 ”总25CSS20、“7＋space”合16CSS20。旧alpha宽度候选plus10 /digit7 9漏掉了已有真实数据，不能继续称其在已知范围正确。

Unicode修正为plus hmtx450units；digit7选400、space保持400，即CSS20的9 /8 /8。只有plus9与7＋space总16被native相邻pen独立支持，7 /space各8的拆分仍是host候选，未恢复通用terminal /spacing算法。Host /ASCII default8字宽不改，outline /bearing /vertical metrics不为该约束拟合。

旧 `.cache/classic-font-production-equivalence-01` 的327个重叠glyph等价属于修前真实记录，保留原件，不能覆盖最终两个Unicode hmtx变化。修后 `.cache/classic-font-metric-update-01/FINAL.json`（SHA256 `be3adda4e977b48706477acff67d574d49c98e11116c16e630e2ce260eecc013`）及独立equivalence-02实际检查三face473个mapped字符、949份base /paint /.notdef glyph轮廓：轮廓 /bearing /cmap /COLR /CPAL /vertical均不变，只有Unicode plus /7的base＋paint共4项hmtx变化，space400不变。Host /ASCII整个WOFF2字节不变。

独立 `.cache/classic-font-production-equivalence-02/FINAL.json` SHA256 `af007d5a8c0b05e20a4d8314ef6372acc900ec5e9e2caf2297bd434185923f61` 还复算由hmtx正常派生的minRightSideBearing100→50、xAvgCharWidth669→668及checksum变化，不把这些horizontal summaries伪称baseline修改。初私有comparator误期待plus LSB0、实际应为未改50的失败保留；只改测试期望，未再改font。该CPU结构验证不等于browser /native pixel；早期四Anvil字符串无plus /7，原型测量不回填。

以上metric-update阶段的“vertical不变”只针对该次相邻pen修复；随后uniform normal-line阶段有明确独立vertical变更，见下文，不把旧800 /−200当最终字体。

## 本机准备与追加字符

工具在本项目源码仓库运行，需要Python的fontTools、Brotli、Pillow，也可使用已有 `.cache/python` 依赖。npm包的files不含scripts目录；仅安装npm的用户应先取得源码仓库、在其中准备，再把自己有权使用的WOFF2复制到应用资源路径并登记font-face。默认只读已固定来源的本机font.brarchive：

```sh
python scripts/prepare-classic-fonts.py
python scripts/prepare-classic-fonts.py --check-only
python scripts/prepare-classic-fonts.py --unicode-metrics legacy-host --check-only
# 也可传用户自己的固定来源archive路径；输出仍只在项目cache。
python scripts/prepare-classic-fonts.py "C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive/font.brarchive" --characters "示例"
python scripts/prepare-classic-fonts.py --text-file "my-ui-text.txt"
# 复现Book /Sign两个demo的明确字符范围：
python scripts/prepare-classic-fonts.py "PATH/TO/font.brarchive" --text-file scripts/book-sign-font-characters.txt
python scripts/prepare-classic-fonts.py "PATH/TO/font.brarchive" --text-file scripts/book-sign-font-characters.txt --check-only
```

`--check-only` 使用相同字符范围只在内存验证；`--unicode-metrics legacy-host` 可与相同输入组合复现旧度量政策，但新增字符会改变输出字集，不能据此承诺与不含这些字符的旧字体整文件相同。

输出仅ignored `.cache/local-fonts/classic` 的三WOFF2、font-metrics.json与provenance.json。`--characters` / `--text-file` 追加有限字符，不改默认清单；UTF8文件最多1MiB，unique字符最多4096，CR /LF分隔，TAB /其他控制字符 /非BMP /缺源页或不支持cell显式拒绝。每requested cell必须白色可见墨与binaryalpha，非白 /partial alpha /不支持空cell拒绝，不静默改图或补字。`--check-only` 内存构建验证，不写文件或更新时间。

`.cache/classic-font-preparation-01/FINAL.json` /REPORT.md记录真实CPU准备、repeat /check-only /追加 /默认恢复与负控；默认189 /189 /95覆盖44原页，90,688个base及90,688个COLR paint texel采样分别零差。旧74个字体文件与早期三候选字体不变。该证据只证明有限源图 /字体构建，不是native浏览器RGBA认证。

另 `.cache/classic-font-input-boundary-01` 保留真实输入所有权bug与窄修复：此前text-file可以指向owned输出内的provenance.json，随后prepare会替换同一输入路径。现在archive /text输入先解析，若位于owned Classic输出目录内即在读源 /建目录前拒绝，外部alias指入owned目录同样拒绝；原外部hardlink输入由atomic目录项替换保护，并非write-through。永久synthetic Python suite5项涵盖COLR /helper /CLI边界，独立报告记录实际通过，不把这5项当作最终browser suite。

fresh-use也已实际验证：仅两个tracked文件（prepare脚本与字符清单）及Python依赖，直接读用户archive即可生成相同三font /metrics，不需要旧capture、PNG或74个旧font cache。旧font snapshot只属既有环境保护验证，不是使用脚本的前置资源。archive与派生WOFF均保持私有；最终metric-update身份另由上面的修后报告核对，不沿用修前Unicode字节。

## 使用与font-face加载

```ts
import 'mcbeui/styles.css';
import 'mcbeui/classic-fonts.css';
```

classic-fonts.css只有 `.mc-classic-fonts` 显式scope及font tokens，无font-face或原字体数据。宿主在有权使用的私有资源路径登记三个同名face；例如：

```css
@font-face {
  font-family: 'MCBE Classic';
  src: url('/private-fonts/MCBE-Classic.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
/* MCBE Classic Unicode /MCBE Classic ASCII分别登记对应文件。 */
```

将 `mc-classic-fonts` 加在documentElement可让Text /Input /菜单及portal Dialog继承同一根字体；局部scope只作用其后代，document.body portal不会自动继承局部祖先。建议根scope，或宿主为portal另提供对应scope。该class设置常规 /sm字20px、lg /title40px、xl60px，但不改已有 `--mc-line-height:24px`；workstation /Anvil自身20px line-height规则也保留。metadata lineHeight20只属内部字体设计，导入CSS不会自动把全部控件改为20px行高，也未认证普通控件native linebox /baseline。

Vite的demo私有入口先核metadata与三WOFF2的family /文件名 /hash，再登记font-face；缺完整资源不提供Classic选择，损坏metadata /字节拒绝并要求重新准备。`hasClassicFonts` 等flag属于demo虚拟模块，不是npm导出。应用测量应等待实际face加载，不能把fallback成功当原字体已用。

demo根级三选为Classic /本机Mojangles /开放字体：本机Classic准备好时默认Classic，否则本机Mojangles存在则用local，再否则open。这是demo选择政策，不修改npm默认font或calibration旧Mojangles profile。语义DOM /编辑节点、portal与真实input继承已由正式及生产各在有限合同范围验证。

Anvil费用使用 `--mc-font-unicode`（缺省回退 `--mc-font`），success默认 `#7fff1f`；可覆盖 `--mc-anvil-cost-success-color` /failure色及阴影tokens，shadow offset默认2CSS px。费用整句Unicode是显式CSS角色选择，不是自动恢复native cmap /整run绑定算法，也不把该默认shadow称为GUI5原生2physical px。

Classic scope另显式设置 `--mc-item-tooltip-font:var(--mc-font-unicode)`，ItemTooltip整run使用该角色；inventory.css中为 `var(--mc-item-tooltip-font,var(--mc-font))`，未设置时默认fallback合同不变。这里只选已知Unicode角色，不按containsCJK等启发式自动切字体，不改tooltip padding /outline /JS定位，也不把字宽约束当作完整tooltip框或native shader认证。

## 原型改善与保留的非零结果

`.cache/default-font-prototype-01/FINAL.json` /RESULT.md为早期较小字符集三候选的实际原型，非最终189字face /完整主题的生产验收。四观察scene×五组共20辅助measurements，不加正式用例：

| Scene | 旧CSS18 | Gallery20 | 已有source profile | A: 原cell Host20 | B: A＋Unicode cost /颜色 |
| --- | ---: | ---: | ---: | ---: | ---: |
| QA | 56,559 | 61,751 | 0 | 54,372 | 53,226 |
| Long | 67,753 | 72,166 | 0 | 65,442 | 64,296 |
| Empty | 39,645 | 43,217 | 0 | 37,850 | 37,850 |
| Invalid | 43,960 | 48,357 | 0 | 41,392 | 41,392 |

数字为完整2570×1402的差异RGBA像素，完整ROI也保留、不遮罩 /放宽容差。原12份CSS /source baseline hash不变；四source全0仍只属其显式GPU字体 /布局路径，不给普通DOM候选转移零差结论。title /inventory /B-cost墨边仍比native高4physical px，ASCII QA高3px；即使离线解释性平移仍有AA残差。cost shadow仍5physical px而native观察为2，long输入overflow也未因advance正确自动恢复。

早期空COLR foreground层的构造问题与修正保留来源；首次浏览器harness误把CSSOM带引号family判错、只截三baseline即停止，原失败未改成成功。仅规范化family序列化引号后完成原型，未改字体 /target /容差。原型source页面7 ERR_ABORTED保留、generation未记录，不倒填；candidate requests /非取消网络 /page /console errors0。它不证明当前集成无需字体fallback或所有编辑 /GPU一致。

## 已采纳的统一normal-line模型及真实退化

`.cache/classic-font-normal-line-native-01/FINAL.json` SHA256 `82701450b6e99bccf255e3b4c64f9a385ff88c86519bb3231dc8bb3980b0ea88` 比较修后P字体与V统一normal-line候选。保持glyph坐标 /hmtx、字号 /linebox、geometry /原图 /shadow不变，仅改typographic900 /−100；不是按已见4px差逐label拟合。四场景完整native差异像素如下，完整ROI /alpha与原target保留：

| Scene | P: 修后原Classic | V: normal-line | 显式source profile |
| --- | ---: | ---: | ---: |
| QA | 53,226 | 49,631 | 0 |
| Long | 64,296 | 60,343 | 0 |
| Empty | 37,850 | 34,886 | 0 |
| Invalid | 41,392 | 38,081 | 0 |

整体改善同时存在真实局部退化：inventory27固定区域每帧7,830→7,851（+21像素），字墨最后一行越原标签分区1px；QA /Long recipe区域7,019→7,038（+19）。不改分区或裁掉该行。CJK从高4physical px变低1，QA从高3变低2，仍非精确baseline。Smooth /AA、默认shadow5physical px对native2、long overflow也仍非零；不能把全帧改善写成每个区域改善。

随后 `.cache/classic-font-normal-line-production-01/FINAL.json` SHA256 `3df2ebb4f465d4bbf6ec5b47be7df74f4d34b05056dabcfe6124c64001e5b615` 采纳该统一host模型，三family名稳定。完整473mapped /949base-paint-notdef glyph坐标 /hmtx /cmap /COLR /CPAL均不变，仅typographic /clip-safe vertical与正常checksum变化；glyph construction800与typographic900明确分开。prepare /repeat /check-only及5个永久synthetic项在其source实际通过，不代表最终browser通过。

## 正式批次、包与导航的版本范围

首 `.cache/classic-font-independent-qa/FINAL.json`（SHA256 `fb1afc8bf8bed1aa2d9a95630c791663ba93d9c52584f93cf618ab178dcaeee7`）实际134列项 /11files，133 PASS /1原有desktop mobile-only skip，移动对应项通过，0fail /retry /flaky，447.396258秒，876pins不变。Classic10 /10，三20px有限POINT plane共34,560完整RGBA像素0；原archive独立期望，固定x8 /baseline24、不fit或放宽容差。它不认证native Smooth /全部glyph或唯一COLR paint路径。

该首批使用normal-line采纳前的字体，原报告 /876旧pins不改。最终phase2整Classic10＋desktop导航6实际16 /16 PASS、43.468656秒、0skip /fail /retry /flaky，新的876pins前后相同；同预声明standard SwiftShader /Vulkan /worker1。原PNG期望与Canvas baseline24不改，三20px POINT planes共34,560像素仍RGBA0；实际hhea /OS2读数900 /−100 /0、Win900 /100。不是最终字体全134重跑，也不新增计为另一16个全新测试。

`.cache/classic-font-independent-qa/phase2-01/FINAL.json` SHA256 `7814f164cb574e226af4ca520f53966ccf1cec4646f9abe162c4d5b5dc8bd1af`，RESULT.md SHA256 `8ae37ef4070f01b86b23a4f319f7fc340536674d4c3b3855c7648cb1f5aa4f78`。实际font加载、root /portal /选择 /composition /fallback /role与导航在该有限browser合同通过，不扩为真实OS IME /native Smooth /全部glyph /唯一line算法。

首次实际verify:package exit0、47.87秒，React18.3.1 /19.3.1 SSR /strictTS /CSS /assets /license通过，134runtime，257dist（新增classic-fonts.css）在tar /build /两consumer同字节。已测 `.cache/classic-font-production-01/package/consumer-verified.tgz` SHA256 `02cfccdc53fcdf1976e56e75067492249cc5e0c7f67aaa5676747b995d376999`，JS SHA仍为 `b34ec8061062be8731c7ae5493cf1888883dc1c270bfc5a2885a7147f84ee1bb`，declarations不变；原dist只Anvil /inventory CSS改变，新增Classic CSS。三私有WOFF2及metadata均不入包。

之后private font改为normal-line，仅实际执行typecheck＋Vite site重建，14.08秒、exit0；没有重建库、重装或重跑consumer。`.cache/classic-font-production-02/build/site-identity.json`（SHA256 `c5350eff2d1c57b7462e86e4a8c5219ea2dfdb82b095efca931db869d506fc52`）确认全部257dist /260非文档包条目与首02cf已测consumer包同字节；最终49site独立建立新身份，不把首462pins说成字体变更后仍不变。

新build/pins.json SHA256 `c253f2c5a21844acd90ebf382f152b85f5cd72b7e76490ea8906423408b2187c` 登记最终source /site；本轮变化是prepare脚本 /三私有WOFF2 /metadata。旧包 /旧462pins保留原始时刻，未用新字体回填。文档补齐后的实际npm pack已独立逐条核验：全部260非文档payload与02cf已测包同字节，变化仅README与docs；消费认证通过该身份链关联，未重跑consumer。

## 最终生产：实际字体使用与147辅助检查

`.cache/classic-font-production-02/production-attempt-03/FINAL.json` SHA256 `566b27b2afa85b7fc84e784dacc5534e6a2c74cfe21704921dfc00cf28540a91` 记录实际exit0、26.82648秒：72profile＋75Source Anvil＝147辅助checks，不增加正式项。真实input编辑 /选择、combobox popup、body portal Dialog、三profile /390px局部pan、BitmapText导航及39槽recipe /synthetic composition fallback通过；未替换语义DOM或改calibration的独立Mojangles20px配置。

FontFace load与实际用字体分开验：CDP CSS.getPlatformFontsForNode对有限Latin /中文specimen、input内部文本节点、popup option及Dialog记录实际custom font。Classic有限样本用MCBE Classic，local Latin为Mojangles Pixel、open Latin为MCBE Pixel；后二者中文用MCBE CJK。只证这些已录字符串，不能推断全部Unicode /动态混字不用fallback，synthetic composition也不认证Windows真实OS IME。

11个登记字体资源分成10 HTTP与1 inline data URL：HTTP逐完整bytes /site hash相同，inline ASCII只对解码bytes SHA，不赋HTTP状态。三prepared Classic face与最终normal-line metadata相符。8 HTML /script /CSS入口及最终257dist /49site同字节，main-DcaGjICB.js 171,992bytes SHA256 `9d087f33bfd4611343bf732c1c58a8eda8c76a34a02b8e8510281e240c70bf01`。

profile raw请求失败0，Anvil raw3项全ERR_ABORTED、三distinct URL回访HTTP200 /bytes同；另29个observed字体HTTP资源逐字节核对。page /console /render /非取消网络错误0，不删取消或写全部请求成功。actual standard SwiftShader /Vulkan、无GPU资源hook，不将字体加载 /CDP样本 /147交互检查推广native RGBA /总VRAM /通用布局证明。浏览器已finally关闭、GPU释放，用户tabs /4173 preview未动，无CUA /桌面操作。

前两次production harness失败保留在production /production-attempt-02：第一次把close right:-4px的clip外延误判滚动条，真实scroll为0 /0；第二次窄屏选到隐藏的重复topbar导航link，改明确sidebar selector后完整通过。只修harness断言 /selector，未改布局 /源font /期望图或回写失败记录，不把attempt03称首次全过。

demo scrollspy曾在bitmap /Anvil等anchor误高亮前一项，`.cache/demo-navigation-02/FINAL.json` 独立6case是原阶段证据；上述phase2已与最终normal-line字体整文件重跑6项。CPU字体prepare、导航与有限POINT证据均不作生产或native整GUI通过。默认字体整GUI pixel perfect、Smooth /AA、完整Unicode /动态混字、terminal /space、caret /真实IME /其他DPR与Present继续是未完成目标。

## 许可与分发边界

编译WOFF2包含原游戏字图的派生轮廓，保持ignored /用户私有；不因生成脚本的代码许可而变成项目MIT或OFL字体。公共CSS只含token /scope，不含原font-face资源；npm不带这些WOFF2。启用本机资源后site可包含它们，不能把本地演示构建直接当可公开字体分发包。
