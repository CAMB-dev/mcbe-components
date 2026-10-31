# Classic StartMenu：六个可复用部分

`StartMenu` 组合 `StartMenuTitle`、`StartMenuActionStack`、`StartMenuAuxiliaryActions`、`StartMenuProfile` 和 `StartMenuFooter`。各部分也可独立渲染。实现针对固定官方 `v1.26.60.5-full` Classic源；source02的客户端合同、素材平面、实际已安装React18 /19消费者和公开预览已在下述范围通过，不等于原生整页像素完成。

## 最小宿主组合

```tsx
import { StartMenu } from 'mcbeui';
import type { StartMenuButton, StartMenuProps } from 'mcbeui';
import 'mcbeui/styles.css';
import 'mcbeui/fonts.css'; // 可选：显式加载库提供的字体

const shown = { included: true, visible: true, enabled: true };
const omitted = { included: false, visible: false, enabled: false };
const button = (
  action: StartMenuButton['action'], label: string,
  state = shown,
): StartMenuButton => ({ state, action, label, target: `application.${action}` });

const menu: StartMenuProps = {
  label: '开始菜单', size: [512, 288], scale: 2,
  visible: true, canQuit: false,
  title: { profile: 'win10', splashVisible: false },
  actions: {
    normal: { state: shown, rows: {
      play: { state: shown, button: button('play', '开始') },
      settings: { state: shown, button: button('settings', '设置') },
    } },
    newPlayer: { state: omitted, rows: {
      trialSpacerIncluded: false,
      getStarted: { state: omitted, button: button('get-started', '开始体验', omitted) },
      mainMenu: { state: omitted, button: button('main-menu', '主菜单', omitted) },
    } },
  },
  auxiliary: {
    state: omitted,
    upper: {
      state: omitted, signInProfile: 'standard',
      signIn: button('sign-in', '登录', omitted),
      gamertag: { state: omitted, text: '' },
    },
    lower: { state: omitted },
  },
  profile: {
    viewer: { state: omitted, portrait: { state: omitted, content: null } },
    controls: {
      state: omitted,
      dressingRoom: { profile: 'text', button: button('dressing-room', '更衣室', omitted) },
    },
  },
  footer: {
    copyright: '应用提供的版权文字', version: '应用版本',
    development: { state: omitted, text: '' },
  },
  onAction: ({ action, target }) => console.log(action, target),
};

<StartMenu {...menu} />;
```

示例的 `application.*` 是应用路由数据，不是原版引擎命令。Play的源target本身依赖动态绑定，必须显式提供；库不猜测账号、平台或世界状态。公共barrel已接入六个部分。`styles.css`不隐式加载字体；使用库提供的可选字体需额外导入 `fonts.css`，也可由应用提供字体。

## 状态、动作与渲染所有权

每个 `StartMenuControlState` 都要求 `included`、`visible`、`enabled`：included=false对应源ignored，不构造节点 /ref /占位；visible=false保留已构造节点及ref，但Web以display:none移出绘制、交互和流；enabled=false保持几何并禁用动作。normal /newPlayer、legacy split /single、viewer /portrait及profile A /B等状态分别由宿主解析，不从signed-in或其他单一字段推导。

这一区分保留源构造与可见两个阶段，display:none是本Start族的有限观察支持映射，不是所有JSON-UI invisible控件都不占位的通则。根visible=false也隐藏整个frame；disabled阻止组件拥有的action /turn /exit请求，不改宿主快照。只有prop变化不发动作请求。

`onAction` 接收 `{action,target,event,button}`。叶button的 `nativeProps.onClick`、公开part的 `onClick` 及组合root的 `onClick` 都能先preventDefault；集成后由root最终派发一次，不在叶和root重复发请求。event为最终接收事件，button保留真实语义按钮身份。action与target是typed host路由数据，不执行字符串，也不认证它就是实际引擎binding。各part ref为真实div，root ref为section；按钮ref直接指向button。

`canQuit` 控制清洁Escape的退出请求，popup激活时优先请求其关闭；修饰键 /IME保护属于Web合同。`offlineHint` 仅显示，不凭键盘猜测controller_select。登录、商店、Realms、反馈、成就、邀请、账号切换、外部浏览器与世界服务均由宿主执行。

## 固定几何与标题profile

`size=[W,H]` 是宿主已解析的逻辑safe-content frame，scale默认2；不读取真实游戏provider，不自动fit小窗口。独立Auxiliary /Profile /Title需传同一全frame，Footer传宽度。主垂直流依次为12%H上留白、标题、fill1、实际action groups、容纳控制器提示的fill2、底部10单位；两个fill平分剩余空间。普通组和new-player组独立；同时visible时都参与流，宿主选择正确组合。

|部分|逻辑源几何|
|---|---|
|ActionStack|宽150；每行32，主button148×30，内部普通skin再缩为146×28；trial Settings /Store两列各75，按钮73×30。|
|New-player|trial说明行32，独立20×20 spacer，Get Started /Main Menu各32；不自动替换normal rows。|
|Auxiliary|左下W/2−75，Y偏移−10%H；standard登录94×25、95%cap，NX /PS登录90%−6×32；lower行32、普通图标按钮24²。|
|Profile|右下W/2−75×124，Y偏移−10%H−4；viewer独立，controls居中行24 /内容高25；更衣室文本宽按内容＋2，Education glyph25²。|
|Profile A /B|两个独立入口；内容高24，gamerpic frame18²、Alex fallback16²及label分别布局，不由portrait readiness派生。|
|Footer /Friends|footer W−2×10，底中偏移Y−1；版权左、版本在右侧50%区、development居中；Friends右上偏移[−5,5]。|

五种title profile明确传入：`win10`、`osx`、`education-desktop`、`education-mobile`、`pocket-console`。普通title panel宽L=.55W，高T=.1885L（OSX为.1937L）；Web将Y offset解析为自身高度的.10T，pocket-console为.05T，父级12%H留白另算。Education外panel W×62、内logo182.4×48，两种profile splash位置不同；其.025×62 offset只是同一解析规则的未扩展认证分支。`layout` 可显式覆盖outer宽高 /offset，不把截图fit变成默认值。

源title_image只有type /layer /texture，**没有显式keep_ratio或anchor literal**。当前whole1937×333标题采用contain /center，是普通Start有限窗口观察支持的默认映射，不能说原JSON显式声明了它。2560×1440普通四行WGC观察支持自身高度offset /contain和隐藏new-player流，不是实际guiScale provider读出、逐像素RGBA0或其他profile认证。

## 资源与未实现的引擎部分

完整原素材与metadata来源见 [start-menu-assets.json](start-menu-assets.json)，源布局映射见 [start-menu-source.json](start-menu-source.json)。37个有限完整PNG引用不代表每个状态都实例化；Mojang原图保留原许可，不由库代码许可重新授权。普通locked明确继承key `buttonDisabled`：`disabledButtonNoBorder.png`为2²，四texel都是RGBA(117,117,117,255)，metadata slice1 /base2。Web用该完整均匀底图补退化中心，不据此宣称native切片算法已恢复。

另一个key `disabledButton` 才是3² `disabledButton.png`，原nineslice=2存在切片相交；它仅见于 `start.store_error_content` 定义，尚无本Start实例 /当前产品使用证据。原metadata保留，不裁切 /钳制 /伪造新skin；这一未用分支不表示正常disabled按钮缺失。

固定公开包缺少六个精确资源：Education绿色tile、Education feedback normal /hover、external-link以及两张Education title（`title_edu` /`title_edu_preview`）。宿主需提供有权使用的相应renderer /图片，不能用普通title冒充Education logo；Education Title缺logo /logoContent会明确报错。Education feedback也要求host icon或完整button.content，不静默借用普通Feedback图；组件只检测明显缺值，不解析React节点来证明其内部有图。其余声明保留缺图边界，不补画原版图。

背景panorama、portrait /name-tag /gamerpic、splash字与动画、Play /Store GIF、banner、badge、控制器提示均是宿主渲染输入。`newOffersBadge.label` 可换本地化文字，默认是源en_US的New；`content` 则完整替换整个tag，不再由组件包裹默认背景。portrait只发原始CSS px delta /phase，不将源30° /−10°字面量当已恢复相机；bell state0须传animatedBell，state1静态bell、state2mail，frame_step8 /28帧 /10fps与未读计时不自动推断执行。gathering、upper /lower、profile A /B与badge条件独立，库不装入任何backend或定时服务。

## 已执行验证与交付修复

source02的TSX /CSS已冻结。完整正式批 `.cache/start-menu-tests-01/run-01/RESULT.json` 实际97项：96通过、1个预期设备条件跳过，零失败 /retry /flaky，987份输入pin无漂移。批次包括新Start合同、原game-controls交互 /fidelity与demo-navigation；早期preflight34不重复累计。source平面12份合计193,355像素RGBA差0，依据独立完整源图 /明确宿主背景，不是Minecraft原生整GUI或字体像素认证。该批早于下述编译交付修复，修复未改变source02组件几何，不把原批宣称为修复后重新执行。

公开public01的13项属于修正前demo；optional profile默认false的demo-only修正已包含在public02的14项通过中，组件source02不变。最新构建再次执行public03完整14项通过，见 `.cache/start-menu-release-01/public-03/FINAL.json`；未累计旧公开批次。示例正常动作 /拒绝、分支切换、可选profile、窄屏和真实原图等按该有限计划验收，测试浏览器关闭。

真实React18 /19已安装Vite消费者曾暴露交付问题：TSUP产物的相对资源URL在正常依赖预打包后指向错误位置，出现坏图。失败原件保存在 `.cache/start-menu-package-browser-02/run-01/FINAL.json`，不能以源码demo正常或SSR通过否认它。现改用独立Vite library产物和完整原字节dataURL；CPU核401个source资源引用（356PNG /39TGA /6JSON）逐字节内联身份一致，见 `.cache/library-asset-inline-01/FINAL.json`。它覆盖整个库的有限静态引用，不是401份Start专属素材，也不代表浏览器逐项使用了全部401资源。

新的 `package-inline-03.log` 记录React18.3.1 /19.3.1实际安装后通过164组件＋6数据＋11函数（181值）、ESM /SSR /strict类型、全部原资源 /许可与401内联字节门禁。验证用tar为 `.cache/start-menu-release-01/start-menu-inline-verified.tgz`，SHA `136703d086f84caace98d8248f104e7bc4800bca61536ac430dea4d307dcee85`；最终文档重打包身份由单独的payload比较关联，不预猜tar哈希。

独立 `.cache/start-menu-package-browser-04/run-01/FINAL.json` 的四个实际消费者（React18 /19×正常Vite dev /production build-preview）均通过，1,724份输入pin无漂移。每case实际43个DOM图片解码、37项Start manifest完整PNG身份、Book /hollow1原图、两份TGA fetch完整SHA、40×80 Banner canvas的3,200非透明像素、NPC factory的10bones /真实skin及宿主交互均验收。dataURL读取不写成HTTP；六份原JSON的HTTP解析仅在dev独立检查，不是factory发起IO。MCBE CJK /MCBE Pixel /Monocraft三字体实际loaded且HTTP原字节匹配，不扩称原生字形栅格或所有字体已加载。

browser03四case失败也保留：fixture只导入styles.css却要求可选字体已加载，faces /rules为空。04只按正常用法加fonts.css和短中英文样本，没有改产品、素材期望或门禁；这与02真实坏图缺口分开记录。各消费者浏览器及自有服务已关闭，正式97、公开14、包消费及四consumer分别保留范围，不重复累计为一个通过总数。

原生JPEG仅存本地，不复制进文档或npm；native字体 /caret /safe-zone /动画 /活动路由及完整Start整页RGBA仍未认证。覆盖清单已依据上述有限源实现和验收将 `start_screen.json` 从E改为有限A，其他205行保持原字节；这不是普通Start或全部profile的原生像素完成。
