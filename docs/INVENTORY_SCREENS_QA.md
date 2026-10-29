# 玩家背包、创造物品栏与配方控件独立 QA

第三轮，2026-10-29。范围：Classic desktop、Web GUI2 / Chromium DPR1。源码与原图期望从用户安装版1.26.6005.0的原始archive独立提取，再和Mojang v1.26.60.5 full ZIP核对，未从生产CSS或生成manifest反推。

公开ZIP SHA256：`d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。[官方full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)。`inventory_screen.json`本机原字节SHA256 `8c3a6a756bc47500d237ebceea389d1f08d9e0dcdb02ab806ab3a03a51a22a6b`，public原字节`10e72254bac2a95801b61cb229ad43ab793ec585a52aee7e27791e79ab6d9f80`；完整parsed对象一致。模板`ui_common`、`ui_template_tabs/toggles/buttons`也直接解析原始archive并比对public。

## 新增附魔台物品预览：源预设与完整Web期望

`BlockPreview block="enchanting-table"` 已加入，组件 / 运行时值仍118 / 125，renderer原始资源由45增至48。top / side / bottom均是官方原16×16 PNG，blocks.json / terrain_texture别名一致。捕获实际Global57中第三个block的12个顶点、18个索引支持16×12×16预设，侧面UV取 `[0,4,16,12]`，三个可见面顶点全白，不施加石块经验暗化。

这是源/可见面支持的可复用模型约定，非恢复的native object-space axes / CPU camera。底图完整原文件与atlas tile一致，但捕获未绘底面，不能声称底面绑定或朝向已认证。保留模型、camera、textures与lighting覆盖，无捕获全局hotbar坐标写入默认。源审计 `.cache/enchanting-table-item-source/REPORT.md` / audit.json。

独立 `.cache/enchanting-table-item-qa/FINAL.json`：20/20 PASS、0skip/flaky，57.5秒；新增8＋旧12。三PNG与原别名独立核对；前/右/顶/底四完整80×80视图共25,600像素及两组覆盖视图12,800像素，对独立Web期望合38,400像素RGBA零差，包含侧面视图20px透明顶部，不做silhouette mask或容差。该Web合同不认证默认native camera，也不替代下文旧完整原生RMSE；旧报告与期望未改。

### 仅替换缺失物品的整页辅助对照

冻结 `.cache/full-gui-enchanting-table-preset/FINAL.json` / RESULT.md 记录8组合（before/after×public18/gallery20×default/captured book）。before四组完整RGBA hash均重现旧基线，旧60份文件原SHA未变；after仅将hotbar第三格缺图换成新BlockPreview，保留同一747,600像素面板＋halo、相同source root / scale / ROI，不移位、fit或mask。

| Profile | 整面不同像素 前→后 | 整面RGBA MAE 前→后 |
| --- | --- | --- |
| public18 | 51666→49520 | 4.058101926→3.767670546 |
| gallery20 | 53523→51377 | 4.238693486→3.948262105 |

固定table100×100区域 `[1055,997,100,100]` 不同像素3919→1773，MAE29.455675→7.743025，但**最大通道差143→252更差**；它包含槽边与underlay，不是纯block误差归因。每组整面sumAbsRGBA减少868506，实际before/after变化3568像素全部位于此固定区，区域外0变化。完整native framebuffer→独立PMA参考3,603,140像素零差只认证参考呈现；生产普通React的整面max仍255、alpha差1760，nativeParity仍FAIL。

两种book分支仅在这个已测open状态得相同指标，不外推其他姿态 / CPU动画。该辅助实验不增加正式case，旧原生RMSE和旧整页报告不被改写；camera与native物品CPU变换仍未知。

本轮verify:package与实际React18/19消费通过，含125值、48原素材及新预设，两消费者各256份dist与本次dist同字节；当前受测包身份见 [VERIFICATION.md](VERIFICATION.md)，不借用此前包hash。填入新模型的整页辅助测量见上节。生产18项辅助检查通过：6canvas实际ready/非透明，5预设真实popup切换触发绘制、切回table原hash不变；3原PNG响应SHA匹配，图库直达与320px无文档横溢出、错误为空。`.cache/enchanting-table-production/identity.json` 的8入口与site同字节，smoke.json记录可见操作；辅助检查不增加正式case，也不认证nativecamera。

## 玩家容器布局

所有坐标为game pixel，Web GUI2时乘2。根176×166。四件护甲grid `[7,7,18,72]`；offhand `[79,61,18,18]`。玩家renderer黑背景 `[26,8,52,70]`，border `[25,7,54,72]`。原`live_player_renderer`不可通过一个占位图或自绘人像认证；组件仅接收宿主预览。

crafting_panel位于根右半x88，大小88×83；2×2输入 `[96,18,36,36]`，结果槽 `[152,26,18,18]`，箭头 `[134,29,16,13]`。与其他工作站的22×15箭头、26×26结果槽不同。背包27格 `[7,86,162,54]`，hotbar `[7,143,162,18]`，原该profile没有Inventory标题行。

原生GUI5截图的右侧pane约原点 `[1226,282]`：armor `[1261,317]`、2×2 `[1706,372]`、output `[1986,412]`、offhand `[1621,587]`，支持上述源模型。完整raw PNG包含用户avatar，仅本机保留，不随测试素材公开；SHA256 `ffa64629906b82535271e1670b62639a877378c856b473b169426f2b59c718eb`。边缘存在native采样混色，近似根位置不等于整块RGBA0认证。

## 搜索、类别和状态

RecipeSearch对应原`common.text_edit_control`：maxLength30，输入height16，white normal字体、shadow=false；内centering宽减6、高减4，label高10且offset `[10,0]`。magnifier8×8、offset `[0,-0.5]`；清除按钮15×15、offset `[2,0]`。清除/过滤动作的Web语义与源绑定范围分别记录，不推断全部游戏绑定条件。

Craftable toggle为29×17，但4张原PNG只有27×15。模板button_image为`100%-2px`，故原图应在按钮内留1game四边，不能直接拉满整个29×17。模板变量名容易误读：unchecked=`default_texture`→off，checked=`hover_texture`→on，unchecked_hover=`pressed_texture`→off_hover，checked_hover=`pressed_no_hover_texture`→on_hover；locked取对应off/on并alpha0.5。

类别slot宽25；navigation override23高、content加4，视觉tab27高；四类别图标原17×17，search类别原magnifyingGlass16×16在source tab_icon17容器内显示。中间/最左/最右及checked/hover各有不同源图，不能用通用Tabs边框替代。

Creative宽视图与原生Player旁的146宽recipebook是不同profile。未取得相同状态Creative截图前，其总frame/hotbar与动态collection项数不可因源推导而声称原生pixel perfect。查询过滤索引和宿主游戏库存规则由调用方控制。

## 执行记录

新增64项独立测试和专用fixture：原36项控件source检查、2项renderer来源/UV检查、3项renderer独立native差异测量、Toolbar及完整Creative新增23项。54张固定原PNG来源/hash/尺寸审计已通过；独立皮肤比较覆盖五种armor、完整previewborder、箭头、十二种tab边缘/状态、五个17game图标和四种filter状态。所有报告写入`.cache/inventory-third-qa`，独立5194；无共享test-results。完整PNG边缘、alpha及状态比较要求RGBA0，无扩大容差。控件source部分36项均已取得PASS，详见后文分批执行记录；renderer三项native是测量仪器检查，执行通过不代表原生零差。


## 已检出并修复的差异

独立source复核在测试前发现装备焦点少了boots→offhand和craftgrid两侧explicitlinks，producer已补，真实键盘测试通过。无demo reset时preview原尺寸还依赖consumer的box-sizing，已显式设为border-box。首次完整batch中previewborder原图不透明中心被遗漏：CSS缺`fill`，完整皮肤中14560像素与原图不同；正常scene的黑色子层覆盖了该区域，不能因此把原图缺失当作通过。修复保留原图中心和完整边缘，未改期望或容差。

第三轮原始59项（本文件36+交易23）首轮55 PASS、4 FAIL。库存1项是真实previewfill差异、1项被其他agent保存`src/item-renderer-engine.ts`触发Vite full-reload中断；捕获triggeredBy路径，未自动重试掩盖原因。交易的两项locked差异见另一报告。定向9项中previewborder与受HMR影响search-tab均PASS，原图和RGBA0容差保持不变，库存36项全部取得通过。不是同一次全量36绿；父任务最终统一集成会重跑。

## 真纹理渲染器附加审计

独立按官方full ZIP构造42个banner pattern+base+stone/stonebrick两图的45文件集合，对bundled原PNG/TGA逐字节比较45/45一致。未调用producer准备脚本或manifest决定期望集合。本机证据`.cache/inventory-third-qa/renderer-independent-45-source-proof.json`。

独立Python解码TGA type2/type10、bottom-origin，并固定完整RGBA SHA：base64×64为`287aa01e48cd69f173821d3c1dd5685c92541a5f3005bb1551c7f38edf0ac396`；stripe_bottom为`cfc75484f89c8e29f01c0c404bbb1144d06a67b9a2d5aec0434f5b3fe52a2de7`；cross为`6422732d1dc51ed392b4fdf8ec53ceca1d4cd9fefe5ee05ce69d1f673cb016ae`。原pattern有alpha175/176的边缘，gradient还有连续alpha，不能转二值mask。

原生Loom实际32格：4×7+4，动态collection的完整引擎registry不在公开JSON内。固定每格front35×70、原TGA前布UV `[1,1,20,40]` 的二值形态对照有25格0差，5格有少量边缘残差；两种gradient应以连续alpha比较，不能用相同阈值当作完整RGBA结论。独立形态核实还纠正了diagonal_up_left/right和diagonal_left/right的命名顺序。完整native原图与rawRGBA测量将继续记录，不能把原图相同或近似轮廓相同写成原生renderer pixel perfect。


原生renderer测量的期望只来自固定真实原PNG区域，未读取生产CSS、mesh或manifest反推原图：32个selector各35×70，stone/bricks/slab/stairs各完整80×80，white/red cloth两个完整100×200。PNG固定SHA、尺寸、ROI随测试保存；没有mask掉轮廓或AA像素。测试名称显式`MEASUREMENT`，输出changed/RMSE/MAE/max和exact布尔，非零残差标`NOT EXACT`，无“低于某阈值即pixel perfect”的验收。

新`loom-white-red-stripe-native-lossless.png`的实际图案经独立检查为stripe-right：完整预览右1/3红、中线白；原始文件名和SHA保留。不可把拍摄时推测的stripe-center当作GT，测试使用真实可见ID。


## 原生完整创造模式与 InventoryToolbar

新增真正默认chrome，独立源式总宽126、高20；Creative锚点 `[200,-20]`，背景 `[200,-23,126,28]`。宽126来自8+25+2+25+1+25+4+15+15+6。mode三button各25×18，local左8/35/61、top1；原图标19×13位于mode内 `[3,2]`。help hit15×15 local `[90,2.5]`；close互动21×21 local `[102,-0.5]`，其15×15glyph `[105,2.5]`，不能把互动范围缩成glyph尺寸。mode4种blue状态和原focus_border、三glyph、help/close default/hover/pressed/focus均独立比较原始PNG，背景的28game视觉越界也完整包含。

Creative原search的label是`All items`，source右对齐；frame内box `[9,8,309,10]`：314宽stack的子holder315减3+2+无条件1px padding=309。Search `[6,19,314,16]`，items `[6,37,314,123]`，hotbar背景 `[76,161,174,28]`。overflow状态17列306game、viewport308，居中后首格 `[7,37]`；无bar时314宽body中居中首格x10。empty状态原生没有额外可见文字，Web状态保留sr语义。

真实zz空viewport PNG SHA256 `e80e45039a664004805e9a1f91a2d97806e16edf209f4a7e57f7316b37c554ca`，固定原生ROI `[506,467,1570,615]`共965550像素。原图949245像素灰93、15690像素灰47；最左边另外605像素灰94及10像素灰49。完整Web测量changed16305、RMSE0.1302674281、MAE0.0169074621、max3、exact=false：15700像素shadow量化（Web46、native47/49）及最左605像素边缘采样残差。没有裁掉最左列，没有用低RMSE作为0差通过。生产保持源alpha0.5；0.49虽可调平单一背景，却可能误伤彩色，不作未经验证的全范围alpha偏移。

本轮额外发现：正式calibration后注入`system-screens.css`，其导入settings基础CSS，同specificity的`.mc-search-field .mc-input {grid-area:2/1}`覆盖RecipeSearch composition，导致outer32+32两行、input和magnifier错位；独立页只引库存CSS不会复现。这是实际组合样式依赖问题，不能通过改测试期望64规避。另Toolbar glyph隔离时必须保留实际节点继承的pixelated，否则clone造成bilinear假差异；测试先断言原节点pixelated，再恢复该已存在属性。

## 实际渲染器完整原生残差

以下直接读取实际canvas，不从producer mesh/CSS生成原图。所有完整ROI保留；指标没有误差容忍门槛，均`exact=false`。

| 区域 | 不同像素 / 总像素 | RGB RMSE | 最大通道差 |
| --- | --- | --- | --- |
| 32个selector（35×70每格） | 7537 / 78400 | 单格0.1365…1.3566 | 6 |
| Stone（80×80） | 2012 / 6400 | 3.5422 | 69 |
| Stone bricks（80×80） | 2555 / 6400 | 4.0480 | 77 |
| Clean slab（80×80） | 1509 / 6400 | 5.0326 | 75 |
| Stairs（80×80） | 1943 / 6400 | 6.5320 | 70 |
| White/red border cloth（100×200） | 970 / 20000 | 2.8670 | 26 |
| White/red right-stripe cloth（100×200） | 970 / 20000 | 3.7111 | 33 |

Clean slab来自新单件hotbar图（SHA `36df308df2fc030c3e8687abbfdbd608ac9ac528bd166f6c23a279db128517ee`），完整ROI `[1266,1002,80,80]`：上border997…1001、内部1002…1081、下白border1082…1086，故y1003会混入下边框且丢上1px，不采用。旧result数量2遮挡样本仍保留：changed2002、RMSE38.2093、max197，其残差不能全部归因block shader。

独立run原始截图/JSON在`.cache/inventory-third-qa/independent/`，父级集成run在`integrated/`，避免并行覆盖；原生完整PNG未修改。Library的renderer-reconstruction标记仍适用，当前不能宣布原生3D/染色/GPU渲染已pixel perfect。


## 最终独立回归记录

最终本文件64项、交易27项，共91个检查均有PASS记录；并非将分批结果写成同一次91绿。原59项55 PASS/4 FAIL，修复后9项定向7 PASS、再2项2 PASS；新增28项22 PASS/6 FAIL（3glyph隔离失继承、2help/close额外focus outline、1Search依赖样式冲突）。最后8项定向8/8 PASS（34.2秒），包括Search32/viewport17列与hotbar、三个glyph的严格0RGBA、help/close原hoverPNG焦点、以及新补的searchRight→creative mode和反向两条明确源焦点链接。

Source pipeline的60项严格检查与4项native测量仪器检查分别看待：后者执行通过仍报告`NOT EXACT`。同一张原PNG的完整区域、固定SHA和0差定义均未改动。最后typecheck通过，5194无监听；全局统一最终suite由父任务另跑。除这些记录外，未以扩大alpha、裁边、修改sourcePNG或弱化RGBA阈值使测试转绿。
