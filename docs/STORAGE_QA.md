# Classic Storage：Settings内容区与八个部件

Storage不是独立磁盘管理器或通用搜索表格。固定官方 `v1.26.60.5-full` 源将Storage header和main body放在Settings同一个滚动内容里，只有selection footer在外。库提供 `StorageManagement`、`StorageToolbar`、`StorageCategory`、`StorageItem`、`StorageItemActions`、`StorageSelectionFooter`、`StorageDependencyDialog`、`StorageSharingProgress` 八个真实可复用部件；当前源码已冻结，并完成下述分阶段Web材质、行为、真实安装包与公开预览验收；原生完整GUI仍未认证。

## 最小宿主数据

```tsx
import { StorageManagement } from 'mcbeui';
import type { StorageActionControl, StorageCategoryData } from 'mcbeui';
import 'mcbeui/styles.css';

const shown = { included: true, visible: true, enabled: true };
const omitted = { included: false, visible: false, enabled: false };
const off = (label: string): StorageActionControl => ({ state: omitted, label });
const categories: readonly StorageCategoryData[] = [{
  id: 'worlds', kind: 'world', label: '世界', sizeText: '由宿主格式化', state: shown,
  items: [{
    id: 'world-a', name: '应用提供的世界', sizeText: '1 MB', state: shown,
    imageVisible: false, gameTypeText: '宿主模式', dateText: '宿主日期',
    checkboxVisible: true, optionsVisible: false,
    actions: {
      generateTextureList: off('生成纹理列表'), delete: off('删除'),
      share: off('分享'), dependencies: off('依赖项'),
    },
  }],
}];

<StorageManagement
  label="本地存储内容"
  size={[340, 240]} scale={2} state={shown}
  standardVisible categoryPanelVisible
  toolbar={{
    state: shown,
    location: { state: shown, label: '位置', externalLabel: '外部', appdataLabel: '应用数据' },
    clearCache: off('清理缓存'), clearLayoutCache: off('清理布局缓存'),
    clearDownloadCache: off('清理下载缓存'), clearScreenshotsCache: off('清理截图缓存'),
    deleteLocalScreenshots: off('删除本地截图'),
    multiselect: { state: shown, label: '多选' },
  }}
  categories={categories}
  deleteControl={off('删除选中项')}
  defaultValue={{ location: 'external', multiselect: false, expandedIds: ['worlds'], selectedIds: [] }}
  onValueChange={(next, detail) => console.log('草稿请求', next, detail.field)}
  onAction={detail => console.log('操作请求', detail.action, detail.target)}
/>
```

所有名称、大小 /日期 /版本等字符串已由宿主解析，示例不扫描文件。`size`是已经扣除Settings无关导航 /header后的逻辑内容区域；scale默认2，为正整数。独立CSS入口为 `mcbeui/storage-management.css`，完整styles入口也包含它；源码示例的类型检查不代替实际已安装包验证。

## 状态、请求与引用

`StorageManagementValue` 保存nullable `location`（external /appdata）、multiselect和readonly `expandedIds` /`selectedIds`。`value` /`defaultValue`与 `onValueChange(next,{field,event,categoryId?,itemId?})` 支持受控拒绝；隐藏、disabled或孤立ID不会在请求快照里自动过滤。分类、条目与权限条件是宿主数据，不从文件名、锁图标或行内容推断。ID要求非空、集合不重复，整体条目ID跨分类唯一。

`StorageControlState` 的included /visible /enabled分别描述构造、可见与可用。字段须由宿主解析源ignored /binding，不运行任意JSON-UI表达式。Web隐藏策略不是全部引擎invisible控件占位规则的恢复。根或祖先disabled /enabled是所属动作门禁；readOnly保留查看 /展开等非破坏交互，阻止修改和破坏性请求，具体独立部件合同以最终source为准。

`onAction`只发 `{action,target,event,categoryId?,itemId?,reason?,value?}`。删除、清缓存、移动存储位置、世界转换 /同步、移除依赖、分享与纹理列表生成均不由库执行。调用方原生事件及part /root冒泡可preventDefault；组合内部延迟派发，避免叶部件与根重复请求。动作target保留已知源字面量；缺失popup模板对应的target须显式给出，不用引擎执行来校验它。

|部件|复用范围与ref|
|---|---|
|`StorageManagement`|Settings内容组合；section ref、真实viewport /toolbar /footer /location refs、分类 /item /checkbox按ID refs。|
|`StorageToolbar`|位置radio菜单、五种独立清理动作与多选；div ref，location button ref，多选原生input ref。|
|`StorageCategory`|六种factory或独立迁移分支；section ref，toggle button及item /selection refs；展开与选择分别受控。|
|`StorageItem`|标准 /dependency /dependent呈现；div ref与真实checkbox ref，独立selection /checkboxVisible /optionsVisible。|
|`StorageItemActions`|六个固定位置的inline action tray；div ref、每项action button ref；支持的按钮位置不自动收拢。|
|`StorageSelectionFooter`|外置多选删除行；div与delete button refs，没有源默认bulk Share。|
|`StorageDependencyDialog`|嵌套依赖 /dependent列表、remove请求和读到底门禁；div /viewport /continue-scroll refs。|
|`StorageSharingProgress`|268×95源进度组合，0…1是Web归一化可见比例；div ref，不实现分享任务 /自动完成。|

六个标准factory是world、world-template、resource、behavior、skin、cache。legacy-world与retail-to-preview-world独立输入，保留sync、conversion guidance与loading。`loadingFrame`是宿主解析的0…9窗口，64×8原sprite初始frame0不等于已恢复动画时钟。selection不自动展开action tray，lock /warning /error /update也不推导删除授权。

## 源几何与未恢复部分

主header与body同scroll，footer外置。主mouse预留1＋5＋2＝8逻辑单位，dependency mouse为2＋5＋2＝9。`inputMode="touch"` 使用独立4单位contained profile，不画mouse轨，默认不显示thumb；可显式给touchThumbVisible /minThumbSize。旧mouse行为保持独立。未实例化的Storage自有90%−5 scroll模板不能替换Settings实际fill-height宿主。

分类toggle高30，world /template /skin标准行30，pack /cache行40；dependency /dependent分别32 /25。checkbox占位20，源checkbox图10²；checked与unchecked仍使用实际源palette /模板，不补绿色选中卡片。当前Web将图在slot内居中再加源offset1，得到x＝(20−10)/2＋1＝6。原始delete_checkbox与common.checkbox_image都没有anchor声明，x6不能升级为已证native默认anchor。版本、description及metadata的ignored /visible分支分别保留。

action tray按条目模板逻辑宽W解析Y＝24＋.03W，六格各Y−6、五个间隙2、两侧4，总宽6Y−18；保留空格，不把可见按钮紧密排列。`item.optionsModal` /独立actions的 `modal` 是显式host inline键盘范围，不把整个Settings设为inert modal。source sorting /grouping实例和search已注释，footer Share为ignored:true；本组件不公开声称它们已作为默认Storage功能恢复。Signals的UpdateGlyph有原资源，只有tray的storage/update和平台windowsshare缺精确公开原图，需host glyph或保留缺图边界。

依赖modal的已证父panel为desktop372×218或available-frame双轴−4，hollow2 /fill .98 /无原生Close；底部holder为[panelW−14,30]、Y偏移−7。两个原 `modal_first_button` /`modal_second_button`在固定206文件中缺定义，不能默认声称左右等宽或默认target已恢复。`continueButton` /`cancelButton`必须有host给出的rect `[x,y,w,h]`（相对holder）与target；`continueReady`可显式给源binding，省略采用Web视口实际到底状态。holder内保留disabled-left、left、right三个真实siblings，前两者互斥显示；`continueScrollRef`独立指向禁用提示按钮。依赖层级和移除请求不修改实际资源集合。

源码已按独立审查修正progress原图nine-slice、compact版本metadata、祖先禁用及checked源文字 /checkbox尺寸等，但不冒充完整native布局或栅格验收。完整源映射见 [storage-source.json](storage-source.json)，素材见 [storage-assets.json](storage-assets.json)：phase01为42私有语义key；phase02已冻结为43key /40源路径 /37个不同完整PNG身份，新增deleteGlyph复用既有trash.png（13×17图、源显示15×17）。不新增物理文件，原有9个新增原件仍共2,475字节，旧42项字节不变。不按研究依赖闭包批量发布无关素材，Mojang素材权属保持原许可。

## 当前验证边界

源研究与独立复核已完成，Storage八组件 /30类型已source冻结，producer的18组真实SSR /静态检查和类型检查通过，见 `.cache/storage-implementation-01/FINAL.json`；这项CPU证据与后续实际包、客户端验收分别记录。

首个完整正式批99项实际94通过、1个预期设备跳过、4失败，1,014份输入pin无漂移，原件保留在 `.cache/storage-tests-01/run-01/RESULT.json`。desktop /mobile共28次Storage行为检查均通过；四项失败发生在材质比较，不能写成99项全绿。独立CPU诊断 `.cache/storage-fidelity-triage-independent-01/FINAL-v02.json` 与新只读场景 `.cache/storage-root-01/triage-live-01/` 解释了比较前提：

- checkbox首次期望x1，与当前明确的Web居中x6不同；保留原版默认anchor未知，不把产品改到测试假设。
- 完整13×17 trash显示为源15×17时，参考采用像素中心POINT采样 `floor((x+.5)×13/15)`，而不是左边缘取样。像素中心及texel坐标约定参考[微软Direct3D 10坐标说明](https://learn.microsoft.com/en-us/windows/win32/direct3d10/d3d10-graphics-programming-guide-resources-coordinates)；它是参考模型依据，不认证所有浏览器 /原版引擎的采样路径。
- 首次hollow2截图包含title /body /按钮等兄弟绘制；改为明确隔离整个材质平面后比较完整372×218矩形，不用边框子集、mask或裁图避开差异。
- sharing的DOM高度5正确，但指定DPR1场景中Y＝217.5导致截图包围整数高度6；保留原350高host失败，另用351高host得到Y＝218 /截图高5，完整248×5平面比较，不裁去一行。

只纠正这些比较前提后，八项材质正式复验全部通过，991份输入pin无漂移、产品源码不变，记录 `.cache/storage-tests-01/pixels-02/RESULT.json`。19份完整平面合计160,301像素严格RGBA差0，见同目录 `PLANES.json`；这是有限源 /Web material验收，不是native整GUI。它与首99项分阶段记录，四个原失败不覆盖，也不把复验中重复的四项通过另加成新唯一用例。

共享ScrollArea touch分支另有真实38项中的37通过 /1设备条件跳过、963pin无漂移，12个完整thumb平面4,480像素RGBA差0；这是共享Web texel合同，不为Storage新组合补造通过数。

实际包第二轮通过，见 `.cache/storage-root-01/package-02.log` 与 `.cache/storage-release-01/PACKAGE.json`。React18.3.1 /19.3.1真实安装消费者通过190个运行时值（173组件、6数据、11函数）的ESM /SSR、36个新增类型的严格TSX及负例、CSS /素材 /字体 /许可检查；774个包文件中649个dist条目与构建和两个消费者逐字节相同，439个完整源URL引用通过。已测包SHA为 `e859946cf1cc9fbb70700e93682642312278ab786ab636c049eae3d791bf7b8c`；后续仅文档重打包须另证非文档payload身份。首轮包门禁误将既有Crafting /库存CSS中相同whole White候选判作新增Screenshot素材泄漏，独立追溯后窄修门禁；首日志与来源证据保留，并非产品素材新增或White原生alias获证。

公开构建预览14项辅助检查通过，记录 `.cache/storage-public-01/FINAL.json`。另有实际已安装包React18 /19各dev /production共四个场景全部通过，记录 `.cache/storage-installed-browser-01/run-01/FINAL.json`，1,906份输入pin无漂移。每场景在真实DOM核对43项完整素材字节，并验证checkbox拒绝 /接受与父事件veto、location两radio、inline tray、依赖列表真实滚到底 /焦点 /inert、双Continue分支与host rect、拒绝关闭后取消恢复焦点、sharing显式比例与关闭；不以data URL身份冒充HTTP请求。四场景各自浏览器和服务均finally关闭，页面 /console /请求错误为0。公开14与安装四场景不并入首99项或八项材质复验的正式数量，也不认证原生布局或资源操作后端。

本轮原版窗口激活失败，两次WGC黑帧没有保存为参考；只重试一次，随后关闭本人启动的游戏PID并reset CU，记录 `.cache/storage-native-01/RESULT.json`。没有得到可用native图、实际Storage状态 /字体 /provider或完整GUI资格，不能写成已完成原生采集。
