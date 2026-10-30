# Classic 书本阅读与编辑

`BookReader`、`BookEditor`、`BookPage`、`BookPageTurnButton` 分别提供双页阅读、书与笔编辑，以及可复用的单页和翻页按钮。它们使用普通文本和真实表单控件，不解析游戏NBT、自动分页或把签名写入世界。客户端合同及138值的实际消费包已分别验证，原生完整书本画面仍待校准。

## 使用

总样式已引入book皮肤；按需使用时可独立导入 `mcbeui/book.css`。字体由应用通过现有字体 / CSS选择，不自动加载原游戏字页。

```tsx
import { useState } from 'react';
import { BookEditor, BookReader, BookPage, BookPageTurnButton } from 'mcbeui';
import type { BookDocumentSnapshot, BookMode } from 'mcbeui';
import 'mcbeui/styles.css';

export function Journal() {
  const [pages, setPages] = useState<readonly string[]>(['第一页', '第二页', '最后一页']);
  const [spread, setSpread] = useState(0);
  const [mode, setMode] = useState<BookMode>('pages');
  const [title, setTitle] = useState('旅行日志');
  const [signed, setSigned] = useState<BookDocumentSnapshot | null>(null);
  const [open, setOpen] = useState(true);

  return <>
    {open && <BookEditor pages={pages} onPagesChange={setPages}
      spreadIndex={spread} onSpreadIndexChange={setSpread}
      title={title} onTitleChange={setTitle} author="Alex"
      mode={mode} onModeChange={setMode} readOnly={signed !== null}
      finalizeEnabled={title.trim().length > 0}
      onSign={snapshot => { setSigned(snapshot); setMode('pages'); }}
      onFinish={() => setOpen(false)}/>}
    {signed && <BookReader pages={signed.pages} title={signed.title}
      author={signed.author}/>}
  </>;
}
```

`pages` / `defaultPages` 是plain-text页数组，每个元素是一张leaf；`spreadIndex` / `defaultSpreadIndex` 从0开始，第s个spread显示第2s和2s+1页。索引按当前页数夹取；奇数最后一页的右页留空，不生成可编辑的虚构页。空Editor保留左侧真实textarea，首次输入通过 `onPagesChange` 发出 `reason: 'create-first-page'`。普通输入为 `reason: 'text-input'`，detail另含pageIndex和原ChangeEvent。

可受控的字段包括pages、spreadIndex、title、author和Editor的mode；对应default属性提供非受控初值。`onSpreadIndexChange` 另给previousSpreadIndex及previous / next原因。受控值以宿主接纳后的props为准；`title` / `author` 默认空字符串，`authorEditable` 默认false。组件不根据title猜测持久化状态，不修改宿主页数组。

## 编辑、签名与宿主动作

`BookReader` 始终只读。Editor默认可编辑，`readOnly` 显示只读页，`disabled` 阻止交互。`textareaProps` 可为对象或按pageIndex返回的函数，`textareaRef(pageIndex)` 可取得对应真实textarea；`titleInputProps` / `authorInputProps` 及各自ref控制封面输入。根ref为section的HTMLElement。`maxPageLength` / `maxTitleLength` 是宿主声明的HTML长度限制，按UTF-16 code units计，不是恢复原游戏的换行或分页算法。

翻页、关闭和签名动作有composition保护；Escape经根onKeyDown后发出关闭意图，已preventDefault、正在组合输入或keyCode229时不继续处理。组件有真实textarea / input，仍需另验真实OS IME、caret与原生字形像素。

Editor的mode为 `pages` 或 `signing`，可用 `defaultMode`。Sign只请求进入封面，Cancel请求返回页视图；每次有效Finalize在可编辑且 `finalizeEnabled` 时调用 `onSign(snapshot)`，不额外重复调用onFinish。snapshot含pages副本、title、author、spreadIndex和mode。是否接受签名、保存、改为只读或关闭由宿主决定；本例仅保存内存快照。关闭按钮 / Escape调用 `onFinish(snapshot,{reason})`，组件不会自行卸载。

结构操作使用 `BookPageAction`：edit、insert-text-page、delete-page、move-page-left、move-page-right。结构按钮仅在受控pages且有onPageAction时启用；`pageActions(pageIndex)` 可进一步声明允许的动作。组件报告action和pageIndex，插入、删除、移动及随后的spread选择由应用更新；edit按钮可聚焦现有textarea。组件不猜配方、书本权限、签名或世界写入规则。

在具备受控pages＋onPageAction结构能力时，默认显示四按钮行；`pageActions(index)` 显式返回 `edit: true` 则选择排他的pencil视图，替代该行以避免原位重叠，点击仍聚焦真实textarea并报告 `onPageAction('edit',index)`。这是宿主可选的Web binding策略，不是新增prop或已恢复的游戏控制器算法。

## 可复用零件

```tsx
export function ReusableLeaf() {
  const [pages, setPages] = useState(['页一', '页二']);
  const [index, setIndex] = useState(0);
  return <div>
    <BookPage side="left" pageIndex={index} text={pages[index] ?? ''}
      readOnly={false} onTextChange={value => setPages(previous =>
        previous.map((page, i) => i === index ? value : page))}/>
    <BookPageTurnButton direction="previous" available={index > 0}
      onClick={() => setIndex(index - 1)}/>
    <BookPageTurnButton direction="next" available={index + 1 < pages.length}
      onClick={() => setIndex(index + 1)}/>
  </div>;
}
```

单页ref为div，`blank` 隐藏其内容，`pageNumber` 为宿主格式化文字。翻页按钮ref为button，方向必填；available=false保留位置但隐藏、禁用、移出Tab顺序和无障碍树。单独使用时，页的尺寸与按钮外层排布由宿主安排。组合组件可通过labels或pageNumberLabel覆盖文案，skin可覆盖相应原图URL与状态三元组。

强制颜色模式隐藏装饰性原图皮肤，改用系统Canvas / CanvasText、可见箭头及焦点标记。这是Web无障碍回退，不改变普通模式的皮肤颜色，也不是游戏原生高对比度画面认证。

## 源布局与素材

固定官方 `v1.26.60.5` Classic JSON中，展开书为320×207游戏单位，每页160×207；翻页按钮24×24，距左右各7、距底9；关闭图绘制14×14，右14、上7。正文框宽为页宽减32、高为页高减58，top23；页码top13，左右正文另有相反5单位偏移。GUI2默认每游戏单位2 CSS px，所以展开书名义640×414 CSS px。

`layout` 可明确给spreadSize、pageSize、unitScale及resolvedMaxSize；后者是宿主已解析的逻辑上限，不是百分比祖先布局 / 引擎clamp的模拟器。未传时保留名义尺寸，窄屏容器可自行安排局部横滚；不把自动响应式缩小当作原版规则。

32张完整原PNG、8份原始纹理metadata和上游LICENSE的逐文件来源见 [book-assets.json](book-assets.json)，来源固定commit `15701fa9c13923f12662984c32c124327e40e3d3`。没有裁切重编码或使用捕获像素。原metadata的base_size、nineslice_size、tiled与物理PNG尺寸分别保留；例如spine物理8×1而base8×2，不能修改原图或套用不可能的物理切片来消除差异。退化中心及重复铺图已按下述有限Web合同独立核对，仍不作为原生整页认证。

```powershell
python scripts/prepare-book-assets.py --check
```

可加 `--reference PATH` 对固定官方full ZIP复验。Mojang素材保留原权属与EULA条款，不按本项目MIT重许可；上游LICENSE随素材保留，见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。

## 验证状态

Book阶段新增4个runtime组件，当时124组件＋4数据＋10函数，共138个运行时值。`#books` 提供Reader、Editor、独立页与按钮的应用内预览；以下结果保留该阶段范围，不因后续Sign增至140值而重新累计。

独立完整第二批30/30通过（12 desktop、12 mobile、6 pixels），36.589420秒，零跳过 / 重试 / flaky，172项渲染及测试输入前后无变化。真实textarea的输入 / 选择 / ref、受控拒绝、空页 / 奇数页、移除正在composition的页、签名快照、排他pencil、禁用、强制颜色和键盘焦点均覆盖；composition事件合同不等于真实OS IME认证。原报告及范围见 `.cache/book-independent-qa/FINAL.json`。

首批28通过 / 2失败保留：翻至末页后，逗号合并的querySelector按DOM顺序先找到textarea，未优先选择仍可用的Previous按钮。仅将生产选择器拆为箭头优先、再回退textarea后完整重跑；测试、期望值与后端没有改变，也不累加首批通过数。

六项视觉检查只证明DOM / CSS / POINT宿主合同：六幅原始翻页状态完整13,824像素RGBA零差，原back / cover的不透明源样点及独立合成212像素条带（96逻辑单位周期＋10单位尾段）通过。该条带检查重复中心行，不是游戏书本截图，也不认证原生百分比clamp或文字光栅。

修复后 `npm run verify:package` 已实际把新tarball安装至React18.3.1 /19.3.1消费者：138个runtime值、Reader / Editor / pages / cover / turn的SSR、strict TypeScript类型 / refs / labels、独立book.css及41份原件（32PNG＋8metadata＋LICENSE）全部通过。日志为 `.cache/book-root-close-01/package-final.log`，不是沿用旧134值包身份。

公开 `#books` 完整计划批27/27辅助检查通过，20.128秒，NVIDIA RTX3050 / ANGLE D3D11 / DPR1，206个输入pin无变化，页面 / console / HTTP / requestfailed错误为0。实际覆盖Code示例、奇数 / 空Reader、输入选择、增删移动、pencil / row与焦点、签名取消及宿主接受副本、disabled / readOnly、关闭 / 重开 / reset、空书首次输入、独立零件和390px窄屏局部横移。记录见 `.cache/book-public-focused-02/FINAL.json`。首public01在完成17项后，runner误将Switch按checkbox定位而超时；新批仅改ignored locator为role=switch，无产品改动，原失败保留，不把17项累计成44，也不计入正式30项。

旧导航6/6另在最新生产site通过，20.7秒、零重试，核对新section未破坏既有anchors、字体布局变化、滚动和侧栏搜索。日志及报告在 `.cache/book-root-close-01/navigation.log` / `navigation-report.json`。这些生产与导航结果认证Web交互和集成，不增加原生像素覆盖范围。

原始素材与Web合同均不认证完整游戏画面。祖先百分比clamp、默认字体换行、caret / IME像素、安装版活动路由、原生签名和最终Present均保留为后续工作；未声称native0或全部Classic页面覆盖。

## 后续原生捕获与有限混排分析

2026-10-30 已保存 GUI5 的空书、混合文本正文与空标题签名页捕获；索引为 `.cache/book-sign-native-gui5-01/root-observations.json`。三份实际 API 列表和静态 draw 索引已完成：空书23、混排30、签名46个 UI draw。当前仅混排正文做了有限字页 / 顶点分析；Book完整RT读取、空书 /签名字体解码与产品整页比较仍未完成。空标题签名页是取消前的编辑状态，不是已签名Reader样本。

混排正文的 Latin完整纹理唯一匹配 `glyph_00.png`，中文也来自对应Unicode整页；它支持整值替代字体路径，不能解释为 default8 Latin加逐字CJK回退。31个正文glyph均为黑色，LINEAR /CLAMP；normal角色的投影约每local单位5 physical px，为两Sign large角色的一半。显式换行的第二行local Y为10，中文pens为0/9/18/27/36/45；不是据此恢复所有自动换行。该帧没有可见caret draw，因此不能将Sign绿色caret推断为Book caret颜色。

来源见 `.cache/book-sign-font-selection-study-01/FINAL.json`（SHA256 `c70a52590ad762e09bdac4067410626207f7a7a3572c9fc31e130744402efba2`）及其 `BOOK-SUPPLEMENT.md`；五捕获的离线导出与索引见 `.cache/book-sign-native-gui5-analysis-01/FINAL.json`。精确字体切换谓词与native advance尚未恢复，宿主Unicode Latin宽度仍与该捕获不同；当前Book未因此新增自动字体选择或改字号来拟合样本。上述是来源分析，不追加Book正式用例数或产品native零差声明。
