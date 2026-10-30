# 双栏文档查看器

`DocumentViewer` 用于 HowToPlay / Encyclopedia 一类分组导航与连续文章组合，`DocumentHeading` 和 `DocumentParagraph` 提供可复用的文章零件。主题标识、标题、正文、插图、条件分支与本地化内容由宿主提供；它不是游戏手册数据库，也不执行任意 JSON-UI、`#pre_process`、商店或账户操作。

## 使用

```tsx
import { DocumentViewer, DocumentHeading, DocumentParagraph } from 'mcbeui';
import 'mcbeui/styles.css';

<DocumentViewer
  label="玩法文档"
  backLabel="返回"
  size={[400, 300]}
  scale={2}
  defaultValue="first-steps"
  groups={[{
    id: 'basics', label: '基础', topics: [{
      id: 'first-steps', title: '开始探索',
      content: <>
        <DocumentHeading>开始探索</DocumentHeading>
        <DocumentParagraph>这里放置应用提供的正文。</DocumentParagraph>
      </>,
    }],
  }]}
  onBack={() => showPreviousView()}
/>
```

`size` 是宿主可用区域的逻辑宽高，默认 `[400,300]`；`scale` 默认2，要求正安全整数。完整样式入口已包含 `document-viewer.css`。独立使用标题 /段落时可传自身 `scale`，在查看器内部默认继承；标题 ref 是 `h2`，段落 ref 是 `p`，查看器 ref 是 `section`。

每个 group 的 `id` 唯一，topic 的 `id` 全局唯一且非空。topic 接收 `title`、`content`、可选无障碍 `label`、`disabled` 和纯视觉 `showArrow`；箭头本身不触发另一个屏幕。`sectionTitle` 独立对应源 `#section_title`，省略时沿用导航 `title`，显式空字符串可留白顶部标题。`value` /`defaultValue` 为主题ID或 `null`，未给默认值时使用第一个可用主题。显式不存在的ID或 `null` 显示 `emptyContent`，不会静默替换为另一个主题。

`value` 配合 `onValueChange(id,{reason,event})` 为受控模式，reason 是 `activate` /`previous` /`next`；宿主不接受请求时，旧标题、正文与滚动状态保持。`previousHint` /`nextHint` 接收 `{label,glyph,description?}`，按可用主题顺序请求相邻主题；`headerHints` 允许额外提示节点。不读取 Gamepad API，也不自动执行游戏路由。`onBack` 响应返回按钮与未阻止的 Escape；全局 `disabled` 阻止组件自身的选择和返回请求，宿主内容节点的行为仍归宿主。

`navigationViewportRef` /`contentViewportRef` 指向两个真实 `div` 视口，`topicRefs` 按ID接收按钮ref；`onScrollPositionChange(pane,position)` 带上 `scrollTop`、`scrollLeft` 与当前 `topicId`。`scrollPolicy="reset"` 默认在**已接受主题ID改变**时重置正文；`preserve` 恢复每个主题此前的位置，未记录时从0开始。键盘 Up /Down /Home /End只移动导航焦点，Enter /Space激活；正文原文可选择、复制，不自动变成按钮。`DocumentParagraph.linePadding` 默认4，可设有限非负数，不负责解析输入图标或翻译键。

## 固定源范围

来源是官方 `v1.26.60.5-full` 的 `how_to_play_common.json`、`how_to_play_screen.json`、`encyclopedia_screen.json` 及其共享模板。两屏共用真实双栏框架与文章模板；HowToPlay 声明27个主题、Encyclopedia 声明58个主题，其中包含教育、商城、Realms与输入模式条件。声明数量不是实际可见条目数，也不是完整手册覆盖率。

源框架填充宿主提供的可用区域，顶部条高23逻辑单位。左侧宽 `30% + 2`，右侧宽 `70% - 2`，分隔条宽4；标题、Back与控制器提示各有独立区域。可用窗口、安全区与缩放传输由宿主决定。

两个真实滚动视口独立工作。源滚动条宽5；导航的右侧另留2，合计预留7。正文滚动条两侧各留5，合计预留15，不能只把通用滚动条外观缩成5而保留其原有占位。导航行高30，类别标题不是禁用按钮；文章为连续滚动内容，不是 BookReader 的左右书页。

`DocumentHeading` 对应28高的文章标题行、20高且Y偏移−2的原图条；`DocumentParagraph` 对应75%宽正文与默认4单位行间附加距离。无显式 shadow 的源模板不应直接继承通用 Text 的默认阴影，但这也不是缺省引擎字体、行盒或栅格已恢复的证明。

## 内容与 Web 行为边界

接受的主题、键盘焦点、两侧滚动位置分别管理。上述滚动重置 /保留、手动激活与默认首个可用主题是明确的 Web 策略，不冒称源控制器提交时机。正文保留真实 DOM，供选择、复制与辅助技术读取。

宿主负责输入提示图形与文字、触控 /键鼠 /控制器段落、Education /Realms /商城等条件和外部路由。源中重复的 forced-index 不作为公开稳定主题 ID。段落里的图标预处理与 TTS 动态绑定也不等于任意文字解析器或每段都成为 tab-stop。

源背景声明 `textures/ui/White` 与 tint `[.192,.196,.2]`。安装版 `vanilla_base/White.png` 是2×2全白RGBA，完整87字节与固定公开ZIP的 `permissions_player_fade_overlay.png` 相同；组件以该公开原文件作材料别名，并用 CSS multiply叠加源tint。小写 `white.png` 候选已排除。私有安装文件未发布；完整材料身份相同也不代表运行时资源栈或原生实际draw绑定已恢复。

素材身份见 [document-viewer-assets.json](document-viewer-assets.json)：51份完整原件为28PNG、14原metadata、8源UI文件及原许可。保留12份原始插图，公开 `#documents` 的 HowToPlay /Encyclopedia 两种宿主示例使用其中的有限子集，不包含完整本地化手册或自动条件求值；源码参考文件不作为引擎执行。Mojang资源保留原许可，库代码许可不重授权这些素材。

## 验证边界

当前3个真实组件、源与demo已落盘；固定源依据在 `.cache/document-viewer-source-audit-01/`。下列客户端、公开示例与包消费证据分别列出，互不代替。正常字体的原生栅格、缺省阴影、输入路由、完整手册条件与原生整页像素仍无认证。


## 已执行验证

完整正式批次列出59项，实际58通过、1项桌面真实触屏条件跳过；移动端真实触摸滚动通过。新增36次文档DOM/SSR合同与3项像素检查全部通过，未改的ScrollArea回归为19通过、1条件跳过。按正常配置、单worker、零retry执行，批次内70份源/fixture/资源pin无变化。首轮56通过、2失败、1跳过的原记录仍保留：分类标题的文字定位落到内部span，错误地把父层9单位留白及子层−3位移量在同一节点。只修正测试定位，分别验证父层9、子层max50和实际相差6，没有修改产品或降低源几何要求。证据：`.cache/document-viewer-tests-01/FINAL.json`、`FIRST-FAILURE.json` 与 `TEST-ONLY-FIX.diff`。

五种导航素材状态在1×/2×形成10份独立标准nine-slice或disabled整图stretch参考，比较73,500像素，差异0、最大通道差0；实际取回的原PNG字节相同。另核9份原PNG和7份原metadata，原白图乘源声明色得到实际不透明RGBA `[49,50,51,255]`。这验证源素材组合，尚不能认证Minecraft原生整页或文字像素。

`npm run verify:package` 实际构建并安装tarball，在React18.3.1与19.3.1分别通过ESM、146组件＋6份数据＋11函数（163运行时值）、SSR、严格已安装包TypeScript消费、CSS子路径、51份原素材/许可及私有字体泄漏门禁。严格消费覆盖独立sectionTitle、readonly主题集、两视口及主题refs、hint与滚动策略；原有包门禁全部保留。

实际构建后的公开4173预览另外完成10项检查：两源族示例、独立标题与目录、30/70源偏移、23高顶部条、实际5/3/5滑块/轨道宽度、受控拒绝、键盘焦点不提交、切换输入原图、正文重置、返回与原控制器图标请求、文字选择、1×/2×/3×及390宽局部横向预览。页面/控制台/HTTP/请求失败均0，绑定的源码和构建文件无漂移，浏览器已关闭；用户4173服务保留。证据：`.cache/document-viewer-root-01/public-01/FINAL.json`，原版窗口或PIX捕获未在此轮执行，Computer Use未开启。
