# Book 编辑铅笔的源图层

`BookEditor` 可选择源图层绘制 edit pencil。真实19×18逻辑按钮、焦点、点击、composition、页索引和输入节点继续由Book管理；选择此项不会改写正文或页码。

```tsx
import type { BookPencilRasterProfile } from 'mcbeui';
const pencilRaster: BookPencilRasterProfile = {
  frameSize: [2570, 1402], origin: [97, 25],
};
<BookEditor pages={pages} onPagesChange={acceptPages}
  layout={{ unitScale: 5, pencilRaster }}
  pageActions={() => ({ edit: true })} onPageAction={handleAction}
  onPencilRenderError={(error, pageIndex) => report(error, pageIndex)} />;
```

frameSize是宿主完整物理绘制目标，origin是Book root的GLOBAL逻辑位置；示例数值仅属于下述已观察profile，库不假定窗口、safezone或自动居中规则。省略pencilRaster保留CSS。frame、origin、renderKey和unitScale有声明校验，signing/readOnly也检查声明；SSR不执行图片/GPU IO。

完整18×16原PNG在19×18控制内contain，逻辑高度按float32求值，再进入既有layoutGuiImages的物理floor/ceil、GLOBAL half及UNORM16路径。裁剪只减少canvas存储范围，投影仍使用完整frame，布局不使用裁剪尺寸。采用既有top-left raster-origin策略，没有新增shader、UV epsilon、逐像素修补、图像裁片或捕获顶点输入。

normal/hover/pressed三份完整原图各由GuiLayer加载。三态全ready后才替换该按钮的CSS图像，任一失败/context loss恢复CSS。renderKey改变可重试，错误报告带页索引。自定义skin在此路径须保持原18×16尺寸，这是调用者条件，不声称自动检测错尺寸。每页三个小canvas/context，没有GPU资源池或动画性能承诺。

画布位于按钮旁，CSS根据真实按钮的hover/focus-visible/active/disabled选择三态；`:has()`把fallback资格关联到当前挂载ready owner。这样不经过按钮translateX，避免改变合成相位。owner按资产、frame、control、paint origin、scale和renderKey身份挂载；退出再进入相同profile也从未ready开始。signing/取消opt-in会卸载paint owner，真实按钮节点保持。

公开`#books`的Page actions / Source pencil rendering可直接比较。展示使用640×480局部目标、origin[0,0]、unitScale2，保留公开字体和普通草稿，不是下述原生整帧profile。

## 原生对照范围

依据为既有book_screen.json、完整book_edit_default.png及G69实际几何/状态。`.cache/book-skin-residual-study-01/PROOF.json`从19×18 control、原图尺寸和源content偏移推得packed边，没有把捕获边作为产品props。产品根据当前Book/page尺寸求control。

`.cache/book-pencil-source-01/RESULT.json`先用正常GuiLayer宿主overlay验证。integration01把画布放进transform按钮，仍余421个铅笔差异；相邻owner的02保留21个边界差异。03采用共享top-left策略，两个完整控件各8,640像素零差。各阶段均比较完整2570×1402目标，非零结果保留，没有用ROI替代整帧。

|固定场景|CSS整帧不同像素|源铅笔整帧不同像素|铅笔以外A/B变化|
|---|---:|---:|---:|
|empty|3,752|3,296|0|
|mixed|7,366|6,910|0|

每帧3,603,140个RGBA像素全部计入，alpha差异0。A→B仅456像素变化，控件补集3,585,860像素逐字节相同；文字、页码、footer和其他皮肤保留原残差。两个原生presentation guard完整零差，当前CSS A逐字节重现旧run07。实际NVIDIA RTX3050 / ANGLE D3D11 / DPR1；原始target、字体、旧reference未改。仅认证两个已观察场景的normal pencil，不认证hover/pressed原生画面、其他GPU/scale、自动布局、默认字体、真实OS IME、整个Book或最终世界Present。

最终当前源码原生批次为`.cache/book-pencil-final-01/RESULT.json`。独立`.cache/book-pencil-independent-01/RECEIPT.json`完整复算03两场景，SOURCE-PIN-FOLLOWUP.json区分03截图与后来仅收紧object/sparse声明校验的源身份。最终原生批重新使用当前源码实跑，没有以静态推断替代新批次。实际包、正式测试、展示页、提交和服务关闭身份由本轮FINAL.json索引。

## 验证与保留失败

`tests/book-pencil.spec.ts`检查真实38×36 hitbox、三态画布、键盘/指针动作、换页index、context loss/请求失败回退及retry。两个复活案例刻意阻塞全部新decode，证明CSS保持到新owner就绪，并检查原按钮节点不变。`tests/book-pencil.node.test.mjs`检查SSR零IO、未ready、CSS/signing/readOnly、源contain输入及非法声明。`tests/book-pencil-demo.spec.ts`通过公开页面检查开关、草稿及输入节点身份。

首浏览器配置因webServer相对cwd找不到Vite而未执行；修正后32通过/1失败，断言误检查自身零面积、子canvas绝对定位的wrapper。改为检查实际canvas后fresh批33/33通过。初始UTF-8源读取被Windows GBK默认解码拒绝，修正脚本编码后才生成试验fixture；未改原字体/图片。首宿主overlay的Vite预扫含未使用virtual font警告，后续指定fixture入口后消失，原日志保留。所有原失败和中间非零结果保持。
