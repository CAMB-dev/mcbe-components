# Classic PlayScreen：API与有限源范围

本轮新增12个公开组件，总入口为239组件／257运行时值。已完成下述有限Web验证；原生整页像素与当前游戏活动路由未认证。

展示入口为`#play-screen`；校准夹具为`demo/play-screen-fixture.html`。默认展示三页与两种原版popup，数据全部由本地宿主提供。页签27／9／4是独立字面计数，不从样本数组长度生成；没有原始截图时使用`thumbnail:null`，不画假世界截图或服务器logo。

## 来源与尺寸

固定官方`v1.26.60.5-full`、commit `15701fa9c13923f12662984c32c124327e40e3d3`。完整`play_screen.json`及13份直接依赖与固定ZIP逐字相等；源节点／参数、后续语义更正和材质身份见[play-screen-source.json](play-screen-source.json)与[play-screen-assets.json](play-screen-assets.json)。这些身份核对只证明来源，不能证明当前游戏仍选择Classic路由。

`viewportSize`是宿主明确提供的逻辑game像素，`scale`为显式整数显示倍率。默认desktop公式如下，不随窄浏览器偷偷改成Pocket：

| 部分 | 逻辑尺寸／位置 |
| --- | --- |
| 外层canvas | viewportSize的W×H |
| panel | 282×(H−50)，x=(W−282)/2，y=25 |
| navigation | 高30；tab内部为33%／33%／fill，close holder恒30×30 |
| body | 282×(H−76)，相对panel y=26，与导航重叠4 |
| content | 四边inset6，270×(H−88) |
| JoinCode内容 | 200×90，居中于显式canvas |
| HighPing内容 | 250×170，居中于显式canvas |

`exitButtonVisible`保留容易误读的原绑定：false时显示X按钮，true时隐藏；close holder仍占位。frame／body／content refs互相独立。统一样式为`mcbeui/styles.css`，字体可选`mcbeui/fonts.css`；单族样式入口以包实际exports为准。

## 12个公开部分

| 入口 | 必需及主要属性 | ref |
| --- | --- | --- |
| PlayScreen | viewportSize、scale、inputMode、navigation、worlds、friends、servers、exitButtonVisible；paneRefs、popups、inputHints、onExitRequest | HTMLDivElement，外层canvas |
| PlayScreenFrame | viewportSize、scale、navigation、exitButtonVisible；children／overlays、panelRef／contentRef、onCloseRequest、closeLabel／closeButtonProps | HTMLDivElement |
| PlayNavigationTabs | value、labels、counts、friends、scale；onValueChange、tabButtonProps／tabRefs、width、disabled | HTMLDivElement |
| PlayWorldsContent | size、scale、inputMode、provider、flags、labels；四个独立world collections、两个loading快照；storage／storageUsage、externalFamilies、onAction | HTMLDivElement |
| PlayFriendsContent | size、scale、inputMode、provider、flags、labels；friends／crossPlatformFriends／lan、loadingFriendsRealms、notificationCount；externalFamilies、onAction | HTMLDivElement |
| PlayWorldRow | item、collection、index、width、scale、labels；legacy两独立能力、editVisible／localWorldUpload、原生button props、onAction | HTMLDivElement |
| PlayNetworkWorldRow | item、collection、index、width、scale、crossPlatformEnabled；ignoreCrossplay、buttonProps、onAction | HTMLDivElement |
| PlayServersContent | size、scale、inputMode、label／featuredLabel／additionalLabel／addLabel、featured／additional、visibility、details、loadingLabel／frame；notices、sunsetting、onAction | HTMLDivElement |
| PlayServerRow | kind、item、width、scale、loadingLabel／frame；button／edit props和refs、onAction | HTMLDivElement |
| PlayServerDetails | size、scale、inputMode、label；featuredVisible／additionalVisible／addVisible、相应数据、loadingLabel／frame、onAction | HTMLDivElement |
| PlayJoinCodeDialog | open、labels、bindings.inputEnabled、value；onValueChange／onAction／onClose、input／join／close refs、readOnly／disabled | HTMLDivElement，factory owner |
| PlayHighPingDialog | open、labels、bindings.closeVisible；onAction／onClose、join／cancel／close refs、readOnly／disabled | HTMLDivElement，factory owner |

`PlayScreen`内部给三种Content传入同一270×(H−88)区域及scale／inputMode；其`worlds`／`friends`／`servers`属性省去这三项。单独使用Content时必须自行提供。具体类型均从`mcbeui`公开导出；private布局求值器、材质registry和source button／scroll／read-button helpers不另作公开组件。

## 宿主数据与操作

所有labels、provider能力、可见性与enabled输入均为显式快照。`PlayNavigationTabs.value`是worlds／friends／servers之一；三个counts为字面字符串。friends的bouncing／not-bouncing／invite／inbox标志独立；启用bouncing须提供已接受的两个offset，不用库内时钟猜游戏动画。

World与Network collections分别提供`items`及`rowCount`，后者控制源grid占位且不能小于实际记录数。`localWorldsVisible`等标题绑定不删除相应world grid；loading、空消息、权限消息、Realm提示与数据可并存。Legacy delete与migrate能力独立，不强制改成互斥枚举。

服务器行激活仅请求`server_navigation_toggle`，不会连接。宿主接受选择后可以更新item.selected及右侧details；featured／additional／add三个detail可见标志独立，不能从选中项或数组反推。连接必须来自详情自己的Join请求。动态截图、games／news、ping／玩家计数都是provider数据，库不ping服务器或伪造返回值。

`PlayActionDetail`包含target、真实control、延迟保留的event，以及可选collection／index／id／payload；操作是宿主意图，不执行世界启动、迁移、导入、登录、邀请、下载、付费或连接。受控修改通过保留原value拒绝；原生事件的否决、IME、过期owner、hidden／disabled与卸载的Web合同由实际浏览器检查验证，当前仍待Root最终结果。

可见但尚未实现的Realm卡片／trial／new-offer族要求`externalFamilies`提供匹配sourcePath、已解析height及真实宿主内容；缺少依赖会抛错，不用一段文本假装实现完整Realms服务或卡片。Play本文件factory仅有JoinCode与HighPing；其他认证／确认modal由宿主路由到其独立源族。

## 存储、滚动与字体的明确策略

- Worlds下部20%仅为Storage状态区，由legacyShareStorage或supportsMigration能力开启；所有旧世界行仍在主列表。两个raw clip ratio分别绑定重叠的green／blue层，不能自动相加、归一化或转成文件容量。`storageUsage.clipPolicy`明确选择Web可见比例或移除比例；native provider含义及分数裁切未认证。
- Mouse使用源9单位rail预留与自定义scrollbar，Touch使用独立profile；原生overflow承接滚轮／触控／选区，UA滚条隐藏。server-pane先保留源whole-width−1，再应用bar和内容inset；featured40pitch／38高按钮居中top1属于声明的`center-web`策略。
- 可见Read More／Less必须提供正有限`PlayServerTextSection.readButtonHeight`。示例12是Web预算，不是原生`100%c`高度。read按钮保留原underline／underline_focus、smooth0.8字体、8高label、[2,1]offset与alpha.6；Web字形宽度及intrinsic求值仍是边界。
- 字体由`--mc-font`、`--mc-font-size`或独立`--mc-play-font-size`选择；倍率以GUI2基准计算。可选本机字体不进入npm。API保留layout／font角色，不认证原生glyph metrics、bearing、AA、baseline或source float颜色的GPU结果。
- 原control／White零centre材质使用既有ClassicSkin的边界texel解释；不以采样颜色或重绘PNG替代。有限Web平面检查与原生parent-alpha是不同资格。

## 使用

```tsx
import {useState} from 'react';
import {PlayScreen} from 'mcbeui';
import type {PlayScreenProps, PlayTabId} from 'mcbeui';
import 'mcbeui/styles.css';
import 'mcbeui/fonts.css'; // 可选的开放fallback

type HostPanes = Pick<PlayScreenProps, 'worlds' | 'friends' | 'servers'>;
export function PlayExample({worlds, friends, servers}: HostPanes) {
  const [tab, setTab] = useState<PlayTabId>('worlds');
  return <PlayScreen viewportSize={[360, 300]} scale={2} inputMode="mouse"
    navigation={{value: tab, onValueChange: setTab,
      labels: {worlds: 'Worlds', friends: 'Friends', servers: 'Servers'},
      counts: {worlds: '27', friends: '9', servers: '4'},
      friends: {showBouncing: false, showNotBouncing: true,
        showInvites: false, inboxEnabled: false}}}
    worlds={worlds} friends={friends} servers={servers}
    exitButtonVisible={false} closeLabel="Close Play"
    onExitRequest={request => console.log(request.target)}/>;
}
```

三种pane需要完整typed快照，不是用children替代所有源状态。可参考仓库`demo/play-screen-data.ts`的完整本地构造器；它不是库导出，也不代表真实游戏或在线状态。

## 验证状态与未完成范围

| 层级 | 当前记录 |
| --- | --- |
| 固定source身份／有限参数 | 14份完整JSON与固定ZIP相等；保留原SPEC及Storage语义补充 |
| 最终source浏览器／状态 | browser02：60项Play、16项统一CSS入口检查通过；相关NPC／Jigsaw／Command／Furnace回归110项通过；Node78项通过 |
| 独立原图Web材质 | material03：21个完整材质区域、scale1/2/3、黑白底严格RGBA零差；包括Frame及共享零中心control、White和整数导航状态。另验证隐藏恢复与分数尺寸观察器更新 |
| 实际React18／19包 | package02全套实际React18.3.1／19.3.1通过；每个peer为37项Play SSR、20条负类型合同、71张原图／43份metadata／CSS闭包与license身份检查 |
| 默认安装组合 | installed04：实际18.3.1／19.3.1，默认Vite开发及生产四组合通过；12个组件ref、交互、输入、只读及完整卸载验证，无源码别名 |
| built／生产展示 | built01：用户4173实际构建页、桌面及移动端三页和代码弹窗通过；HTML与site/index.html逐字身份相同 |
| 当前native活动路由／整GUI像素 | 未认证 |

Pocket、education／editor／trial的完整路由、平台账户／Realms服务、默认tab／factory数据、focus controller／narration、safezone、engine cm／sm／fill／clip舍入、provider时钟、parent alpha和跨GPU最终Present均不由这一default Classic实现认证。用户要求的完整Bedrock GUI目标继续保留；组件数与原始素材身份不代表该目标已完成。

材质参考由两套独立CPU算法根据完整原PNG生成，未调用生产ClassicSkin。选中导航的透明原像素按已声明黑底合成后比较；不把透明PNG直接与不透明截图混比。零中心原图都是均匀色，能检出中心漏填，不能据此辨认原生边界texel选择。分数导航、全部hover/pressed材质、原生字体与整页仍不在这21个区域的像素证明内。共享背景需要现代ResizeObserver才能在保留隐藏节点后可靠重新测量；无观察器环境仅有初次测量。

原失败记录保留：browser01示例漏传readButtonHeight；package01的picker/loading条件及r02的已内联dataURI读取方式；material01读取参考字段错误、material02透明/不透明比较不匹配；installed01/02的错误目标／未等延迟请求、installed03的错误初始焦点预期。修正的是测试设置／数据，未放宽像素阈值或改动原材质。最终实际回执位于`.cache/play-qa-01`与`.cache/play-installed-04`；它们是本机验收记录，不作为npm素材发布。

功能浏览器受检tarball SHA256：`2cd4dd3138a26569f1c35703f1eaa559dd46cf50cc107150017645a27f092395`。最终包比较859个dist／manifest／license成员：858个逐字相同；index.js.map仅两份sourcesContent的行尾空白变化，其他字段及实际JS／声明／样式／素材均相同。清理前后esbuild代码相同，最终严格source／demo构建通过。不能把功能包SHA当成最终包SHA。
