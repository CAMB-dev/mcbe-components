# 验证记录

日期：2026-10-29（Asia/Singapore）。

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
