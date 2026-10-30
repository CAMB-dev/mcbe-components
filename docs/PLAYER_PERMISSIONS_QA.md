# 玩家权限：Classic源组合

`PlayerPermissions` 组合玩家列表、角色选择与动态权限行；`PermissionLevelSelect`、`PermissionToggleRow` 和 `PermissionPlayerRow` 可独立复用。实现对应固定官方 `v1.26.60.5-full` 的 **Classic JSON** `permissions_screen.json`，不等于当前安装版的 OreUI /HBUI 页面。所有真实授权、权限预设、启用作弊、踢出和封禁都由宿主负责。

## 使用

```tsx
import { PlayerPermissions } from 'mcbeui';
import 'mcbeui/styles.css';

<PlayerPermissions
  label="玩家权限（Classic）"
  players={[{ id: 'alex', name: 'Alex' }]}
  permissionOptions={[
    { id: 'build', label: '建造' },
    { id: 'mine', label: '挖掘' },
  ]}
  defaultValue={{ alex: {
    level: 'member', permissions: { build: true, mine: false },
  } }}
  onValueChange={(next, detail) => reviewPermissionDraft(next, detail)}
/>
```

`reviewPermissionDraft` 是应用提供的处理函数。独立样式入口为 `mcbeui/player-permissions.css`；`styles.css` 已包含它。默认 `size={[400,300]}` 是宿主逻辑区域，`scale={2}` 为正安全整数。`#player-permissions` 示例使用明确的 Classic profile，不展示为当前原生页面已完成。

## 状态与四个组件

|组件|主要输入与真实ref|合同|
|---|---|---|
|`PlayerPermissions`|`players`、`permissionOptions`、`label`；ref为section，两个viewport refs、按ID的player /permission refs、levelRef|选中玩家与权限值分别受控；两侧是真实独立滚动视口。|
|`PermissionLevelSelect`|`value` /`defaultValue`、`onValueChange`、`labels`、`selectedLabel` /`selectedIcon`；ref为真实button|四角色分支为 `visitor` /`member` /`operator` /`custom`，允许 `null`；改变角色不生成权限位。|
|`PermissionToggleRow`|`label`、`checked` /`defaultChecked`、`onCheckedChange`、`stateLabel` /`onLabel` /`offLabel`；ref为真实checkbox|可见状态文字与boolean独立，默认文字ON /OFF。readOnly保留焦点并阻止修改，disabled用原生禁用。|
|`PermissionPlayerRow`|`player`、`selected`、`inactive`；ref为真实button|姓名、头像URL /可见性、本地图标与角色图标分别由宿主提供；不生成头像，也不自行选择其他玩家。|

`PlayerPermissionsValue` 按玩家ID保存 `{level, permissions: Record<string,boolean>}`。玩家与权限选项ID要求非空且各自唯一；值只接受角色或null和真实boolean。缺少玩家值显示 `emptyContent`；缺少某个权限key时不渲染该行，**不会补成false**。未知玩家的值记录保留在后续快照中，更新schema不会自动发出值请求。

`selectedPlayerId` /`defaultSelectedPlayerId` 独立管理当前玩家；默认未指定时选第一个可用玩家，显式null或孤立ID保持空态。`value` /`defaultValue` 管理权限草稿。`onValueChange(next,{playerId,reason,permissionId?,event})` 的reason为 `level` 或 `permission`，回调得到独立复制的快照。受控宿主拒绝请求时，仍显示已接受状态；切换角色不重写boolean，改变某项权限也不自动改成Custom。

`worldSettings` 使用角色标题 /说明的丰富分支；`worldSettings` 或 `inRealm` 会从可选菜单中省略Custom，但既有已接受Custom仍可显示，不自动清除或回调。`selectedLabel` /`selectedIcon`（组合页为 `levelLabel` /`levelIcon`）仅覆盖闭合菜单的展示。角色名称不是引擎数值枚举，也不是预设位掩码。

## 独立标志、动作与输入

`canEditPermissions` 只控制角色与权限字段；`templateLocked` 仅显示warning，二者不互相推导。`optionsVisible` 仅控制权限grid。Kick与Ban各有独立的visible /enabled标志；已知选中玩家即能成为请求对象，不因其权限状态未知而自动隐藏全局说明或动作。`readOnly` 阻止编辑与Kick /Ban，仍可选玩家和返回；全局 `disabled` 阻止组件拥有的全部请求。

`onSelectedPlayerIdChange`、`onBack`、`onKickRequest`、`onBanRequest` 仅发宿主请求，不确认权限、不访问剪贴板或网络，不执行任何服务端操作。Education IP文字、世界文字、gamepad返回图形与说明由宿主提供；不读取实际控制器。

玩家列表Up /Down /Home /End移动焦点并仅在本地视口显露目标，不提交选中；点击或原生Enter /Space才激活。角色菜单采用明确的Web键盘 /portal /外点关闭 /空间不足上翻策略。Escape先关闭菜单；右侧Escape返回玩家焦点，再从左侧Escape请求Back；可编辑子控件保留自己的Escape。调用方可preventDefault，IME /229及组合键有保护。这些不是引擎导航或确认流程已恢复的证明。

`selectorFocused` /`contentFocused` 可独立覆盖pane fade，省略时采用DOM焦点。选中状态与非活动pane fade分别处理，不把整个已选中玩家行自动变暗。`onScrollPositionChange(pane,position)` 区分 `players` 与 `permissions`，ref可供宿主恢复位置。

## 几何、素材与未知项

源header高23，body为88%并在其下居中；玩家区域宽154、高95%，玩家pitch27 /按钮高28。权限行高24，真实开关控制区域30×24，继承图片为28×22。两侧复用普通ScrollArea的8单位预留，不是DocumentViewer的5单位样式。触控 /控制器滚动条淡出仍未认证。

背景为原 `screen_background`、source alpha .75；非活动pane使用原完整白材料乘RGB .5、alpha .5；Banners与template warning、角色 /暗色状态 /开关 /dropdown使用各自完整原图。原始角色popup百分比高度、实际字体栅格与引擎绑定不由CSS声明认证。

[player-permissions-assets.json](player-permissions-assets.json) 记录87份完整公开原件：57PNG、22原metadata、7源UI文件和1原许可，共539,396字节。完整原文件与固定官方ZIP已做CPU身份校验；不包含Invite-only资产或真实玩家头像。Mojang原素材保留原权属 /EULA通知，不由库代码MIT许可重新授权。

当前安装版研究 `.cache/player-permissions-hbui-study-01/` 找到真实 `/player-permissions/:playerId` HBUI路由：不同的卡片 /说明、响应式布局、Ten /Seven字体与确认服务。原生窗口JPEG仅作发现记录，不是无损UI target，也不是Classic或OreUI像素证书。现代图标 /字体、实际rem单位、权限业务服务与完整原生页面仍未完成，不能把Classic四组件通过等同OreUI完成。

## 本阶段验证

源码实现与固定源CPU /素材审计已存在，记录在 `.cache/player-permissions-implementation-01/` 与 `.cache/player-permissions-source-01/`。独立浏览器合同、实际React18 /19包消费与公开预览已按下文范围执行，原生整页像素仍待验收。历史DocumentViewer的146组件 /163值与58通过 /1设备条件跳过保留原身份，不计为权限四组件验证。


## 2026-10-31实际验证

正式配置实际收集65项，第二批63通过、2项桌面真实触摸能力条件跳过，零失败、零retry、零flaky；两个Chromium移动项目的原生视口触摸事件用例通过。新42次DOM/SSR合同中41通过 /1桌面条件跳过，3项素材像素检查通过，未修改的ScrollArea20次回归为19通过 /1桌面跳过。批次内121份输入pin无变化，四组件源码保持暂停快照d0dcfc9b… /ad97a6b7…原身份。

首批62通过 /1失败 /2跳过原证据保留。失败是独立零件fixture没有间距：紧接玩家行的Permission Level文字ink落入其截图底边，五状态各在1×出现同一31点、2×出现同一71点。唯一修正是fixture独立控件宿主增加12逻辑单位grid间距；完整GUI的27行pitch /28按钮、所有测试mask、像素公式和容差均未更改。首败、trace、逐点差异及单行diff保存在 `.cache/player-permissions-tests-01/`。

玩家五状态×两倍率合计10份原图标准nine-slice /disabled stretch参照，比较声明的边角及未被文字覆盖区域40,300像素，差异0、最大通道差0。17份PNG与4份dark metadata完整字节身份通过；角色Member的accepted /unaccepted在同hover状态截图相同，四份hover角色PNG实际请求字节匹配，未虚构全角色像素总数。

开关仅比较事先声明的原3×3均匀texel邻域，4份组合共892像素。checked＋disabled一项有88 /240像素各RGB通道差1，共264个RGB字节，alpha差0；其他三项无差。最大1仍在首跑前约定的≤1容差内，不能写成开关像素零差；非整数缩放边缘与hover完整采样仍未认证。

`npm run verify:package` 实际构建、打包并安装，在React18.3.1与19.3.1分别通过150组件＋6数据＋11函数（167值）的ESM、SSR、原有全部门禁、严格NodeNext TSX /readonly值 /refs消费、CSS子路径、87原件 /许可与私有字体排除检查。组件不会因SSR发出权限、选择、返回或moderation请求。

实际4173构建预览完整12项通过，页面 /控制台 /HTTP /请求错误均0，源与构建文件pin无漂移。覆盖四个独立组件、23 /88% /154 /27 /28 /24源几何、双视口、受控拒绝、角色不改bit、Realm隐藏Custom仍保accepted、unknown不补false、独立warning /edit /Kick /Ban、真实原图、1× /2× /3×、返回和390窄屏。公开首跑11项通过后发现展示grid被440px独立零件的min-content撑宽，已仅在demo增加 `minmax(0,1fr)` 轨道并完成重新构建 /12项复验；权限组件未改。源码正式批后仅demo这项布局与catalog验证标签更新，新的构建类型检查和公开pin单独绑定它们，不替代原正式批次身份。证据：`.cache/player-permissions-root-02/public-01/` /`public-02/`；已关闭测试浏览器及自有5173，用户4173保留。

新版OreUI另有静态第二轮证据 `.cache/player-permissions-hbui-study-02/`：默认Vanilla主题、响应式gutter、safe-area公式与字体family优先级已定位。完整固定ZIP检查了5,126个PNG后缀条目（5,125真PNG＋1JPEG），42张12²原图与四张现代权限图均无精确RGBA别名；未把私有图标或字体发布。运行时缩放、主题覆盖、实际glyph选择与原生整页目标仍未证实，后续应基于此单独实现 /验收现代profile。
