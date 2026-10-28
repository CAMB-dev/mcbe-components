# 验证记录

日期：2026-10-29（Asia/Singapore）。

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 浏览器全套 | 300 PASS / 1 SKIP / 0 FAIL，5.4分钟 | 301项、20文件；桌面 / 手机交互、axe、源纹理 / 几何 / 字体、WebGL及可选原生PNG。输出 `.cache/integration-final-results/`。唯一skip为无触屏desktop touch pan，mobile对应通过 |
| 后续原生差异修正 | 16/16 PASS，28.3秒；完整typecheck PASS | 全套后修锻造默认占位、制图名称对齐和两输入槽偏移；special全16项定向复验，未再次运行不受影响的整套 |
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
| 自动无障碍 | PASS | 页面及Dialog / Combobox无axe serious / critical问题；不是人工屏幕阅读器认证 |
| 移动视口 | PASS | 320px重排，真实touch模拟；宽内容撑大innerWidth/innerHeight时Combobox仍留在布局 / 可视视口交集中 |

整套检查包含原生表单、受控状态、重置、focus / pressed / selected、方向键与禁用跳过、Dialog焦点恢复与Escape、滚动锁定、Input阴影 / 错误关联、Combobox活动与提交选择分离、外部定位、ItemSlot数量 / 耐久 / tooltip、库存 / 工作站导航和滚动区拖拽 / 键盘 / 滚轮 / RTL / 真实触控模拟。

ScrollArea专项在双端覆盖19个通过项和1个desktop预期跳过；Hotbar / HUD双端有12项交互检查。详细源证据见 WORKSTATION_QA.md、PROCESSING_QA.md、ENCHANTING_QA.md、BREWING_QA.md、SPECIAL_WORKSTATIONS_QA.md、HUD_QA.md。

本轮原生参考均来自本机26.60、简体中文、Classic GUI 5。附魔打开 / 关闭 / 经验不足已经用于局部校准；另取得空锻造 / 空制图参考。原图采用原生剪贴板保存PNG，避免JPEG污染颜色；全部仅存忽略缓存。书本仍有非零边缘 / 遮挡误差，费用阴影仅认证阈值轮廓位移；不能据此宣称整个GUI零差。

构建与实际包消费通过 `npm run verify:package` 检查63个导出、React 18 / 19安装真实tarball、ESM / 声明、SSR / ref / tsc、新增5个CSS入口、字体验证和许可路径；本轮最终运行全部PASS（React 18.3.1 / 19.3.1），定向修正后重新build / typecheck并安装实际tarball。生产预览通过 `node scripts/check-preview.mjs` 另行检查，结果PASS、运行错误为空，截图位于 `.cache/preview/`。

Vite开发watch已忽略.cache及测试报告产物，避免Windows保存原生PNG时的EBUSY锁错误导致开发服务退出。此前一次全套因此中断不计为验收；上表只记稳定服务下exit0的完整运行。

未覆盖真实手机、Firefox / Safari、人工屏幕阅读器或所有原生整屏。目录共103项，63个导出，40项计划中。原生书本动画相位、符文基线、tooltip / glint、部分工作站description锚点和3D预览仍待校准。Goal保持进行中，详见FIDELITY.md。
