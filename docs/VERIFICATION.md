# 验证记录

日期：2026-10-29（Asia/Singapore）。

## 当前检查点与历史记录范围

当前新增完整 Classic 工作台组合，公开 **115 个组件、3 份数据、2 个函数，共120项值导出**。新组件为 CraftingScreen、RecipeBook、RecipeBookEntry、RecipeFilterToggle。源事实、原生截图哈希和保留边界见 [CRAFTING_SCREEN_QA.md](CRAFTING_SCREEN_QA.md)。

| 本轮检查 | 结果与范围 |
| --- | --- |
| 原材质 | 9张新皮肤的dataURL逐字节等于原PNG，全部382张固定参考校验通过 |
| 新组件正式测试 | pixels项目23/23 PASS；`.cache/crafting-canonical-final.json`，包括源布局、完整原图RGBA零容差、分组/选中框、数量、受控意图、禁用、导航和真实touch pan |
| 相关既有回归 | 84项最终批次82 PASS、2个数量名称无障碍失败；补齐可见数量的可访问名称后，桌面/移动端定向2/2 PASS。按正式完整标题合并，新旧相关范围107个唯一用例最终全部通过 |
| 独立审查 | 真实右键/中键发现disabled仍报告意图、Home/End遇禁用边界停留，均修复并同探针复验；SSR/hydration、ARIA关联与移除关闭按钮后的焦点回退通过 |
| 实际打包消费 | React18.3.1 /19.3.1：120值导出、115组件SSR、严格TSX/ref/API、三份新独立CSS及许可检查通过；两个消费者各101个dist文件与本轮构建逐字节相同 |
| 生产预览 | 4173端口实际构建的固定尺寸、分组、搜索、红条目选择、双布局、关闭恢复通过，页面/资源错误为空；`.cache/crafting-production-preview.json` |

实际消费包保存在 `.cache/crafting-consumer-verified.tgz`，SHA256 `ec1626def3fe7b29ea19d4df2d845af6d1a0e2fef4417d2387092cb97e23cd28`；生产JS SHA256 `fdb4652572f05d8767e646aa606832cd08706f902858e585c726c62b58fc6af7`。日志 `.cache/crafting-package-verification.log`，字节证明 `.cache/crafting-consumer-identity.json`。仅文档更新后的重打包另核对非文档条目和消费者字节，不把旧消费报告套用到新运行时代码。

首次开发期回归受到HMR重载及新增第二个CraftingTable示例的旧选择器歧义影响，保留原始报告；相关测试现明确对照原右面板分组，同时另断言新增完整screen存在，没有降低源几何或像素断言。独立新测试首轮的唯一失败是把滚动条6game命中区误当4game绘制轨道，按源分开检查后通过，原PNG零容差未变。

历史完整运行与最终相关范围按正式project、文件和完整标题合并，现 **767个唯一用例：762 PASS、5预期SKIP、0未解决合同测试失败**；这是多批次合并，非单次767项全绿。原生字体、书本及完整GUI像素验收仍未完成，Goal继续进行。

## 上一检查点：耐久与附魔空状态

本节对应耐久条修复 `0fac3c9` 与附魔空状态修复 `7c2a50c`。当时公开值为 **111 个组件、3 份数据、2 个函数，共116项**。以下各阶段的组件数、包哈希和汇总均属于当时记录。

| 最近改动 | 已完成验证 |
| --- | --- |
| 耐久条核心色与黑包络 | 库存 / HUD 52/52 PASS；`.cache/durability-integration-final.json`。五木剑实际 damage/max 与原生截图有限匹配，通用绑定与完整原生边缘仍未认证 |
| 附魔台空选项背景 | 首批27/27及最终新文件6/6，按完整标题合并为28个唯一用例全部通过；`.cache/enchanting-empty-integration.json` / `enchanting-empty-final.json`。新增6个正式用例，无空行伪按钮或动作 |
| 展示页独立复验 | 48项辅助检查通过，不计入正式测试数；清空 / 恢复 / 关闭重开、书本显式开合、原始背景内部色、无障碍与错误检查；390px保留原尺寸并局部横滚，不能声称单帧全板可见 |
| 实际包消费 | React18.3.1与19.3.1的116值、SSR、严格类型/ref/API及资产检查通过；两个消费者各98个dist文件与本轮构建逐字节相同 |
| 生产预览 | `.cache/enchanting-empty-production-preview.log` PASS，页面 / 资源错误为空 |

附魔空状态实际消费包 SHA256 为 `3db13169bf7fc7c94e11a13b2f8cdec888574a007d83e7bebf1da5c3e5a494ab`，其 `dist/index.js` 为 `6cfcf2395262dafc9632b35ba2c686570ee72823b5f317d52008c6537429de9d`；原包保存在 `.cache/enchanting-empty-consumer-verified.tgz`。本次追加研究与验证文档时，生产代码、导出与原件没有变化。后续文档重打包必须逐条核对非文档条目和两个实际消费者的 dist 字节，不能把旧消费报告直接移用到变化后的运行时代码。

历史完整运行与最终相关范围按正式 project、文件及完整标题合并，目前 **744 个唯一用例：739 PASS、5 预期 SKIP、0 未解决合同测试失败**，不是单次744项全绿。独立研究像素数、48项展示检查和不同参数候选不作为新增正式用例。原生字体 / 书本的非零残差和完整 GUI 验收仍未解决，Goal保持进行中。

以下按阶段保留原始验证记录。

## 原字图文字与提示框接入

新增 `BitmapText`，当前公共值为111个组件、3份数据、2个函数，共116项。支持调用方字图、明确的字符矩形与推进、整段排版、受控采样 / shader、显式阴影、真实DOM文字及加载失败回退。`ItemTooltip.renderText` / `InventoryItem.tooltipTextRenderer` 复用同一入口，异步字图改变尺寸时提示框重新定位。源资源、公式与原生比较边界见 [NATIVE_BITMAP_FONT_QA.md](NATIVE_BITMAP_FONT_QA.md)。

| 检查 | 结果与范围 |
| --- | --- |
| BitmapText组件 | 13/13 PASS；`.cache/bitmap-text-final.json`，布局、采样、颜色、阴影、加载、SSR、选取/无障碍、回调与取消 |
| 提示框与库存相关 | 38/38 PASS；`.cache/bitmap-tooltip-regression.json`，包含双端6个新文字入口/尺寸变化用例 |
| 正式pixels项目 | 16/16 PASS；`.cache/bitmap-native-integration-final.json`，13组件用例及3个可选原生来源/布局合同；约18秒 |
| 独立数学和浏览器审计 | 120次布局/公式运行，15,606像素/62,424通道；四个浏览器样本480像素与独立控制Canvas RGBA零差，正常8bit存储舍入单独报告 |
| ready DOM继承阴影缺陷 | 真实回归修前54像素差、修后0，负对照重新检出54；独立原字图探针367像素差降至0，不改变canvas显式阴影 |
| 实际tarball消费 | React18.3.1 /19.3.1精确116值、111组件SSR、严格类型/ref/API、CSS/字体/材质/许可及私有字图排除均PASS；`.cache/package-verification-final.log` |
| 生产预览 | 两段原字图与提示框内两段均ready，实际文本及无自动durability/glint检查通过，页面/资源错误为空；`.cache/bitmap-text-production-preview.log` |

实际消费包SHA256为`b5db4f9ba6196a137c39c3649ef68376b1da8bc32df2c58942ef898bbde505c5`；安装到两个消费项目的`dist/index.js`均为`bc31318323a3897c9ecdf195751500168e5d5498dcb25e991b00d5df8f183ff1`。补入本验证记录后仅文档重打包，逐条验证其他包文件及两个消费者的全部dist字节相同；证明保存在`.cache/bitmap-text-final-pack-proof.json`。

原生GUI4与GUI5 A/B均保留完整两行字段、空格、末尾行框及2px halo，RGBA零容差、无mask、无定位搜索。GUI4完整字段严格差异1314/15520像素，GUI5 A/B均1573/24300；加halo后分别1444/16632及1573/25688，最大通道差22/24/24。GUI5的`.75`覆盖代理阈值各有5处差异，完整RGBA也未通过。首轮三阈值全零假设得到1PASS/2FAIL，原报告留在`.cache/tooltip-native/independent-native-bitmap/report.json`；后续3PASS仅认证`.25/.5`来源/布局及GUI4额外`.75`分类，完整差异继续记录FAIL，**不是原生字体像素认证**。没有提高容差或添加拟合滤镜来取得通过。

历史完整运行与最终相关范围按文件、完整标题和正式project合并，累计 **734唯一用例：729PASS、5预期SKIP、0未解决合同测试失败**，不是单次734项全绿。原生RGBA与覆盖率差异是明确未完成的验收项，不被上述合同测试数字消除。Goal继续进行。

## 物品提示与受控附魔光效

新增 `ItemGlint` 及两个纯渲染函数，当前公共值为110个组件、3份数据、2个函数，共115项。原光效图及许可随包分发，私有编译材质和反汇编结果不分发。源公式、数值/整图验证和 Canvas 半透明1LSB边界见 [ITEM_GLINT_QA.md](ITEM_GLINT_QA.md)。

物品提示框已取得A/B悬停与C无提示三张原始PNG，独立配对测量支持固定填充、平色紫边和阶梯轮廓。正式轮廓回归以独立逐行区间生成硬边候选，完整116×56区域6,496像素零差，含角外背景；没有把该结果当成原生字体或部分覆盖边缘零差。见 [ITEM_TOOLTIP_QA.md](ITEM_TOOLTIP_QA.md)。

| 检查 | 结果与实际范围 |
| --- | --- |
| Glint及库存/工作站相关 | 39/39 PASS；`.cache/glint-tooltip-regression.json`，含全部11个新glint用例 |
| 独立CSS border-box修正后 | 库存及部件18/18 PASS；`.cache/tooltip-border-box-regression.json` |
| 提示框交互 | 新增desktop7/mobile7，另含既有Dialog1，共15/15 PASS；`.cache/item-tooltip-final.json` |
| 提示框轮廓 | 独立正式用例1/1 PASS；`.cache/tooltip-contour-final.json` |
| 校准页原规格局部滚动 | 酿造/特殊工作站32/32 PASS；`.cache/tooltip-native-fixture-regression.json`；HUD及反馈相关结果见下文 |
| 构建与类型 | 最终完整core/demo/tests类型检查及生产demo构建PASS |
| 实际tarball消费 | React18.3.1 /19.3.1严格115值、110组件SSR、类型/ref/API、独立CSS、原材质与许可、私有资产排除均PASS；`.cache/package-verification-final.log` |
| 生产预览 | 3个glint canvas ready、真实键盘改变UV后像素更新、Tooltip只显示宿主name/lore、独立border-box均PASS，资源/页面错误为空；`.cache/glint-tooltip-production-preview.log` |

校准页原有大尺寸HUD/聊天/帧行和新增JSON输出曾令320/412px页面横向溢出，造成mobile视觉/布局视口偏移；已对样本加局部横滚及输出断行，保留原部件尺寸和全部交互断言。新测试同时检查页面宽度约束。相关反馈/库存页面范围110项首轮106PASS、1预期SKIP、3个追踪文件收尾错误；HUD范围30项首轮28PASS、2个同类错误。五个错误均来自并行runner共用输出目录的ENOENT，已使用独立输出目录复验：相关6项及HUD2项均PASS，没有修改生产断言掩盖失败。

按完整用例标题/project合并历史与最终相关覆盖，累计 **712个唯一用例：707PASS、5预期SKIP、0未解决失败**，不是单次712项全绿。额外自定义Dialog复验沿用已有desktop用例，不作为新增项计数。合并记录 `.cache/integration-summary.json`。

最终实际消费的tarball SHA256为 `fe7fb4dadc0746c96a29778d35414beba1912b5753c5d12ad36483187739d3ca`；随后只补充文档重打包，其他包条目和两个实际消费项目的dist逐字节核对。完整原生字体、动态光效绑定、其余GUI状态仍待验收，Goal保持进行中。

## 原生跨缩放观察

实际取得GUI4附魔台原始PNG，并恢复原100%缩放、暂停测试世界。两位独立检查者从原图集确认相同符文序列；原图固定哈希、完整84 / 66像素分量逐RGBA字节比较和三个72px库存格扫描加入正式可选检查。书本新scale保持原有全部参数，完整160×132区域比较当前候选 / unlit，并对照独立测得的旧经验式；未拟合新系数或配准。

附魔文件 **12/12 PASS**（同批15.7秒），随后补充GUI4书本较旧式误差和差异像素改善断言，单项 **1/1 PASS**（4秒）；完整core / demo / tests类型检查通过。输出分别在 `.cache/enchanting-cross-scale-final.json`、`.cache/enchanting-gui4-final.json`。累计按完整标题 / project合并历史覆盖为686个唯一用例：681通过、5预期跳过、0未解决失败，**不是单次686项全绿**。

新样本中书本RGB MAE为0.660859（旧式0.750395），1409 / 21120像素仍有差异，最大通道差198。符文两侧混色边界在GUI4/5均为1物理像素，只认证固定原生观察，不宣称生产文字已零差。见 [ENCHANTING_QA.md](ENCHANTING_QA.md)、[native-rune-sampling.json](native-rune-sampling.json)。另对25张原生PNG的共同外围条纹 / RGB标记和暂停页局部89865像素零差完成独立审计，仍未据此裁定客户区；见 [native-capture-audit.json](native-capture-audit.json)。

此轮生产源码、原件及导出没有变化。文档重打包逐条比对上一轮实际React18/19验证包：允许仅docs内容变化及新增采样元数据，其他包条目保持相同字节；最终dist另与两个已安装消费项目逐条比对。没有重复运行无变更的生产页面测试。

## 附魔后续修正

书本照明候选与符文默认色冻结后，附魔 renderer、附魔选项、工作站和基础像素四个文件的相关测试 **91/91 PASS**（同批约72秒，`.cache/enchanting-source-final.json`）。新增两个符文用例覆盖默认色 / 宿主覆盖及三张原生截图的独立字节检查。与下面两批历史整合按完整用例标题和 project 合并，当前684个唯一用例中679个通过、5个预期跳过、0个未解决失败；**不是单次684项全绿**。

只读材质检查脚本 `python scripts/inspect-native-enchanting-materials.py` 在本机四个固定 DXBC stage 的哈希、字节范围和算术依赖检查均通过。独立 agent 从原始 binary 重新反汇编，另跑实际生产原生截图测试3/3通过。在白光 / 强度1 / overlay0假设下，同一照明候选使完整200×165区域的RGB MAE：打开0.415081→0.343333、关闭0.176596→0.165404；差异像素2239→1683、1281→656。每次比较保留全部33000像素，没有边缘裁切或 mask。两张均为已知校准样本；最大通道差仍166 / 147，原生模型、材质绑定及 uniform 未确认。

符文六行实心像素均为104/93/73，默认色据此改为 `#685d49`，关闭状态无字作为负控。颜色用ROI不代表完整字形；原生符文亚像素边缘和基线仍待校准。细节见 [ENCHANTING_QA.md](ENCHANTING_QA.md)。新1×1 Paint画布粘贴实验排除了旧大画布残留，尚未确认整帧客户区；见 [native-capture-audit.json](native-capture-audit.json)。

最终源码的 `npm run verify:package` 通过完整构建 / 类型检查，以及实际tarball在React 18.3.1 / 19.3.1的112值导入、109组件SSR、消费类型、CSS / 字体 / 45份原始材质与许可验证；日志 `.cache/package-verification-enchanting.log`。随后生产预览检查通过，31张页面截图完成、错误与资源失败为空，日志 `.cache/preview-enchanting.log`。本段验证记录补入后只重打文档包，并逐条确认其他包文件与实际验证过的tarball字节一致。

## 本轮：109 个组件、3 个数据导出

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 全套整合 | 680 项：670 PASS、4 预期 SKIP、6 FAIL；14 分钟 | 原始完整运行 `.cache/integration-final.json`，没有把失败隐藏为通过 |
| 最终相关范围复验 | 69 项：68 PASS、1 预期 SKIP；80 秒 | 完整 Combobox 双端、设置控件双端、容器几何、材质渲染器；`.cache/integration-regression.json` |
| 最终唯一用例覆盖 | 682 项：677 个取得 PASS、5 预期 SKIP、0 未解决失败 | 按文件 / 完整用例标题 / project 合并两批；**不是单次 682 项全绿**。新增跳过仅桌面的真实 mobile visual viewport panning |
| 构建及类型 | PASS | 最后生产修复后 core / demo / tests TypeScript、tsup 和 Vite 构建 |
| 实际包消费 | React 18.3.1 / 19.3.1 均 PASS | 精确 112 个运行时值、109 个组件、SSR、严格 TSX / ref / API、全部 CSS / 字体 / 许可路径；两个实际安装消费者与最终 dist JS 字节相同 |
| 原件 / 包排除 | 375 份固定来源、45 份材质均 PASS | 原始 PNG / TGA 字节及许可保留；私有 Mojangles / Ten / Seven / Noto 本机副本、SGA、GIF、demo、原生截图均不入库包 |
| 生产预览 | PASS，错误与资源失败为空 | 所有材质 canvas 等待 ready；31 张截图覆盖新增 GUI、字体 / 阴影、选中搜索状态和移动端，`.cache/preview/` |

六项整合失败已分别闭环：两个旧 World title 定位在新增 SettingsPanel 后产生歧义，定位收紧到原 settings-row fixture；三个移动端 Combobox 失败是真实 visual viewport 偏移问题，分别计算按钮的实际可见范围和弹层的布局尺寸上限，原断言保留，新增真实双轴 panning 用例有修复前失败 / 修复后通过证据；一个容器检查因逐槽位连续浏览器往返超出 30 秒，改为每网格原子读取全部几何，仍逐格核对相同原始坐标、尺寸和 `.02` 阈值，没有提高超时或放宽精度。相关 69 项最终同批 exit0。

此前停止的稳定部分首轮另外发现并修复了展示页 320px 溢出、PlayerList / TradeOffer 可见数字与无障碍名称不匹配，以及灰框伪元素背景未被 axe 识别。文字与原生配色不变；名称修正有整个区域截图零像素变化证据。独立检查还修复了库存预览中心 fill、交易禁用背景、经验条图层、创造搜索框受后加载 CSS 影响变成双行、工具栏焦点额外描边和跨控件键盘路径。

独立组件来源 / 几何与原 PNG 同一浏览器比较保持零容差；原生材质测量仍明确 **NOT EXACT**：完整 80×80 Stone / Stone bricks / Clean slab / Stairs 的 RGB RMSE 分别为 3.5422 / 4.0480 / 5.0326 / 6.5320；两个完整 100×200 布料样本分别为 2.8670 / 3.7111。完整空创造物品区 965550 像素中有 16305 处差异，RMSE 0.130267、最大差 3。截图外围 / 客户区尺寸仍待核实，死亡页 1px 原生位移没有宣称已消除。详见 [INVENTORY_SCREENS_QA.md](INVENTORY_SCREENS_QA.md)、[GAME_CONTROLS_QA.md](GAME_CONTROLS_QA.md)、[SYSTEM_SCREENS_QA.md](SYSTEM_SCREENS_QA.md) 和 [FIDELITY.md](FIDELITY.md)。Goal 继续进行。

## 前一轮：86 个组件的历史记录

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 本轮整合全套 | 450项：446 PASS / 2 SKIP / 2旧定位FAIL，7.4分钟 | `.cache/expansion-final-results/`；唯一两项失败为旧Render distance定位被新增同名示例触发歧义，未发生生产断言失败 |
| 旧定位精确复验 | 2/2 PASS，6.6秒 | 将定位限定到原#selection示例，保留全部键盘 / 值 / aria-valuetext断言，双端复跑；没有再次执行不受影响整套 |
| 最后说明色窄修 | 3/3 PASS，7.2秒；完整typecheck PASS | 默认说明色中性Web profile、宿主覆盖、Panel/inset继承及双端目标axe；没有把JSON的.7值宣称为原生最终8bit量化认证 |
| 本轮独立用例覆盖 | 当前清单453项，451个用例取得PASS、2个预期SKIP | 结果由上述批次合并，**不是单次453项全绿**。跳过项仅desktop的touchpan及tooltip mobiletap，mobile对应均通过 |
| 固定原图缓存 | 222张校验PASS | 来源、独立SHA与尺寸固定，按源分组去重；图数不等于像素测试项数 |
| 上一轮浏览器全套 | 300 PASS / 1 SKIP / 0 FAIL，5.4分钟 | 301项、20文件；桌面 / 手机交互、axe、源纹理 / 几何 / 字体、WebGL及可选原生PNG。输出 `.cache/integration-final-results/`。唯一skip为无触屏desktop touch pan，mobile对应通过 |
| 上一轮后续原生差异修正 | 16/16 PASS，28.3秒；完整typecheck PASS | 全套后修锻造默认占位、制图名称对齐和两输入槽偏移；special全16项定向复验，未再次运行不受影响的整套 |
| 基础皮肤及进度 | 51 + 5 PASS | 独立原始PNG九宫格与最近邻合成，RGBA零差。总共97个skin来源映射，映射数量不等于此测试项数量 |
| 原版字体 | 3 PASS | 原始Mojangles TTF轮廓独立栅格化，对比Text无阴影 / 2px阴影和Input；原字体仅本机可选 |
| SGA与中文边缘 | PASS | 原始SGA AIZ采样、开源中文字体实心边缘检查；不证明原生中文字形、rune换行或最终基线 |
| 本机参考 | PASS | 1.26.6005.0中131个相关UI PNG / JSON与固定参考一致；各工作站另与官方v1.26.60.5 full解析核对 |
| 合成 / 熔炼 | 12 PASS | 原布局、焦点路径、6个独立原PNG裁切组合；不证明原生引擎ratio和取整 |
| 附魔 | 8 PASS | WebGL / 受控参数 / 青金石底层、经验字节、3个可选原生PNG检查；完整200×165书本区域误差显著改善但残差非零 |
| 容器 / 铁砧 | 18 PASS | 六种存储规格、玩家库存、铁砧浮点布局 / 状态 / 焦点及4个原PNG区域；不认证原生整屏 |
| Image / NineSlice | 7 PASS | SSR、几何、语义 / ref / 交互及6个原PNG区域RGBA零差 |
| 酿造 | 16 PASS | 槽位 / 泡泡UV / 燃料裁切 / 火焰及焦点，独立原PNG组合 |
| 锻造 / 制图 | 最终16/16 PASS | 默认空占位、原生支持的槽位偏移 / 名称对齐、源图集帧和7种地图模式；完整原PNG组合仍RGBA零差 |
| HUD | 18 PASS | 28个独立源图hash、状态图、XP、Hotbar和Crosshair像素，全部RGBA零差；另有双端交互 |
| 高级工作站 / 复用部件 | 39/39在本轮统一运行同次PASS；23个完整皮肤状态RGBA零差 | 五张原生无损图支持auto滚动条、7列居中、fold遮挡、Beacon默认6效果等局部修正；独立阶段曾有1项被外部HMR打断并定向重跑，本轮完整整合已39项同次通过 |
| HUD浮层 | 46个独立用例通过 | 40张源PNG与legacy UV核对、完整含字图与溢出阴影、聊天双端交互；字号/阴影Web合同与native运行时默认分开 |
| 设置控件 | 37/37 PASS，末尾另补3项通过 | 24双端交互+13独立源图/几何；cancelled form reset真实缺陷修复后回归通过；局部表面测试明确隐藏文字范围 |
| Spinner / Tooltip / Toast | 本轮双端26项：25 PASS / 1预期SKIP | 真实十帧完整图零差、Button.loading复用、Portal/Dialog Escape层级、触屏、常驻status/暂停计时；本轮完整整合亦覆盖 |
| 自动无障碍 | PASS | 页面及Dialog / Combobox无axe serious / critical问题；不是人工屏幕阅读器认证 |
| 移动视口 | PASS | 320px重排，真实touch模拟；宽内容撑大innerWidth/innerHeight时Combobox仍留在布局 / 可视视口交集中 |

整套检查包含原生表单、受控状态、重置、focus / pressed / selected、方向键与禁用跳过、Dialog焦点恢复与Escape、滚动锁定、Input阴影 / 错误关联、Combobox活动与提交选择分离、外部定位、ItemSlot数量 / 耐久 / tooltip、库存 / 工作站导航和滚动区拖拽 / 键盘 / 滚轮 / RTL / 真实触控模拟。

ScrollArea专项在双端覆盖19个通过项和1个desktop预期跳过；Hotbar / HUD双端有12项交互检查。详细源证据见 WORKSTATION_QA.md、PROCESSING_QA.md、ENCHANTING_QA.md、BREWING_QA.md、SPECIAL_WORKSTATIONS_QA.md、HUD_QA.md。

本轮原生参考均来自本机26.60、简体中文、Classic GUI 5。附魔打开 / 关闭 / 经验不足已经用于局部校准；另取得空锻造 / 空制图、石切机、织布机、信标、合成器空槽与合成器禁用槽参考，共10张原生PNG。原图采用原生剪贴板保存PNG，避免JPEG污染颜色；全部仅存忽略缓存。书本仍有非零边缘 / 遮挡误差，费用阴影仅认证阈值轮廓位移；不能据此宣称整个GUI零差。

最终 `npm run verify:package` 在本轮所有生产窄修冻结后执行，内部全build / typecheck与实际tarball消费全部PASS：86个导出、React 18.3.1 / 19.3.1、ESM / 声明、23个新增组件的SSR / ref / 消费类型、8个新CSS入口、字体及许可路径。tarball大小2320651字节，位于忽略缓存；包内不含demo、专有本地Mojangles字体或SGA图集。生产预览 `node scripts/check-preview.mjs` 随后独立执行，PASS、运行错误为空；更新了高级工作站、HUD浮层、设置、反馈及既有页面截图，证据在 `.cache/preview/`。

Vite开发watch已忽略.cache及测试报告产物，避免Windows保存原生PNG时的EBUSY锁错误导致开发服务退出。此前一次全套因此中断不计为验收；上表只记稳定服务下exit0的完整运行。

未覆盖真实手机、Firefox / Safari、人工屏幕阅读器或所有原生整屏。目录共106项，86个导出，20项计划中。原生书本动画相位、符文基线、tooltip / glint、部分工作站description锚点和3D预览仍待校准。Goal保持进行中，详见FIDELITY.md。
