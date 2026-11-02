# 完整熔炼屏幕：源合同与验证边界

本轮在既有`Furnace`／`BlastFurnace`／`Smoker`右pane之外增加完整Classic屏幕与独立熔炼配方书。八个组件为`FurnaceScreenFrame`、`FurnaceScreen`、`BlastFurnaceScreen`、`SmokerScreen`、`FurnaceRecipeBook`、`FurnaceRecipeBookEntry`、`FurnaceRecipeCategoryTabs`、`FurnaceRecipeFilterToggle`。实际React18／19包已确认227组件／245运行时值；原生整页像素仍未认证。

## 来源

固定官方`v1.26.60.5-full`、commit `15701fa9c13923f12662984c32c124327e40e3d3`；完整ZIP及九份原JSON逐字身份见[furnace-screen-source.json](furnace-screen-source.json)。依据是完整furnace屏幕、其BlastFurnace／Smoker继承以及common／Classic／tabs／button／recipe依赖，不能只用局部截图或旧组件形状反推源合同。两种变体的源屏幕为空覆盖，不据此猜不同配方数据库、默认类别或引擎可见状态。

## 尺寸与结构

以下均为逻辑game像素；现有GUI2 Web profile使用2倍CSS尺寸。

| 分支 | 完整frame | book | fold | 右pane |
| --- | --- | --- | --- | --- |
| expanded | 326×166 | x0，146×166 | x146，4×166 | x150，176×166 |
| compact | 176×166 | hidden | hidden | x0，176×166 |

这是内容横向组合的intrinsic尺寸，不是固定326宽在compact两侧加75留白。布局状态由宿主显式控制；源JSON不声明Web响应式断点或可推定的native默认。Toolbar位于frame上方20，显示close时宽99、隐藏close时宽84；关闭glyph15×15与21×21命中区域分别保留。右pane复用既有三种处理容器与39槽，不额外生成内部close。

## 配方书合同

`FurnaceRecipeBook`复用既有Search、滚动、grid与条目行为核心，但使用独立熔炼profile：

- `entries`、`categoryId`、`categoryBindings`、`categoryLabels`、`filteringEnabled`与`inventoryTab`由宿主给出；query与选择／操作等沿用既有RecipeBook合同。配方数据必须由宿主预先筛选，不执行世界配方查找或熔炼。
- `inventoryTab`与`categoryId==='search'`独立，保留普通、search、inventory、inventory＋search四分支。普通列表为`[6,21,134,139]`，search为`[6,37,134,123]`；inventory无search为`[6,6,134,154]`，两者同时成立为`[6,22,134,138]`。
- Food／Items／Blocks／Search的25宽holders固定，前三级起点为0／25／50，Search为121；中间fill为46。隐藏子control不重新pack holders。Food有visible；Items／Blocks分别接收leftmostVisible与normalVisible；二维offset只作用于各自holder内control，Search始终最右且没有provider offset。
- 过滤按钮29×17，居中原图27×15、inset1；unchecked／checked及各hover使用四张完整furnace原PNG。锁定alpha只是源参数，不推导普遍CSS group opacity或最终原生RGBA。
- `FurnaceRecipeBookEntry`不拥有craftableCount、crafting group、item count／durability控件；类型与运行时均排除这些旧crafting派生内容。宿主`icon`仍是宿主节点；red背景不自动推断disabled。条目保留选择、原tooltip与主／次／第三操作请求。
- inventory nodrop是源区域与宿主drop intent的边界，不能伪装完整引擎拖放或加全屏拦截层。DOM roving焦点、原生输入事件与滚动是明确Web策略，不等于引擎controller／focus工厂恢复。

## 完整屏幕API与宿主责任

实际模块为`furnace-screen.tsx`与`furnace-recipe-book.tsx`；统一样式以`mcbeui/styles.css`接入，也可导入`mcbeui/furnace-screen.css`。以下API已完成实际包消费验证：

| 入口 | 主要输入 | ref |
| --- | --- | --- |
| FurnaceScreenFrame | 必需title、recipeBook:ReactNode、children；layout／defaultLayout、onLayoutChange、onHelp／onClose、showClose、toolbar各label、disabled | HTMLElement |
| FurnaceScreen／BlastFurnaceScreen／SmokerScreen | recipeBook:FurnaceRecipeBookProps必需；title可选，processing?:Omit<FurnaceProps,'title'>；其余复用frame chrome | HTMLElement |
| FurnaceRecipeBook | 必需entries／categoryId／categoryBindings／categoryLabels／filteringEnabled／inventoryTab；其余继承有限RecipeBook props | HTMLDivElement |
| FurnaceRecipeBookEntry | entry:FurnaceRecipeBookItem，保留原entry操作／宿主icon | HTMLButtonElement |
| FurnaceRecipeCategoryTabs | bindings、labels、value必需；onValueChange、label、panelId、disabled | HTMLDivElement |
| FurnaceRecipeFilterToggle | filteringEnabled或defaultFilteringEnabled、onFilteringEnabledChange、label与原按钮属性 | HTMLButtonElement |

`FurnaceScreenLayout='recipe-book'|'compact'`。非受控Web初值为recipe-book，showClose=true；这是显式库策略，不是恢复出的引擎默认。`disabled`只锁toolbar／help／close／Escape，右pane与slot仍由各自宿主状态控制。默认标题分别为Furnace／Blast Furnace／Smoker，标签均可显式传入；布局请求不替宿主决定物品服务。compact使用hidden保留book节点，而不是卸载整棵配方书。标题、类别文案、可见性、offset、接受后的layout／query／filter、输入／燃料／结果、比率与玩家背包由宿主提供；库不推断物品资格、不消费燃料、不修改库存、不连接游戏服务。

## 当前验证状态

最终修复后的有限检查：

- Node最终49／49通过：共享core27、熔炼book13、frame9。React18.3.1／19.3.1共18份提取前后完整SSR逐字一致，包含全部生成ID。
- browser04单批143／143，0失败／跳过／重试／flaky。包含新族桌面／手机26个项目用例（含2次SSR）、原processing8项、旧Crafting／Survival／inventory source109项。四种inventory／search分支还检查标题、输入、filter完整矩形。普通header filter为GUI2 `[224,7,58,34]`，搜索为`[224,37,58,34]`，inventory＋search为`[224,11,58,34]`。
- material02独立官方ZIP生成8个filter完整58×34平面（四状态×黑白背景），在GUI2／DPR1共15,776个RGBA像素严格零差，无mask、容差或裁边。只限定这8个Web材质平面；3个分类icon另有原图身份与源17×17显示框，未称原生采样通过。
- 完整`npm run verify:package` package03通过：React18.3.1／19.3.1实际227组件＋6数据＋12函数，ESM、类型、字体策略、资源与许可通过；新族每peer29项SSR及19个严格负类型合同。180个源模块闭包的699个原始字节资源引用通过（654PNG／39TGA／6JSON）。
- 新增7PNG与官方ZIP及两份安装归档分别逐字相等；四状态皮肤没有捏造JSON元数据。既有完整上游许可与新材质归属随包保留。
- fresh installed02：React18／19×默认Vite开发／生产四组合全部通过，直接使用修复版实际tarball，无src alias或fs.allow改写；验证ref、布局收起、query／filter、宿主拒绝、inventory＋search几何、**普通header filter绝对位置**、原图交付与禁用边界。四个临时服务已退出。
- built02桌面／手机两组生产页检查通过，实际`4173`响应与`site/index.html`逐字一致；原始资源无HTTP错误、pageerror或src／cache alias。实际操作展开／收起、help、close／reopen与焦点恢复；两组header filter均为`[224,7,58,34]`。已查看修复后的完整desktop book／tabs／toolbar截图；用户预览继续运行，Computer Use本轮未开启。

最终功能受检tar SHA256为`97942bbbe258bd4eb016772833a7e4bc113a153d55ba59be4fc755329ce77990`，保存在`.cache/furnace-installed-02/candidate.tgz`。最终文档包另记于`.cache/furnace-qa-01/PACK-IDENTITY.json`，要求全部dist／package.json成员与功能包逐字一致。日志及原图比较位于`.cache/furnace-qa-01/`；独立来源／实现审计位于`.cache/furnace-independent-review-20261102-01/`。

### 保留的失败与修复经过

browser01为140通过／3失败，browser02为1通过／2失败，browser03为2通过。定位器最初把原生searchbox写成textbox，随后grid选择包含36个玩家背包格；另一次旧材质检查被catalog格式整理引发的Vite reload中断。失败截图／trace全部保留，未改原图或阈值。package01只在新helper误查input原始aria-label而非既有label关联处失败；查实际type=search后package02通过。

**最终看图另外发现真实产品问题**：旧CSS先导入recipe-book再导入inventory-screens，同优先级的relative覆盖header filter的absolute，built01实测`[12,7,58,34]`，应为`[224,7,58,34]`。此前的package02／installed01虽通过有限合同，未覆盖这个位置，不再作为最终CSS资格。原功能tar `7d551e65b3385f23ea6111069e34a9a88b10833c7cec1fa50b55736a6364f320`及所有旧结果保留。

修复同时调整依赖导入顺序，并为Furnace所属header filter／categories增加更明确的absolute规则；最终Book CSS SHA256 `73c1b0ead6ffc9bbdf9cbd757d6d88171c31faaa455354f7f454c567b47382ae`。补齐了source矩形及实际安装包非搜索分支断言，再完成上述browser04／material02／package03／installed02／built02。独立补审`AMENDMENT-01/FINAL.json` SHA256 `56c514d239c7dafe794942b3a8bc7cecaa75e8cae46bafb4606b23bd7c3a0db6`承认原静态审查遗漏cascade，并复验新规则在晚到的generic样式下仍生效；未覆盖旧审计。

## 使用示例

```tsx
import {FurnaceScreen} from 'mcbeui';
import 'mcbeui/styles.css';

<FurnaceScreen recipeBook={{
  title: '可烧炼配方', entries: [{id: 'iron', label: '铁锭'}],
  categoryId: 'search', query: '', inventoryTab: false,
  filteringEnabled: false,
  categoryLabels: {food: '食物', items: '物品', blocks: '方块', search: '搜索'},
  categoryBindings: {
    food: {visible: true},
    items: {leftmostVisible: false, normalVisible: true},
    blocks: {leftmostVisible: false, normalVisible: true},
  },
  // 将回调接到宿主状态；不接受请求时，受控值保持原样。
  onQueryChange: next => console.log(next),
}} processing={{progress: .5, fuelRemaining: .75}} />
```

## 尚未资格确认

未认证原生viewport／origin／guiScale默认、类别provider状态、字体metrics／bearing／AA／paint offset、全局half rounding、grid重缩放／snap、clip／滚动、parent alpha最终合成、引擎拖放与controller行为；Pocket及其他平台分支不在本次Classic范围。完整源皮肤、功能通过或有限Web像素合同均不构成原生整GUI零差。
