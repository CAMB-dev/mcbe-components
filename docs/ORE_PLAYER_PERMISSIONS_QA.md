# 玩家权限：OreUI源组合

`OrePlayerPermissions`、`OrePermissionLevelSelect`、`OrePermissionToggleRow`、`OrePlayerCard` 和 `OreSwitch` 是独立的现代权限组件。它们依据本机安装版HBUI /OreUI源研究实现，保留原来的Classic四组件；源码可用不等于原生整页像素、所有运行时主题或权限服务已恢复。

## 2026-10-31 选择器悬停状态与高光修正

后续字体行框诊断没有进入产品。三份原字体的表度量支持一个统一strut候选：纯CJK字符串外层使用Noto行框，内层保留原Ten /Seven字族且line-height为0，字号、父行高和字距不改。实际普通页 /菜单A/B/A守卫完整一致，21 /26个父矩形与行高不变；B分别有1258702 /2732633个不同像素，仍未达到整页零差，且新增3844 /1374个错误像素。有限标题 /说明的纵向墨迹证据改善，实际原生基线、全部fallback选择和栅格仍未知，不能把指标改善升级为默认字体策略。证据 `.cache/ore-permissions-font-metrics-01/`、`.cache/ore-permissions-linebox-probe-01/` 与 `.cache/ore-permissions-linebox-audit-01/`。此后黑板接入是独立组件增量，不回填为本次字体探针输入。

角色选择器恢复 secondary hover 的上下高光：普通状态仍为白色 `.6 / .4`，悬停状态改为 `.8 / .6`，同时使用原来的 hover 底色。源 `Ld` 使用 mousemove /mouseleave 维护 hover，click、focus 和菜单打开本身不写 hover。当前 trigger 对应保存鼠标事件状态，禁用时不进入 hover，离开时清除；切换响应式表现时重置旧 trigger 的状态。没有增加“展开即悬停”的规则，forced-colors 仍清除装饰阴影。原生输入模式、hidden /dragging 等引擎 gate 尚未恢复。

本轮完整111项同批回归实际 **108通过、3个预期桌面触摸设备条件跳过、零失败 /重试**，965份输入指纹前后零漂移。新增输入历史检查覆盖键盘打开、显式鼠标事件序列、禁用与切换表现；另有54个预声明的底色 /上下高光采样，覆盖GUI1 /2 /5并保持原1/16px几何与颜色1容差。初步检查曾因GUI1进入segmented分支而找不到compact trigger，后将测试的源窗口明确固定为100u宽的tablet分支；颜色、采样位置规则及容差未改。证据 `.cache/ore-permissions-trigger-tests-01/run-01/`，初步两批记录保留。

实际React18.3.1 /19.3.1包的155组件＋6数据＋11函数消费、类型与资源检查通过，新构建公开预览9项通过。公开API未变。证据 `.cache/ore-permissions-trigger-release-01/`，原生资源与字体不进入发布包。

严格整页资格仍未取得。保留旧程序调用click的输入候选时，本轮 `.cache/ore-permissions-pix-browser-06/` 与05完整RGBA相同：普通页 /菜单仍有1294293 /2738409个不同像素。另独立执行真实鼠标hover→click且之后不移动指针的候选：按钮点击前hover为true，菜单出现后为false，菜单仍有2725659个不同像素。这个实际结果不能声称已匹配原生指针历史；也不能把不同输入候选的总分当作同一状态下的产品改善。证据 `.cache/ore-permissions-pix-pointer-01/`。

原透明度实验的7275 /7855个新增错误集中在trigger底部反光带；大片L1退化也对应normal与hover底材混杂。强源 `.cache/ore-permissions-composite-source-01/` 与独立 `.cache/ore-permissions-alpha-regression-01/` 支持这一解释，旧回退数字保留。源modal使用黑色 `.7` 背景，未发现整组opacity；原版全局modal与页面为兄弟层，当前组件采用有界portal，结构差异本身尚不能证明合成误差的原因。

当前产品下另做真实鼠标输入的统一alpha诊断A/B/A，全部41条显式rgba纳入同一变换，49份输入无漂移；普通页 /菜单各自前后A完整RGBA一致。B仍有160943 /274025个不同像素，均非零差。菜单实际hover仍被清除，不能把这批称为“已固定原生hover材质”的量化认证。产品透明度保持作者原值，证据 `.cache/ore-permissions-alpha-probe-02/run-01/`。

字体另有一次只追加 `--disable-lcd-text` 的历史A/B/A。该开关定义见 [Chromium官方源码](https://chromium.googlesource.com/chromium/src/+/HEAD/content/public/common/content_switches.cc)；本机shell含相应字面量，实际owned进程命令行与CDP版本均保存。两组A守卫及05基线完整RGBA一致，B的普通页 /菜单仍有1294385 /2738189个不同像素，alpha完全不变，未消除已观察到的中文位置差。这是浏览器诊断，不能作为可部署组件修复；它对应本轮hover修改前的产品快照。首次命令行观察接口因缺少enable-automation而失败，未额外加启动flag，后改用只读owned进程CIM观察并完整执行。证据 `.cache/ore-permissions-lcd-probe-01/`、`-02/` 与 `.cache/ore-permissions-lcd-audit-01/`，不以诊断ROI替代整页评分。

## 前一轮：页头与横向网格修正

原版 `tO` 页头由三层组成：导航底部 `.2u` 白色 `.2` 高光、流内 `.4u` 灰条和流外 `.2u` 黑色 `.3` 阴影。本轮恢复三层，底部高光覆盖完整页头宽度，包括左右安全区外侧；装饰层不接收指针事件。安全区继续使用宿主显式提供的窗口参数。

网格原始父链确认 `AR` 为 flex column /居中，Row 使用 `width:100%`、换行和 `flex:0 1 auto`；128u 最大宽度属于 Row。现在恢复这些关系，原 desktop /tablet /narrow gutter 常量不变。固定2570px、宿主 `guiScale=5` 候选下，源码预声明预测的玩家列表x50、右面板x880及内部角色容器x885与Web测量一致。原路由没有传 `fullHeight`；当前 `height:100%` 保留为既有Web宿主适配，不宣称恢复了原生纵向布局或实际provider。

本轮完整108项同批回归实际 **105通过、3个预期桌面触摸设备条件跳过、零失败 /重试**，962份输入指纹前后零漂移。新增页头72个预声明采样跨GUI1 /2 /5和安全区分支，保持原几何容差1/16px、颜色容差1；行上限测试也覆盖宽宿主的GUI1 /2 /5。实际React18.3.1 /19.3.1包的172值消费及新构建公开预览9项均通过。证据 `.cache/ore-permissions-header-grid-tests-01/run-01/`、`.cache/ore-permissions-header-grid-release-01/`。

同一份原始2570×1405整页、同一候选参数与严格零容差比较，本轮普通页 /菜单仍分别有 **1294293 /2738409个RGBA像素不同**。两者均为 `DIFFERENT`，不是原生整页认证。来源与布局证据为 `.cache/ore-permissions-header-source-01/`、`.cache/ore-permissions-grid-source-01/`、`.cache/ore-permissions-pix-browser-05/`。此前各批次仍保留原始身份。

另做本地诊断实验：仅将所有显式 `rgba()` 作者透明度统一按 `floor(255×alpha)/255` 变换，保持RGB、字体、几何、图片与其余CSS不变。普通页和菜单各自A/B/A实际执行，前后A的全部RGBA一致；B仍有160943 /286775个不同像素。该实验支持透明度量化假设，但不能唯一证明引擎内部混合机制，也没有进入产品CSS。实际provider、字体栅格、动态头像和末两项宿主文案等限制仍在，不能用诊断结果代替当前组件的整页结果。证据 `.cache/ore-permissions-alpha-probe-01/run-01/`，本机原生输入及字体均不发布。

## 前一轮：原生整页对照与盒模型修正

这次已取得普通页与四角色菜单的真实 PIX 帧及完整、带透明度的原始 OreUI 页面纹理，详见 [GPU采集记录](GPU_CAPTURE_QA.md)。原生输入纹理到原生 UI 层的全帧零差已经独立复核；这个结果不认证 Web 组件。活动 `core.device.display` provider 仍未读取。

原始源码层级与有限原生色边界共同确认了以下修正：Switch 的 `.4u` 底带位于固定 `3.2u` 内框内部，内框包含边框；默认隐藏旁侧文字时，根的正常流高度由 `2.8u` rail 决定，绝对定位的滑块向上溢出。角色选择器的 `4u /4.2u` 高度作用于内层 shine，外框另有 `.2u` 边框、真实 `.4u` 底部 padding 和 `−.4u` 抬升 margin。详情面板恢复 `.2u` 边框。玩家卡片的角色图标容器补全 `2.4u` 宽高，支持宿主传入的 mask 节点。新增内层也保留 forced-colors 的系统颜色与阴影重置。

这些修正来自保存的源码结构及预声明盒模型。固定 `u25` 候选下，原生精确色边界支持滑块总高80px、compact trigger外框120px，源码流程预测 trigger顶端235px与首权限行455px；Web修正后符合该纵向流程。候选单位与 provider 的实际值保持区分，未把这些绝对坐标硬编码到组件。现有 tablet gutter 常量保持原样，横向残差尚未解释。

修正后的完整107项回归实际104通过、3个预期桌面触摸条件跳过、零失败和零重试，包含 OreUI、Classic权限与滚动条。证据 `.cache/ore-permissions-box-tests-01/run-01/`：960份前后指纹中，959份源代码、测试、资源及其他输入不变；唯一变化是测试期间更新的本QA文档，故不宣称“960份全部零漂移”。旧107及图标单独42项批次保留各自身份，不重复累计。

当前修正的实际包通过 React18.3.1 /19.3.1 的155组件＋6数据＋11函数（172值）ESM、SSR、TypeScript、CSS、资源和许可验证；新构建的公开预览9项检查也全部通过，测试浏览器关闭，用户原4173服务与标签保留。证据 `.cache/ore-permissions-box-release-01/`，这些检查继续只认证公开Web合同与包消费。

本机完整页面比较固定为2570×1405、宿主 `guiScale=5` 候选、原始字体与合法本机资源、Chromium headless /ANGLE D3D11、零容差且不裁切、不缩放、不遮罩。最初 base /menu 分别有1592927 /2809534个RGBA像素不同；修正后最新批次为 **1370879 /2773423个不同像素**，两个页面总像素数各3610850。严格结论均为 `DIFFERENT`，绝非整页通过。真实字体节点确认加载 Ten、Seven 和 Noto Sans SC，但不证明它们的原生栅格相同。

比较仍含明确的宿主输入限制：示例头像是安装资源中的占位图，原生使用动态玩家头像；最后两项说明尚未从该首屏核准，可能影响滚动条指标。透明度取整、字体栅格、横向布局、焦点显示与这些输入差异仍待处理。旧批次和错误盒模型假设均保留，不以蒙版、增大容差或替换原生期望图来消除差异。证据分别为 `.cache/ore-permissions-pix-browser-01/` 到 `-04/`、`.cache/ore-permissions-native-geometry-audit-01/` 与 `.cache/ore-permissions-box-oracle-01/`，原生帧、字体及纹理不随库发布。

## 使用

```tsx
import { OrePlayerPermissions } from 'mcbeui';
import 'mcbeui/styles.css';

<OrePlayerPermissions
  label="玩家权限（OreUI）"
  viewportSize={[1440, 1000]}
  guiScale={1}
  locale="zh_CN"
  scrollInputMode="mouse"
  players={[{ id: 'alex', name: 'Alex', avatar: <HostAvatar /> }]}
  permissionOptions={[{ id: 'build', title: '建造', description: '应用提供的说明' }]}
  defaultSelectedPlayerId="alex"
  defaultValue={{ alex: { level: 'member', permissions: { build: true } } }}
  onValueChange={(next, detail) => reviewDraft(next, detail)}
/>
```

`HostAvatar` 与 `reviewDraft` 是应用提供的组件 /处理函数。独立样式入口为 `mcbeui/ore-player-permissions.css`，完整 `styles.css` 已包含它。公开预览入口 `#ore-player-permissions` 与Classic `#player-permissions` 分开。

## 角色、草稿与零件

|组件|实际ref与用途|
|---|---|
|`OrePlayerPermissions`|section；玩家 /权限双视口、player /permission按ID refs、level容器与trigger refs。接入宿主数据和请求，不执行后端。|
|`OrePermissionLevelSelect`|div，另有trigger button与四角色option refs；`value` /`defaultValue` 为现有 `PermissionLevel` 或null，独立使用须给 `viewportSize`。|
|`OrePermissionToggleRow`|div，`inputRef` 为真实checkbox；title /description与checked状态分开，`inputProps` 可提供原生属性和图标。|
|`OrePlayerCard`|真实button；玩家姓名、avatar /avatarSrc、subtitle、levelIcon和selected状态独立。|
|`OreSwitch`|真实checkbox；checked /defaultChecked、onCheckedChange、readOnly /disabled和host图标，支持独立复用。|

`selectedPlayerId` /`defaultSelectedPlayerId` 与 `value` /`defaultValue` 分别控制选中玩家和权限草稿。默认没有选中玩家；显式null /不存在ID显示 `emptyContent`。值复用 `PlayerPermissionsValue`，按玩家ID保存nullable角色和boolean记录，回调为复制快照及原有 `{playerId,reason,permissionId?,event}`。角色与权限位独立：换角色不生成预设，切权限不自动选Custom。宿主受控拒绝时保留已接受状态。

权限描述、条目顺序与可见玩家由宿主给出。未绑定的权限显示为不可编辑行，不据此认定服务端值是false；选项渲染也不会把缺少的key写入草稿。`errorContent` /`templateWarning` /`emptyContent` 是独立宿主内容，不能代替授权或错误服务。

`canEditPermissions`、readOnly /disabled控制可修改范围。Kick还要求 `canKickPlayer`、可见 /enabled标志及选中玩家不是 `isHosting`；`onKickRequest` 只发请求，**没有Ban操作**。返回也只是 `onBack`，不自动保存、移除管理员、启用作弊、确认或调用私有provider。Web的焦点、Escape、modal隔离 /恢复、键盘与合成IME保护已纳入有限客户端合同，不冒称真实OS IME或完整引擎输入管理器。

## 尺寸与响应式分支

`guiScale` 默认1，是宿主显式输入；局部单位为 `u = 5 × guiScale` CSS px，不修改document根rem。`viewportSize` 是源窗口宽高，独立于可选嵌入 `size`（默认等于viewport）。小嵌入区域裁切，不把窗口断点改为容器断点或自动缩小字体。`safeArea` 与 `extraBottomInset` 是显式宿主参数，不推断分屏、设备DPR或实际游戏设置。

窗口宽度按70u /128u区分narrow /tablet /desktop。角色widget只在desktop且自身可用宽达到四项×15u＝60u时显示segmented；`availableWidth` 可供独立零件明确该宽度，否则测量自身。desktop不足宽和非desktop两条路径**都使用同一modal族**，不是通用inline dropdown；实际source box-sizing /runtime主题覆盖与最终原生BCR尚未认证。

`scrollInputMode="mouse" | "touch"` 是宿主显式选择的呈现 /输入策略，不侦测或恢复引擎当前输入模式。鼠标滚动条、非鼠标overlay thumb、sidebar的floating分支与真实overflow视口分别处理；原生滚动条隐藏和辅助技术键盘支持属于Web适配，不据源声明推断所有平台已一致。

## 更强源链修正与运行时边界

根frame使用neutral50的黑色 .5 overlay叠加宿主场景，保留不透明子控件，不给整组件设置opacity .5。普通权限行与角色selector的Zf wrapper有顶部白 .1 /底部黑 .3 bevel，各厚 .2u，作为绝对覆盖层不占布局；源未传thin，不应改成base1 /minBorder宽度。示例背景色只是宿主场景输入，不是原生世界画面的复制。

角色modal的header为neutral `#48494a`，下方 `#313233` shadow条高 .2u并进入正常flow；外框和body为 `#1e1e1f`。菜单neutral60行普通填充 `#58585a`、hover `#48494a`、pressed `#313233`，dimmest边框 `#8c8d90`，还有BY独立 .2u底边。这个role没有selected /focused填充token：已选项只显示check，不强制pressed填充。旧selected `#313233`期望被更完整源链推翻，现普通selected应为 `#58585a`；这属于source oracle纠正，没有改采样坐标或放宽容差。

焦点框是白色 .2u inset，与accepted check和填充分开。compact默认不委托selected alias，可先focus Visitor而Operator仍checked；desktop-small显式委托selected alias。两分支初始焦点已按有限合同实现，不代表通用native focus memory已恢复。

早期原生普通页 /角色菜单的JPEG与退出清理记录保存在 `.cache/ore-permissions-native-02/`，未改变权限，世界已保存退出、游戏及CU已关闭；JPEG仅用于发现，不取色、不拟合比例、不作为无损RGBA期望。完整静态依据见 `.cache/ore-permissions-runtime-config-01/FACTS.json` 和 `.cache/ore-permissions-modal-source-04/REPORT.md`。实际guiScale由 `core.device.display` 及可能的local override提供，当前值未读到；保存的offset0和context默认值均不能证明运行时guiScale为5。当时没有无损整页RGBA；后续取得的原生纹理与仍未通过的Web整页比较见本文最新记录。

## 字体与资源由宿主提供

库不附带现代原版角色图、头像、Ten /Seven /Noto字体或HBUI bundle。`roleIcons`、`backIcon`、`dropdownIcons:{close,check,chevron}`、`toggleIcons:{on,off,thumb}` 接受宿主React节点；独立LevelSelect使用 `icons` /`dropdownIcons`，PlayerCard支持avatar /avatarSrc，Switch支持onIcon /offIcon /thumbIcon。未提供时不伪造原图。源码研究观察到的13个完整本机图像仅用于可选私有预览，不转存公开assets。

在**源码仓库**可从本人本机安装准备可选预览资源（这些脚本不包含在npm包）：

```powershell
python scripts/use-local-hbui-fonts.py "C:/XboxGames/Minecraft for Windows/Content"
python scripts/use-local-ore-permissions-assets.py "C:/XboxGames/Minecraft for Windows/Content"
python scripts/use-local-ore-permissions-assets.py "C:/XboxGames/Minecraft for Windows/Content" --check-only
```

字体写入ignored `.cache/local-fonts/hbui`，13张整图及provenance写入ignored `.cache/local-ore-permissions`。Vite私有bridge只供本地demo；npm用户需自行提供有权使用的资源 /`@font-face`。标题与正文分别使用 `--mc-ore-ten` /`--mc-ore-seven`，locale决定有限fallback顺序；字体存在、加载与实际字形选择是不同的验证，未提供原字体时不能声称正常fallback已匹配原生。

## 证据与验收状态

安装源的路由、默认Vanilla主题、控件 /scroll /资源依赖见 `.cache/player-permissions-hbui-study-01/`、`-02/` 与 `.cache/ore-permissions-source-03/`。私有bundle只作静态研究，不进入库或在库中执行。原窗口JPEG不是无损native UI target；后续真实PIX纹理提供了整页期望，Web仍无完整原生页面像素一致证书。

前一轮更强源修订的完整107项同批执行：**104通过、3个预期桌面触摸设备条件跳过、零失败**，零retry /flaky，957份输入pin无漂移。正式证据为 `.cache/ore-permissions-native-tests-01/FINAL.json`；新增19DOM×两项目＋4像素项与旧65项分别保留范围，未把早期通过重复累计。本轮盒模型修正后的新批次见本文最新记录。

新增overlay /bevel预定域230点中180点零差，包含两倍率fullframe overlay的50点；两个section底bevel合计50点最大通道差1，在原先≤1容差内，**不能称230点全零**。原Switch128点及segmented200点完整byte case复跑仍零差；纠正后的modal100点使用原坐标 /原容差，overlay25点最大差1、其余75点零差。header /shadow正常flow、DY父级预算、dimmest边框 /独立底边与两分支实际键盘白色inset focus也通过。均为有限源CSS合同，不是native整屏对比。

新包在React18.3.1与19.3.1实际安装后通过155组件＋6数据＋11函数（172值）的ESM、SSR、strict TypeScript、样式、资源和许可门禁，日志 `.cache/ore-permissions-native-root-01/package-01.log`。验证tar `.cache/ore-permissions-native-root-01/mcbeui-ore-native-verified.tgz` 的SHA为 `d9779fb0532a717a0b3280b4ed2ccf124576e598b10b3a4f3f75ce5783ef5f02`，最终文档包仍需另做同payload比较。

新公开预览完整9项通过，见 `.cache/ore-permissions-native-root-01/public-01/FINAL.json`：实际source alpha .5、header `#48494a`、checked Operator普通 `#58585a`及selected Custom hover绿色均验证；390窄屏边界、键盘 /受控交互与Ten标题13glyph /Seven正文5glyph真实字体检查通过。页面 /HTTP /请求及控制台错误0，测试浏览器关闭，用户4173保留；本轮9项不累计旧公开批次。实际字体的有限节点证据不证明全部文字或native栅格一致。

### 修订前历史

旧104 /103及其包 /公开预览、既有1b916f3交付身份均保留原文件，不转作新TSX /CSS资格。此前缺少role-specific selected token的完整继承分析，旧selected填充测试并不因此成为正确的原生期望。

此前155组件 /6数据 /11函数，共172值，已通过React18.3.1与19.3.1实际tar安装后的ESM、SSR、strict TypeScript、样式、资源与许可门禁。新5组件 /11类型、host图标与字体输入、refs和原有150组件检查均保留；此前phase03 CSS的已验证tar身份为 `eb940c8dc2414dae6d7c2ca16a5660bd316bc3b8ab45901708a3ce8bf0254e51`，记录见 `.cache/ore-permissions-root-01/package-02.log`。这不是文档定稿后重新打包的预告身份。

此前phase03完整104项在同一批次执行：**101通过、3个预期桌面触摸设备条件跳过、零失败**，零retry /flaky，948份输入pin无漂移。新批次包含新增palette回归及原有合同 /两项像素oracle完整复跑，见 `.cache/ore-permissions-tests-01/FINAL-02.json` 与 `phase04/run-04/`。

实际公开截图发现selected segmented按钮hover被generic hover选择器覆盖成灰色；phase03窄修CSS的selected /disabled /pressed优先级，TSX、fixture与旧两像素oracle不变。这是真实产品状态样式缺口，不是测试fixture失败。新增八状态×25点共200点源palette比较均差0 /最大通道差0，文字色也通过；原Switch八状态128点仍差0，原modal100点中overlay25点最大差1、其余75点差0均本批复跑。这些是有限取样合同，不是完整控件或原生页面零差。

修复前历史正式验证按project /file /case去重为103项：**100通过、3个真实设备条件跳过**，由run02其余101项（98通过 /3跳过）与run03同一个case在desktop /mobile两项完整复跑（2通过）组成，不能写成单批103全绿。覆盖新OreUI、原Classic和未改ScrollArea；新OreUI为37通过 /1跳过，Classic44通过 /1跳过、ScrollArea19通过 /1跳过。run02 /03各948份输入pin无变化，所有源、fixture、像素oracle与容差不变。原run01的96通过 /4失败 /3跳过、run02的99通过 /1失败 /3跳过均保留；修正只涉及测试宿主 /定位前提，最后case7显式给浏览器1440×1000宿主，避免1000高嵌入frame在393高visual viewport下目标点落到左栏。证据在 `.cache/ore-permissions-tests-01/run-01/`、`run-02/`、`run-03/`，没有重跑或重计其他101项。

上述旧103跨批资格、`package-01.log`验证tar `fa1aef590ef86473b1c79f67ce75db078b28dee06f07894a823bab69f34d6eb7` 与公开run02保留为修色前历史，不转作phase03新CSS的验收身份。

修复前公开构建run02完整9项通过，见 `.cache/ore-permissions-root-01/public-02/FINAL.json`。CDP实际确认标题13glyph使用自定义Minecraft Ten v2、正文5glyph使用Minecraft Seven v2；真实checkbox /受控拒绝、角色modal焦点恢复、动作标志与390窄屏无document横溢均通过。页面 /控制台 /HTTP /请求错误为0，测试浏览器关闭，用户4173预览保留。这是有限节点字体与公开Web合同，不认证所有中文fallback或完整字形栅格。

此前phase03公开构建run03完整9项通过，见 `.cache/ore-permissions-root-01/public-03/FINAL.json`。在原step7额外实际hover已接受Custom，断言背景为源primary绿色 `rgb(42,100,28)`，并保存正确绿色截图。Ten标题13glyph /Seven正文5glyph的实际自定义字体检查、其余交互 /窄屏 /错误门禁全部重跑通过；测试浏览器已关闭，4173用户预览保留。这与旧run02分开记录。

公开首轮4项后把dialog的scrollHeight242大于clientHeight240误判为滚动条，失败记录保留。布局probe确认48高header＋192高rows正合240；源透明padding伸入2px边框，dialog为overflow visible，真正滚动视口未溢出且原生chrome隐藏。复验改核边界包含关系、overflow与真实viewport，没有调整产品、像素期望或容差。现有Classic150 /167及Document146 /163阶段保持各自历史身份，不累加为本轮通过数。完整原生页面、运行时主题 /盒模型、实际引擎输入与后端服务仍未认证。
