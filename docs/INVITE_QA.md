# Invite：六组好友、独立选择与宿主请求

本族提供五个公开入口；当前有限Web正式验证与实际包结果已记录，实际React18／19开发和生产四组合均通过，公开页17项通过。原版对照及原生整页仍未资格确认，不表示所有Minecraft GUI已完成。`InviteScreen`、`InvitePersonRow`、`InviteCategory`、`InvitePagination`、`InviteFooter`；party／头像／状态／checkbox／标题／loading／frame保留为组合中的私有源零件。

## 固定来源和完整清单

官方`v1.26.60.5-full` ZIP为169,569,258字节，SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。原始`resource_pack/ui/invite_screen.json`为60,750字节，SHA256 `2c7d0ef61efd0f69d8966dc1f5f10b52e0ac8ff740aaa23f4b13fac6cd33e2d0`。独立清单记录92个自有定义、160次嵌套control出现、41个直接binding站点、5个直接button_mappings站点；变量数组内的具体映射另计，不能遗漏。196个变量站点、17个条件／状态站点与129个直接$／# token保留原用处，不能读作129个公共props。

218节点共享保守闭包和207个root可达名称只是静态引用图，不是运行时展开或挂载实例。全部92定义及十个未被该root图到达的helper仍留在来源JSON；不默认挂载helper来扩大视觉范围。`invite.label`缺少顶层父定义、`friend_button_layout`为嵌套alias候选，title／OnlineFriends等是本地化候选；不擅自改成common.label，也不据此断言游戏损坏。

## 五个入口如何复用

|入口|责任|宿主负责|
|---|---|---|
|InviteScreen|两种主框、标题／close、party、loading、六组、footer的组合|有限可用尺寸、profile、全部独立flags、局部化文字、开关提交|
|InvitePersonRow|platform／linked-account／xbox-live三类身份、checkbox、头像／链接／状态；Xbox One资料按钮独立|图片或非交互renderer、opaque provider options、每组身份和选择状态|
|InviteCategory|带collection作用域的grid与分页组合|明确columns／rows、条目、可见性和页快照|
|InvitePagination|有区别的previous light_glyph与next light_content按钮、计数标签|inclusion、visible、两enabled、counterLabel；请求不自动翻页|
|InviteFooter|横／纵Add friend／Add member／Send与helper内容|capabilities、动态Send文字、enabled、A／X／Y原图renderer|

可以复用Image、ScrollArea和已验证的classic生命周期机制；现有20px Checkbox、60×32 Switch、普通Button／Dialog与PlayerList不能原样替换Invite的源布局。以下示例使用公共入口；严格源码别名类型检查与实际安装包类型检查分开记录，前者不能冒称安装消费：

```tsx
import { useState } from 'react';
import { InvitePersonRow } from 'mcbeui';
import 'mcbeui/styles.css';

export function InviteRowExample({ avatarSrc, avatarSourceSize }: {
  avatarSrc: string;
  avatarSourceSize: readonly [number, number];
}) {
  const [selected, setSelected] = useState(false);
  return <InvitePersonRow
    width={280}
    scale={1}
    scope={{ collection: 'online_xbox_live_friends', itemId: 'host-person-1', collectionIndex: 0 }}
    person={{ identity: 'xbox-live', id: 'host-person-1', gamertag: 'Host player',
      currentGameLabel: 'Host game label', onlineVisible: true,
      gamerpic: { kind: 'image', src: avatarSrc, sourceSize: avatarSourceSize } }}
    capabilities={{ isInvitingToRealm: false, isPs4: false, xboxOne: false,
      platformIcons: { visible: false } }}
    crossPlatformEnabled={true}
    selected={selected}
    onSelectedChange={detail => setSelected(detail.selected)}
    labels={{ profile: '查看资料', friendSelection: () => '邀请Host player' }}
    onAction={detail => console.log(detail.target)}
  />;
}
```

头像是调用方提供的图像，本库不查询账号、不生成玩家头像；示例显示选择请求被宿主接受，不会向游戏发送邀请。选择键必须是collection＋itemId，不能跨六组去重；翻页不丢弃其他页的选择。

## 必须保留的源标志和布局

横框为默认；纵框条件是`useVerticalButtonStackPanel && (!isInvitingToRealm || canManageMembers)`，不是浏览器断点。Desktop源frame宽317、高availableH−10；Pocket宽availableW的70.3215%、高availableH−4。百分比、%c、own-Y、stack与offset须在显式有限Web profile中解析，不宣称恢复native坐标。

横body为W−16／H−65，纵body为W−16／H−99，均top-middle offset0,23；横footer一层30px，纵两层30px。两父框都实例化common.common_panel，动态hollow1／2保持common词法上下文，不能替换同名common_dialogs的不同填充实现。标题shadow=false；close绑定独立。

六组顺序为online platform、online linked、online Xbox、offline platform、offline linked、offline Xbox；原始collection／toggle／grid binding见来源JSON。仅linked／Xbox包装层受crossPlatformEnabled控制；platform不跟随。跨平台header仅由Xbox对应visible驱动，不OR入linked。两条no-friends通知、Xbox空文案、loading、party、close、Add enabled、Send文字均为独立输入；不能由数组空、selected数量或realm捷径推导。platformInvitesVisible只控制源padding，不能偷换为全部platform组隐藏。

MSA／platform行高30，linked行高56，宽为容器W−7；checkbox原图10×10；头像框20／内图18，platform框15／内图13。online图实际7×7、源绘制框8×8，两事实都保留。八个check／hover／locked状态使用专门locked art；hover仍用普通mainbanners背景，不能套未挂载的MainBannersHover helper。Xbox One资料按钮不嵌在checkbox可点击区域内。

Add friend仅在!realm且supportsAddFriend时包含；Add member仅取canManageMembers，没有额外realm条件，因此两者可同时存在。Send不能由selected.length判定enabled。横Add默认50%−1宽，realm且!canManage时100%且隐藏2px spacer；纵Send单独满宽。分页included、visible、previousEnabled、nextEnabled、counter独立；源100%y方形在明确Web profile下解析为30×30，箭头原图7×9，不能把previous实现成翻转后的next。

party是否可见由isPartySystemAvailable决定，外框96%×40；toggle外控件64×32，在right-middle offset15,7，内部继承图像为top-left的30×16，不能拉伸整张到64×32。invite_to_party的toggle名、#invite_to_party状态和#invite_to_party_binding选项身份保持区分，canInviteToParty另控enabled。

源内滚动区是显式组件：pane为W−2×H、offset1,0，bar为5×(H−4)、右pad1／左0。保留源内容滚动，浏览器默认scrollbar隐藏；不让主框因内容自动变高。loading为原始640×8 strip的64×8 viewport、10帧／step64／fps10／reversible，浏览器计时和reduced-motion须另声明，未证明native时钟同步。

## 请求、资源与未恢复部分

精确请求目标为button.add_friend／add_member／send_invites／view_profile／previous_friends_page／next_friends_page／menu_exit。行选择保留toggle名、#toggle_invite_state及作者menu_friend_select出处；静态common.toggle映射未证明会消费该pressed变量。控制器handle只接受宿主明确的原始fromButtonId＋destination／scope，不轮询硬件、不猜焦点或隐式选择两颗Add。控制器兼容映射及当前归属按有限Web合同验证，不认证真实硬件焦点provider。

使用共享owner-window请求task，native handlers先同步执行，完整传播后再检查否决、当前归属与状态。延迟语义回调不保证服务SDK需要的瞬时用户激活；需手势的宿主API应在同步native onClick处理。readOnly checkbox须靠guard与受控状态维护，不声称HTML readOnly阻止原生checkbox切换。任意直接DOM／原生属性修改不是保证取消请求的合同；该有限Web合同保留原生默认行为的具体取消限制，不承诺任意DOM／原生属性改写都能取消待递送请求。modal为Web opt-in，不代表源flags；无源依据的backdrop关闭不自动添加。

59个literal material key包含保守共享默认helper，58个可用PNG身份不等于最小Invite资产数。直接11个key中的platform_icon在固定ZIP所有被审计图像扩展中均缺失；显示它时需要明确标注来源的宿主renderer，不绘制替身。profile_image_renderer、动态texture／filesystem、controller face-icon绑定与第三方账号／好友／分页／realm／party／资料服务由宿主提供。能复用的whole原图保持字节；新增原图也不裁剪、重绘或重新压缩。

有限源实现包括十个不默认挂root的私有helper；未知invite.label保持来源标记，root只按已知自有label属性使用明确Web策略，不补造父模板。hover helper的未知friend_button_layout／hover_text_renderer及诊断MSA布局需要带来源标记的宿主内容。已测试的格子解析要求显式非负整数columns／rows，容量足够且cellWidth>7；不修正为负或零行宽的布局。两颗Add同时存在的横footer可产生零宽Send填充，保留source-two-adds-zero-fill策略，不伪造可见宽度或仍可点击的发送区域。

正文、标题与明确shadow=false角色保留；源A-helper说明明确shadow=true，使用标注为Web策略的一逻辑像素阴影。原图glyph-only比较只验图像层，不认证文字字形、native AA或文本渲染。分数linked profile的自然栅格四项仍是UNQUALIFIED测量；受检整数材质通过不能推广到分数覆盖。字体、混合语言路由、glyph advance、默认锚点、provider、controller、原生布局／GUI scale及整GUI像素仍未知。


## 实际验证范围

Invite106个不同合同来自02批105通过／1失败及06批对该剩余合同1通过，不能写单轮106全绿。旧Portfolio材质10项与导航6项来自01批且按原身份保留；合计122个不同合同，不称单轮122全绿。01批105通过／12失败、02批105／1、05批0／1，以及03／04仅收集阶段失败均保留；03／04未启动浏览器。02至06产品未改变，最终分页方法修正只改受检分页test body。

200个完整原图／Web平面总11,473,278像素RGBA零差；6个合成CSS参考探针共1,536像素另计，不冒充Minecraft原材质。4个分数linked自然栅格测量未资格确认。新18ff7911包／ec82a8索引实际消费188组件＋6数据＋11函数＝205运行时值，React18.3.1／19.3.1各执行25个Invite SSR场景、类型及6个负例；58个whole原图、31份raw metadata和522个inline载荷（477PNG／39TGA／6JSON）各按原范围保留。

安装首阶段四FAIL因aria-disabled只读按钮的普通Playwright click未发出输入，是观察方法失败；零页面错误／源码漂移不等于产品通过。后续仅修正为强制可信原生点击，在同一包上重验四组合。实际React18／19开发和生产四组合均通过；公开页17项通过。

正式汇总：`.cache/invite-qualification-01/SUMMARY.json`（SHA256 `e003736d2cfe47de60e555a4f434af4e23c5e2acabe9918e78473508ca0c6db1`）；实际包：`.cache/invite-package-01/RESULT.json`（SHA256 `a1e90a08e2d790732b953f02b0d7de3661f5b0e21b595abdc20d717d077fa73f`）。安装／公开最终证据：`.cache/invite-installed-02/FINAL.json`；`.cache/invite-public-01/FINAL.json`。覆盖表仅将invite_screen.json从E更新为有限A，其他205行逐字保留；A38／E1表示范围状态，剩余命名族Credits，不是目标全部完成。最终文档应用后须将doc-only包所有产品字节与已测18ff7911包比较一致。

本页示例的公共源码别名严格类型检查已通过，记录于`.cache/invite-docs-final-prep-01/EXAMPLE-TC.json`；这项源码检查不冒称实际安装包消费，后者由上述实际包与四安装组合证据分别确认。

提交前清理了三个源码文件的尾部空白并重新通过类型检查与构建。与实际受检包逐文件比较，695份dist文件字节不变；唯一变化为index.js.map中的两段sourcesContent，映射及其余字段不变。可执行代码、类型声明、样式和资源均逐字节一致。该格式整理不补造新的行为或原生验证，独立记录于`.cache/invite-format-01/FINAL.json`。
