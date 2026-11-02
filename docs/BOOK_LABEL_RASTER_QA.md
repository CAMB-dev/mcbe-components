# Book 页码与按钮文字的源字体路径

BookEditor /BookReader 的 `layout.labelRaster` 接受宿主自己的分页位图字体。两种角色独立配置：`pageNumber` 绘制页码，`footer` 绘制编辑器底部按钮；省略某角色保留其CSS。文本、真实按钮、textarea/ref/选区、受控值、composition和宿主动作仍由Book组件管理。

```tsx
import { BookEditor } from 'mcbeui';
import type { BookLabelRasterProfile, BookLabelRasterStyle } from 'mcbeui';
const labelStyle: BookLabelRasterStyle = {
  font: yourResolvedGuiTextFont, fontScale: .5,
  sampling: 'bilinear', shader: 'bitmap-smooth',
  widthRounding: 'ceil', paintOffset: [0, 1],
};
const labelRaster: BookLabelRasterProfile = {
  frameSize: [2570, 1402], origin: [97, 25],
  pageNumber: labelStyle, footer: labelStyle,
};
<BookEditor pages={pages} onPagesChange={acceptPages}
  layout={{ unitScale: 5, labelRaster }}
  onLabelRenderError={(error, role) => report(error, role)} />;
```

frameSize是完整物理目标，origin是Book root的GLOBAL逻辑坐标，unitScale参与投影。示例是下述已观察有限profile，不是自动窗口/safezone/锚点规则。`widthRounding`明确选择none或ceil，`paintOffset`也是宿主策略；现有14个glyph的相对几何及单个63.5宽度标签支持这个ceil候选，但不能唯一恢复通用引擎测宽算法。DOM的pageNumberFontMode仍控制fallback家族；源路径使用显式font。

## 原字页准备

在源码仓库根目录运行；npm产物只接收宿主字体，不附带此准备脚本或原字页。

```powershell
python scripts/prepare-book-label-font.py "C:\path\to\font.brarchive" --check-only
python scripts/prepare-book-label-font.py "C:\path\to\font.brarchive"
```

默认包含95个可打印ASCII及“第页共签名”，100字符、五张完整256² Unicode页；输出仅在忽略的`.cache/local-fonts/book-labels`。可追加`--characters`或UTF-8 `--text-file`，CR/LF作分隔，其他控制字符、非BMP、缺字及超过预算会拒绝。相对PNG路径需要按font.json所在位置解析，准备文件不注册字体、不生成WOFF、不进入Git/npm。输出仍遵循原字体的上游权利，不由项目MIT重新授权。

脚本固定核对已审计archive SHA256 `cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc`，复用既有Classic纯解析/完整页解码/`body-bounds-v1`候选规则。原PNG不裁切或重新编码；空格仅advance，其余保完整16²格，offset/advance仍明确为有限host候选。check-only不创建目录或写文件；同内容重复生成保mtime，输出链拒symlink/junction。

`.cache/book-label-font-preparer-01/REPORT.md`记录25个Python实际源检查及4个纯layoutGuiText案例：全部100glyph、五页原字节、输入/输出边界、实际Windows junction、重复生成/只读检查以及其他145个原字体文件保持。首Node测试把normalized glyphHeight误当源像素，原失败日志保留，修正断言后通过；字体数据未改。

准备后重新启动Vite或重新构建展示页。公开`#books`可选择Source book labels。已准备时，Vite只在本地展示中解析这些页；未准备时开关禁用，普通Book仍可使用。公开预览声明局部640×480目标、origin0、unitScale2，不据此认证原生默认字体或任意页面。

## 同层混合与源布局

独立透明文字canvas先存PMA RGBA8，再由浏览器混到CSS纸张/按钮上，会经历额外量化。本轮保留这个初始非零结果：源字体与几何已正确的孤立三标签仍差507像素，每通道最多1。

新路径先在同一GuiLayer内重放正常完整原PNG背板，再绘制字形。页码背板按原Book六层九切片/顺序，底部按钮用完整4²原图和切片1；没有从native screenshot抓取背景或用常量色覆盖。背板仅在源label control范围重绘，所有背板先于所有文字，避免重叠control擦除先画的字。源图层在Book root的z4、Close在z10，保留正确遮挡。

页码在本显式Web路径使用pageWidth×10逻辑control clip，文字与背板同scissor；它不是由native full-target scissor推导出的通用引擎裁剪规则。超过该control的文字会裁剪。单行标签最多4096码点，预算在读取/复制glyph之前检查；缺字、多行等内容错误报告并保持CSS，非法profile声明即使inactive也会在IO前拒绝。

底部source测宽按font advance及所选rounding决定，外框宽度取max(102, measuredWidth+10)，高20。normal/hover/pressed/pressed-nohover使用原图/源状态颜色，pressed文字下移1逻辑单位；四态全ready后替换当前按钮视觉。disabled回退CSS；readOnly或mode变化保留既有按钮/工厂行为。源页码色默认[188,163,135,255]、normal footer[76,76,76,255]，hover/pressed白色；不新增通用颜色量化器或shadow。

每个挂载owner独立ready，资产、已用glyph/metrics、frame/scale、几何、文本、颜色、renderKey变化创建新资格。隐藏某角色再恢复相同配置不会继承旧ready；context loss/请求失败恢复CSS，renderKey可重试。字面文字始终留在DOM供可访问名称使用，只隐藏其paint。小outputRect只减少存储，GLOBAL布局、half/UNORM16和投影仍用完整目标，rasterOrigin采用既有top-left。没有新shader、UV epsilon、逐像素修补或captured VB/MVP输入。

## 完整原生目标结果

固定原target来自之前保存的Book GUI5 empty/mixed-text，2570×1402、3,603,140像素。正常源数据为原Book JSON求值、用户原字页、既有Unicode metrics、明确测宽/paint策略及完整原皮肤。原target、字体和旧reference保持字节；没有新游戏/PIX/Computer Use操作。

| 同一固定profile路径 | empty不同像素 | mixed不同像素 |
| --- | ---: | ---: |
| 上轮source pencils + DOM labels | 3,296 | 6,910 |
| 仅孤立source footer | 2,840 | 6,454 |
| 孤立counter，continuous测宽负控 | 1,759 | 5,373 |
| 孤立counter，ceil候选 | 963 | 4,577 |
| 孤立三标签组合 | 507 | 4,121 |
| 同层背板+footer | 2,799 | 6,413 |
| 同层背板+counters | 497 | 4,111 |
| 同层三标签组合及实际labelRaster API | 0 | 3,614 |

所有数值均比较完整RGBA目标，alpha差异0，没有mask、epsilon或只取ROI评分。最终三标签bands分别40,000/40,000/192,000像素全部RGBA0；A→B只变3296像素，其余3,331,140像素逐字节不变。background-only A/B整帧也0，单独证明正常背板重放保持图面。首个错误地放在Book外z20的背板覆盖了Close的146像素；保留失败阶段，修正层级后才继续。

最终`.cache/book-label-final-01/RESULT.json`是当前实际BookEditor API的空白整帧RGBA0及mixed3614。实际NVIDIA RTX3050/ANGLE D3D11/DPR1，原生presentation guards0；CSS A也重现上一pencil阶段。源码输入前后pins相同。两版实际npm安装的React18.3.1/19.3.1浏览器输出与对应完整源码图逐RGBA相同，各自empty/native0、mixed3614，点击真实按钮仍聚焦原textarea。实例使用调用者私有原字体profile，不是包默认OFL/DOM字体认证。

这个empty是**一个已观察完整UI target**，不是整个游戏、所有Book状态或最终世界Present。mixed正文、原生caret/IME/选区、其他viewport/GPU/DPR/字体、自动font route及通用anchors仍未认证；hover/pressed/signing有Web行为检查，没有对应原生状态像素认证。

## 验证与收据

当前mounted批次38/38通过，无skip/flaky，覆盖新label行为及原Book/pencil/fidelity。包括同配置复活时阻塞decode、CSS保持、四态、signing/返回、accessible name、原输入节点/受控值、缺字/请求失败/context loss重试和实际GL scissor/背板先于ink。公开fixture仅用自编合成字页，不依赖私有字体。Node15检查通过，覆盖SSR零IO、角色分支、声明校验、缺字fallback、unused循环扩展和clone前预算。

首mounted批35PASS/3FAIL保留：测试宿主未接受controlled pages，却期望输入留存；另外两项误以为15个decode都能同时启动。夹具接收值，并分波释放受限并发的decoder，原not-ready/同节点断言保留后fresh38通过。首package类型消费者有重名consumerBookLabels，改测试变量名后完整package02通过，未放宽库类型。

`.cache/book-label-independent-01/RECEIPT.json`独立重解所有当前完整图、native/旧A、三个band和补集，36pins一致；源码review的scissor/绘制顺序/预算改进均在最终pins内。`.cache/book-label-package-independent-01/RESULT.json`对实际两peer各52个SSR、14个严格类型负例通过；tar与两安装的ESM/DTS/book.css完全一致，private helpers不出公共barrel。完整安装、展示、包身份、服务关闭和提交记录由本轮FINAL.json索引。

功能包`functional-candidate-02/mcbeui-0.1.0.tgz` SHA256 `198f4a6a50a5b7b5efc066d60cdd6aba741f54889da429918eb6a7dd5b415f2a`；ESM `e319ee89c0c207c2ecafa033a9f641078649925a199582ec139b24b22415fab2`、DTS `5b9dba136343f3d0dea84321910fd74559491a33ae1bf03d1aee0fe0311ad1a8`、book.css `c668e8e6981204bb8497b5279968b699ddd1238a8490e87bb269eb2d0b61507d`。公共数保持205组件/223值，不用新type或内部painter增加组件计数。
