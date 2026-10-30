# 普通与悬挂告示牌

`SignTextSurface` 用于复用牌面及真实多行输入，`SignEditor` 提供编辑窗口的打开、焦点和关闭请求。两者使用完整原图；不添加通用 Dialog 标题、关闭按钮或 Panel 外框。独立客户端合同及 React 18 / 19 新包消费已通过，原生整页像素尚未验收。

## 使用

```tsx
import { useState } from 'react';
import { SignEditor, SignTextSurface } from 'mcbeui';
import 'mcbeui/styles.css';

function Example() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('Bedrock UI\n像素测试');
  return <>
    <SignTextSurface value={text} readOnly label="告示牌预览" />
    <button onClick={() => setOpen(true)}>编辑</button>
    <SignEditor open={open} onOpenChange={setOpen}
      value={text} onValueChange={setText}
      variant="hanging" wood="oak" label="编辑悬挂告示牌"
      exitBehavior="commit" onCommit={accepted => { console.log(accepted); }} />
  </>;
}
```

根样式已包含牌面样式；按组件导入时使用 `mcbeui/sign.css` 及其依赖 `mcbeui/image.css`，并自行提供字体与主题。字体令牌需在 portal 的祖先可见；默认 portal 位于 `document.body`，也可通过 `portalContainer` 指定容器。组件不分发新的游戏字页或字体。

|属性|行为|
|---|---|
|`variant` / `wood`|`regular` / `hanging`；默认 regular、oak。13 种木材的源文件关联是显式候选。|
|`texture`|`{src, sourceSize:[width,height]}` 覆盖内置木材原图，sourceSize 使用图片物理像素。|
|`backgroundFit`|默认 contain，在背景逻辑盒内居中等比显示完整图片；stretch 显式拉伸至逻辑盒。|
|`scale` / `geometry`|默认每逻辑单位 2 CSS px；可局部覆盖 backgroundSize、backgroundOffset、editorSize、editorOffset。编辑区是根布局盒，背景相对编辑区居中再加偏移。|
|`value` / `defaultValue` / `onValueChange(value,event)`|受控或非受控纯文本。受控值由宿主接受；不对收到的 value 自动截断、分页或写游戏 NBT。|
|`textareaRef` / `textareaProps`|真实 textarea 的 ref、原生事件、ARIA 与样式。组件负责 value、onChange、disabled、readOnly、maxLength、autoFocus；根 ref 指向牌面 div。|
|`fontMode`|auto / latin / unicode。auto 在整段值含 Han 时使用 Unicode 家族；这是有限 Web 候选，调用方可明确选择。|
|`textColor` / `textShadow`|调用方已解析的颜色和 CSS 阴影，不计算染料、发光或游戏字体路由。|

`SignEditor` 默认关闭，使用 `open` / `defaultOpen` 管理显示。首次打开默认聚焦真实输入；`autoFocus={false}` 可关闭此行为，`dialogRef` 指向原生 dialog。`disabled`、`readOnly` 保留输入语义；Enter 输入换行。textarea 的 children / dangerouslySetInnerHTML 不作为第二文本入口，已接受的 value 保持唯一文本所有者。

外部点击或 Escape 产生 `{reason:'outside'|'escape'}`。先调用 `onCloseRequest(acceptedValue, detail)`，再按 `exitBehavior` 调用 `onCommit` 或 `onCancel`；默认 request 不额外提交或取消。任一对应回调返回 false 可拒绝关闭；否则发出 `onOpenChange(false, detail)`。受控 open 仍由宿主更新，直接把 open 改为 false 不伪造用户关闭回调。cancel 不自动恢复旧文本，commit 不自动持久化；它们是宿主选择的 Web 行为，不宣称原生菜单保存或回滚规则。

组合输入期间避免 Escape 关闭；从输入内开始拖选、到外部释放不应被当成一次外部点击。真实 OS IME、复杂光标与所有浏览器的最终行为仍需要相应测试证据。

## 原图与几何

素材来自固定的官方 `v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。逐文件路径、尺寸、原始字节 SHA 与许可见 [sign-assets.json](sign-assets.json)。13 张普通牌面为 24×12 原图，13 张悬挂牌面为 16×16 原图；全部 26 张与本机安装归档的完整 PNG 字节和解码 RGBA 一致，没有同名纹理元数据 JSON。图片物理尺寸与下表的 GUI 逻辑尺寸分别使用。

|源声明|普通 `regular`|悬挂 `hanging`|
|---|---|---|
|背景逻辑尺寸|192×93|287×143|
|背景偏移|[-1,-5]|[0,-32]|
|编辑区逻辑尺寸|185×90|126×90|
|编辑区基础偏移|[0,5]|[0,5]|

源 `common` 模板还包含 `[100%-6,100%-4]` 内部居中区域、裁切容器和 `[0,-3]` 多行偏移。`constrain_to_rect:false` 不表示完全不裁切。原输入的 `max_length:32500` 不能解释成四行、每行字符数或字节配额；Web `maxLength` 使用 UTF-16 code units。

两份已观察 oak GUI5 捕获的完整背景 RGBA 分别唯一匹配 `sign.png` 与 `hanging_sign.png`，使用 POINT / CLAMP / full UV。其余木种关联、默认选择与正反面算法仍是宿主绑定候选；源 `$sign_texture`、文本及颜色仍含动态绑定。素材与这两帧身份不证明染料、发光规则或全部活动路由已恢复。字体、换行、基线、光标、物理裁切与产品整页原生像素仍需独立验证。

有限 regular GUI5 捕获的 CPU draw 分析支持 24×12 原图在 192×93 逻辑盒内 contain 后绘制为 186×93；源盒与实际绘制尺寸不应混用。悬挂 square 原图普通 contain 为 143×143，实际 packed 宽 143.125 保留为量化观察，不拟合进 CSS。两帧 large 字体投影为每 local 单位 10 physical px，不能推广为所有 GUI scale 的默认字体算法。混合文本中的 Latin 实际来自完整 glyph_00 页，中文使用对应 Unicode 页，而非 default8；本地宿主字体的 Latin advance 与已观察原生度量仍不同，因此 auto 的整段家族选择不保证相同换行。输入默认绿色 caret `#00ff00` 对应两帧 draw 的 RGBA [0,255,0,255]；浏览器 caret 栅格、全部 Unicode 和完整页面仍未因此认证。

素材保留 Mojang 的原许可与 Minecraft EULA 条款，不随库代码改为 MIT。原版字页和采集画面不作为 npm 图片素材分发。

## 来源与验证范围

`scripts/prepare-sign-assets.py --check` 复验仓库原件；可用 `--reference` 对照固定官方完整 ZIP。安装版来源证据在 `.cache/installed-book-sign-source-01/FINAL.json`（SHA256 `0e499d25fe3dd34c9d32d00b987c2db3a0dde6e69c13f6784ed3375a43ba441e`）。三份安装版 UI JSON 与公开源的格式不同，但解析后的对象相同；这不认证当前全部活动覆盖或控制器路由。

2026-10-30 已保存普通 oak、悬挂 oak 的 GUI5 混合文本捕获，同时保存书本空页、混合文本及空标题签名页，共五份。两 Sign 的实际 UI target 已按独立 descriptor 核实为 2570×1402 RGBA8 / sample1，每次原始 footprint 14,715,176 字节；去除行 padding 的输出保持完整 RGBA。它们是后续产品比较的原生参考，不是已完成的产品整页零差结果。来源见 `.cache/book-sign-native-gui5-analysis-01/FINAL.json`，SHA256 `10c04d6f3a051342de38e5d49ecd3ec2a6d4f1e38a7dcd2b8b10ab20dc142356`。混排字页与角色分析见 `.cache/book-sign-font-selection-study-01/FINAL.json`，SHA256 `c70a52590ad762e09bdac4067410626207f7a7a3572c9fc31e130744402efba2`；精确 selector 谓词及 native advance 算法仍未恢复。

独立首个完整批 29/29 通过（12 desktop、12 mobile、5 pixels），32.324821 秒，零跳过 / 重试 / flaky，600 个输入 pin 前后无变化。实际覆盖受控拒绝、真实 textarea / selection / refs、合成 composition、Enter 换行、disabled / readOnly、模态焦点 / inert / Tab / 滚动锁、回调拒绝、外部关闭、拖选及与通用 Dialog 重叠的锁所有权。26 原图与自然尺寸、两种几何和 contain / stretch、覆盖样式、无多余 chrome 也通过。报告为 `.cache/sign-independent-qa/FINAL.json`，SHA256 `ce59085777e3eb74054e497ca1a988565c0daa7a313c9718952f9f973ccf4475`。受测 Chromium156 / SwiftShader 合同不是 Minecraft native 像素或真实 OS IME 认证。

早期 CPU-only 检查因大小写敏感的 readonly HTML 属性匹配产生 1 通过 / 2 harness 失败；修正匹配后 3 项通过，生产未因此修改，原记录保留且不计入正式29项。

`npm run verify:package` 已实际在 fresh React18.3.1 /19.3.1 消费者中验证 126组件＋4数据＋10函数＝140 ESM 值、SSR、strict TypeScript、样式、字体、素材及许可，源596 pins无变化；日志为 `.cache/sign-root-close-01/package-verification.log`。两个实际消费者的327个dist文件均与构建逐字节一致，另见 `package-consumer-identities.json`。其验证helper首轮的Windows Path排序与字符串排序不一致，精确路径集合本来无缺失 /多余；修正排序后通过，无产品修改。最终文档包保持已测的327份dist内容，并另行执行React18 /19离线安装、ESM /SSR及strict TypeScript消费；实际包身份与文档字节核对结果记录在 `.cache/sign-root-close-01/FINAL-PACKAGE.json`，中间包hash不作为最终交付身份。旧Book的138值包与客户端成功保持历史范围，不替代本次新包验证。

旧回归首批18项实际17通过 /1失败：Dialog相关12项通过，完整6项导航中1项失败，原报告 `.cache/sign-independent-qa/legacy-regression-01/FINAL.json` 保留。定向测量确认Anvil锚点退1px后跨过既有floor边界，造成高亮提前切回上一节；等待两帧或300ms仍稳定，不能归因于未观察到的布局漂移。页面仅修当前section的单像素退让，旧期望与后端未改；之后整6项导航实际通过，33.064477秒、零重试、602项选定输入pin无变化。其最终报告为 `.cache/sign-independent-qa/navigation-final-01/FINAL.json`，SHA256 `b526551a198414f23c201d09a2c11835a256f90eeccba4280835b047f5b2bf6d`。与首批Dialog12项及新Sign29项按范围选取共47个唯一合同，见 `SELECTED-VALIDATION.json`；不称首批18项全绿，也不重复累计其中已通过的导航用例。

公开 `#signs` 首个实际浏览器完整批50/50辅助检查通过，45.049秒，覆盖13种木材的两种牌面、真实中英输入与选区、disabled /readOnly、scale /reset、三种退出策略、outside /Escape及390px窄屏局部横移。597项最终选定输入（此时含catalog）、327dist与59site文件前后字节无变化；60个实际HTTP响应为59site加根alias，逐字节匹配。26种原图选择为inline data PNG完整编码字节相等，不能写成26次图片HTTP，也不认证全部木种的原生绑定。

公开批page /consoleError /HTTPerror /raw requestfailed均为0，但保留4条整页WebGL ReadPixels性能warning，不称所有console输出为0。记录为 `.cache/sign-public-focused-02/FINAL.json`，SHA256 `495de8e00a3dc9a16ab39cd3e518a4854ae0d18ec40a518442b0228112beb514`。旧01只准备、未运行；02首个CPU工具曾因GBK读取失败，改为UTF-8后才启动浏览器，实际浏览器没有重试。50项为生产集成辅助，不加入上述47个正式合同；SwiftShader /Vulkan、真实textarea操作与截图不代表native整页像素、真实OS IME、精确字距或字体selector已恢复。
