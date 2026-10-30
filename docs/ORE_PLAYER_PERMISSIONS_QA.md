# 玩家权限：OreUI源组合

`OrePlayerPermissions`、`OrePermissionLevelSelect`、`OrePermissionToggleRow`、`OrePlayerCard` 和 `OreSwitch` 是独立的现代权限组件。它们依据本机安装版HBUI /OreUI源研究实现，保留原来的Classic四组件；源码可用不等于原生整页像素、所有运行时主题或权限服务已恢复。

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

安装源的路由、默认Vanilla主题、控件 /scroll /资源依赖见 `.cache/player-permissions-hbui-study-01/`、`-02/` 与 `.cache/ore-permissions-source-03/`。私有bundle只作静态研究，不进入库或在库中执行。原窗口JPEG不是无损native UI target；目前没有本阶段完整原生页面像素证书。

当前155组件 /6数据 /11函数，共172值，已通过React18.3.1与19.3.1实际tar安装后的ESM、SSR、strict TypeScript、样式、资源与许可门禁。新5组件 /11类型、host图标与字体输入、refs和原有150组件检查均保留；当前phase03 CSS的已验证tar身份为 `eb940c8dc2414dae6d7c2ca16a5660bd316bc3b8ab45901708a3ce8bf0254e51`，记录见 `.cache/ore-permissions-root-01/package-02.log`。这不是文档定稿后重新打包的预告身份。

当前phase03完整104项在同一批次执行：**101通过、3个预期桌面触摸设备条件跳过、零失败**，零retry /flaky，948份输入pin无漂移。新批次包含新增palette回归及原有合同 /两项像素oracle完整复跑，见 `.cache/ore-permissions-tests-01/FINAL-02.json` 与 `phase04/run-04/`。

实际公开截图发现selected segmented按钮hover被generic hover选择器覆盖成灰色；phase03窄修CSS的selected /disabled /pressed优先级，TSX、fixture与旧两像素oracle不变。这是真实产品状态样式缺口，不是测试fixture失败。新增八状态×25点共200点源palette比较均差0 /最大通道差0，文字色也通过；原Switch八状态128点仍差0，原modal100点中overlay25点最大差1、其余75点差0均本批复跑。这些是有限取样合同，不是完整控件或原生页面零差。

修复前历史正式验证按project /file /case去重为103项：**100通过、3个真实设备条件跳过**，由run02其余101项（98通过 /3跳过）与run03同一个case在desktop /mobile两项完整复跑（2通过）组成，不能写成单批103全绿。覆盖新OreUI、原Classic和未改ScrollArea；新OreUI为37通过 /1跳过，Classic44通过 /1跳过、ScrollArea19通过 /1跳过。run02 /03各948份输入pin无变化，所有源、fixture、像素oracle与容差不变。原run01的96通过 /4失败 /3跳过、run02的99通过 /1失败 /3跳过均保留；修正只涉及测试宿主 /定位前提，最后case7显式给浏览器1440×1000宿主，避免1000高嵌入frame在393高visual viewport下目标点落到左栏。证据在 `.cache/ore-permissions-tests-01/run-01/`、`run-02/`、`run-03/`，没有重跑或重计其他101项。

上述旧103跨批资格、`package-01.log`验证tar `fa1aef590ef86473b1c79f67ce75db078b28dee06f07894a823bab69f34d6eb7` 与公开run02保留为修色前历史，不转作phase03新CSS的验收身份。

修复前公开构建run02完整9项通过，见 `.cache/ore-permissions-root-01/public-02/FINAL.json`。CDP实际确认标题13glyph使用自定义Minecraft Ten v2、正文5glyph使用Minecraft Seven v2；真实checkbox /受控拒绝、角色modal焦点恢复、动作标志与390窄屏无document横溢均通过。页面 /控制台 /HTTP /请求错误为0，测试浏览器关闭，用户4173预览保留。这是有限节点字体与公开Web合同，不认证所有中文fallback或完整字形栅格。

当前phase03公开构建run03完整9项通过，见 `.cache/ore-permissions-root-01/public-03/FINAL.json`。在原step7额外实际hover已接受Custom，断言背景为源primary绿色 `rgb(42,100,28)`，并保存正确绿色截图。Ten标题13glyph /Seven正文5glyph的实际自定义字体检查、其余交互 /窄屏 /错误门禁全部重跑通过；测试浏览器已关闭，4173用户预览保留。这与旧run02分开记录。

公开首轮4项后把dialog的scrollHeight242大于clientHeight240误判为滚动条，失败记录保留。布局probe确认48高header＋192高rows正合240；源透明padding伸入2px边框，dialog为overflow visible，真正滚动视口未溢出且原生chrome隐藏。复验改核边界包含关系、overflow与真实viewport，没有调整产品、像素期望或容差。现有Classic150 /167及Document146 /163阶段保持各自历史身份，不累加为本轮通过数。完整原生页面、运行时主题 /盒模型、实际引擎输入与后端服务仍未认证。
