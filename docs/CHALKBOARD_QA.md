# 黑板编辑器

`ChalkboardEditor` 组合 `ChalkboardTextField` 和 `ChalkboardLock`，后两者可独立使用。来源是固定官方 `v1.26.60.5-full` 的 `chalkboard_screen.json` 及 common /edu 模板，不是重新设计的黑板皮肤。实现与源皮肤检查不等于教育版引擎、权限服务或原生整页像素认证。

```tsx
import { ChalkboardEditor } from 'mcbeui';
import 'mcbeui/styles.css';

<ChalkboardEditor
  panelSize={[280, 180]}
  textBoxSize={[264, 120]}
  maxLength={256}
  title="Chalkboard"
  textEnabled={canEditText}
  lockVisible={canChangeLock}
  lockLabel={lockLabel}
  closeVisible={canClose}
  value={board}
  onValueChange={(next, detail) => reviewBoard(next, detail)}
  onCloseRequest={(accepted, detail) => closeBoard(accepted, detail)}
/>
```

尺寸和256上限是这个宿主示例的输入，不是游戏的默认黑板规格。`board` 为 `{text:string, locked:boolean}`；`reviewBoard`、`closeBoard` 和能力变量由应用提供。独立CSS入口为 `mcbeui/chalkboard.css`，完整样式已包含它。展示页入口 `#chalkboard` 同时演示组合和独立零件。

|组件|实际元素与参数|
|---|---|
|`ChalkboardEditor`|ref 为 section；必填 panelSize、textBoxSize、maxLength、title、textEnabled、lockVisible、lockLabel、closeVisible。支持 value /defaultValue、onValueChange、onCloseRequest，真实 textarea /lock /close refs。|
|`ChalkboardTextField`|ref 为 textarea；必填 size、maxLength、label、textEnabled。支持 value /defaultValue、onValueChange、textareaProps、containerRef，保留换行、选择、粘贴、Unicode与IME。|
|`ChalkboardLock`|ref 为真实 checkbox；checked /defaultChecked、onCheckedChange 和宿主 label。保留原30×16图、独立上下文中的锁定行布局。|

`scale` 默认2，Web参数约束为正安全整数。面板宽高须分别大于16 /31，文本框宽高须大于6 /4，长度上限为非负安全整数；这些检查用于防止无效CSS矩形，不是恢复出的游戏规格。组件按显式尺寸渲染，不根据文字自动扩展、缩小或推断黑板型号。面板不建立原生滚动条，textarea保留独立文本滚动且隐藏浏览器chrome；字段的源clip与外框独立，外框允许宿主声明的字段溢出。

## 状态和输入

`locked` 与 `textEnabled` 是独立绑定。切锁不生成编辑权限，不修改文本；`lockVisible` 同时对应锁行可见性和该源开关的能力绑定。组件不执行世界写入、教育身份判断、服务器命令或自动保存。缺少受控接受时保持原已接受值；传入超过maxLength的已接受文本也不被暗中截断。HTML maxlength 的具体计数由浏览器原生textarea处理，不据源ExtendedASCII token拒绝中文。

`disabled` 额外禁用Web操作，`readOnly` 阻止文本与锁变化但仍允许退出。标题、锁标签和关闭按钮可访问名称独立于后台服务。`confirmHint` 可接收宿主解析好的手柄提示节点，位于源content底部右侧；默认不合成平台A键图标或绑定。

Escape首先在已聚焦textarea中取消编辑焦点并转至面板，再次Escape才发出退出请求。这是明确的Web交互合同：源同时声明了字段deselect与全局menu_exit，没有给出足以恢复原生事件竞争顺序的证据。组合输入、229和带修饰键的事件不会退出；调用方可通过默认阻止 /捕获处理否决操作。关闭请求带已接受值的副本，不自动提交或卸载。真实手柄模式、TTS服务与游戏输入provider尚未认证。

## 源布局和材质

面板 W×H，内容indent为 `[8,23,W−16,H−31]`；文本框 top-middle，原centering为3×2 inset，clip_offset `[0,−3]` 独立。标题 top9、高10、颜色`.3/.3/.3`且无阴影。锁行高16，位于indent底部中央，30×16开关偏移y−8，标签偏移 `[2,3]`。关闭命中框21×21，居中显示15×15原图；common模板的两个offset默认作用域在研究记录中分别保留，没有借用其他工作站的坐标。

十张原PNG全部复用既有素材库，整文件与固定ZIP一致：16×16 opaque面板 /slice4、6×6输入框两态 /slice2、30×16开关四态、15×15关闭三态。未手绘替代皮肤，也没有把原生截图作为组件背景。来源、SHA与有限几何在 [chalkboard-source.json](chalkboard-source.json)；字体沿现有Classic输入的有限整值Han候选，不捆绑私有游戏字体，不宣称恢复原生字体选择或栅格。

## 验证边界

源码依据 `.cache/chalkboard-source-01/` 已冻结；正文 renderer 未公开的片尾名单另保留在 `.cache/credits-source-01/`，没有用通用wrapper冒充完整Credits。

新增24项与Sign /NPC /导航80项完成同批104项执行：104通过、零跳过 /失败 /重试，984份输入指纹前后零漂移。13个隔离源皮肤平面共1,047,660个像素严格RGBA零差，几何、控制接受 /拒绝、Unicode /IME事件、两次Escape、refs和forced-colors分别验证；这些平面不是原生GUI截图或整页pixel-perfect认证。正式记录 `.cache/chalkboard-tests-01/run-02/`。

首轮104项为103通过 /1失败，独立开关向上偏移超出fixture的12px padding，顶部4×60=240px被祖先滚动视口裁剪。仅将测试宿主padding改为24px，产品原偏移未改。随后禁用皮肤有552px差1，独立完整灰阶 /partial-alpha /三种opacity浏览器探针确认黑底图像域需要字节PMA及分组量化。参考算式统一修为 `floor(round(C×A/255)×(round(opacity×255)+1)/256)`，没有127颜色特例，所有opacity1平面不变。源PNG、组件opacity和严格零容差均保持原样。

该算子有 [Skia固定源码](https://skia.googlesource.com/skia/+/06a32062620daee7a93742f553829a8d4f93f720/include/core/SkColorPriv.h)与 [SkPaint alpha转换](https://github.com/google/skia/blob/main/include/core/SkPaint.h)支持，在独立黑底图像域377,856px严格零差；彩底和直接CSS rgba的残差完整保留，不推断当前浏览器的唯一内部路径或原生合成机制。九个初始候选、后声明并冻结的源码候选、未匹配的域与观察接口首败均另存，见 `.cache/chalkboard-opacity-study-01/`、`-02/` 和 `.cache/chalkboard-opacity-post-skia-01/`。没有通过放宽容差或按像素排除来消除差异。

独立审查提出了禁用正在组合输入的textarea后，缺少end事件会让旧标记阻挡Escape的问题。桌面 /移动端旧实现各复现一次，统一Escape与Close的清理函数后两项通过，再运行上述完整104批。实际OS输入法 /引擎事件优先级仍未认证。

新包实际通过React18.3.1 /19.3.1的158组件、6数据、11函数（175值）ESM、SSR、TypeScript、CSS、素材与许可证消费；公开构建12项检查通过，覆盖独立锁 /文本能力、宿主拒绝、只读关闭、显式缩放、独立零件和窄屏。早期包检查的生成字符串转义错误与公开脚本错误点击覆盖在标签上的原生input均保留独立失败记录，后续检查未改产品来迁就脚本。证据 `.cache/chalkboard-release-01/`、`.cache/chalkboard-public-01/`，测试浏览器已关闭。
