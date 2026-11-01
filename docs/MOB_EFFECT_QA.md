> 当前公共入口193组件／211运行时值。MobEffect两组件通过有限源、Web、实际包／安装及source／built预览验证；不认证原版字体、整屏或Pocket。

# Mob Effect：可见效果行与专门屏幕

公共入口提供`MobEffectRow`与`MobEffectScreen`，List、布局DTO与求值函数保持私有；实际入口及受检功能包从191／209增加到193组件／211运行时值。有限Web、实际安装和预览验证见下文，native、Pocket、字体及整GUI仍未认证。

已有`StatusEffect`继续是HUD单图标槽，不包含可见name／timer、专门grid、滚动和关闭。新组件复用现有33个完整原effect图，列表120×32背景与HUD24×24背景保持不同身份；没有增加33套图或替换旧HUD API。

## 最小用法

以下代码使用已通过 React 18/19 实际安装检查的公共入口：

```tsx
import { useState } from 'react';
import { MobEffectScreen } from 'mcbeui';
import 'mcbeui/styles.css';
import 'mcbeui/fonts.css';

function EffectsPreview() {
  const [open, setOpen] = useState(true);
  return <MobEffectScreen
    effects={[{ id: 'host-speed', name: 'Speed II', timer: '2:15', ambient: true,
      icon: { kind: 'known-effect', effect: 'speed' } }]}
    gridDimensions={[1, 6]} availableSize={[420, 260]} scale={1}
    sourceProfile="desktop" inputMode="mouse" closeButtonVisible={true} touchThumbVisible={false}
    textProfile={{ name: { fontSize: 10, lineHeight: 10 },
      timer: { fontSize: 10, lineHeight: 10, shadow: false }, provenance: 'explicit-web-profile' }}
    iconLayout={{ kind: 'parent-percent-contain-web-policy' }}
    layoutPolicy="source-formulas-parent-percent-web"
    label="Active effects" closeLabel="Close active effects" scrollLabel="Effect collection"
    open={open} onCloseRequested={() => setOpen(false)} />;
}
```

`MobEffectRow`接收同一effect、scale、textProfile和iconLayout，可独立显示固定240×30逻辑行。`name`和`timer`是可见的字面单行文字，不能包含CR／LF；timer由宿主提供，库不倒计时、不补等级／罗马数字、不排序，也不从ambient推导计时可见性。图标可用`known-effect`、带真实naturalSize的whole-image或none。可选renderText仅提供非交互glyph内容，组件保留位置和可访问字面文本，不接受整屏／整行renderer或children替身。

## 尺寸与源标志

固定来源为v1.26.60.5-full的`resource_pack/ui/mob_effect_screen.json`，6,371字节，SHA256 `d3158915d594fb77fb11a3030f3def35d5cd28fb70e6a277d9e255646f1b26b3`。15个own定义、14次nested control及19个精确依赖节点保留；原生百分比／default高度／锚点求值未恢复。

- 显式gridDimensions为非负安全整数，effects长度不能超过容量，ID须在集合内唯一；空位保留，不按数组长度猜grid。源grid声明150宽，cell仍240×30，不为适配把行压成150。候选demo的1×36／2×18／3×12容量独立于0／3／12／33个记录。
- main面板为90%×90%、offset4,4；list为90%×(90%−4)、offset−4,4并clip；close为18×18、x=90%+4、y=7.5，保留半像素，不先取整。sourceProfile只选择源变量上下文，不自动决定mouse／touch，也不认证Pocket。
- name白色、offset27,5、source shadow=true；timer灰0.7、bottom-left offset27,−5。timer shadow／字体／lineHeight未写，必须明确选择Web profile，不能把示例false写成源事实。
- 图标源control为60%×60%、offset−105,−1，anchor／paint未写。`parent-percent-contain-web-policy`是显式Web求值；常见18×18图落点推导不是native默认坐标。需要其他注册时用host-resolved box／fit。
- mouse保留8px轨道与实际classic-button5×5／cuts2 thumb；不能误用通用ScrollHandle。touch为独立contained分支、4px、无轨道与touchScrollBox，thumbVisible为宿主策略；不宣称恢复释放淡出、输入仲裁或engine滚动锚定。浏览器默认scrollbar隐藏，源内滚动仍存在。

当前Web修订让List／Screen外层使用overflow:clip，避免焦点操作把非滚动祖先自动移动2逻辑单位；真正ScrollArea仍滚动。滚动内容高度为4＋声明rows×30＋2逻辑单位，末尾额外2用于最后一行可达性，是显式Web机制，不是恢复的源padding。源scroll y2、grid y4、cell30、nominal grid150与轨道公式保持独立；不能据此推导原生末尾留白。

## 关闭、控制器与宿主伤害通知

close按钮、Escape Web adapter及controller screen request对应`button.menu_continue`；精确screen输入为menu_cancel或mobeffects，close-button输入为menu_select或menu_ok。隐藏close按钮不撤销全局screen／Escape路线。controller只接收显式命令，不轮询游戏手柄或发明mobeffects物理键。

`notifyPlayerHurt()`表示宿主对`close_on_player_hurt`属性的通知，payload为reason=player-hurt／sourceProperty，不伪造button ID或DOM事件。当前源码将它与disabled用户输入分开：活动屏幕的宿主伤害通知仍可排队；inactive／hidden屏幕不可。关闭只是请求，宿主可保留open表示拒绝，库不导航、不读玩家血量／世界／账号服务。

原生root handlers同步先执行；语义请求经共享owner-window task检查晚期React／native取消及最新已提交状态、归属和连接。祖先hidden／inert、禁用输入、移除／重识别控制会按有限合同检查。modal为Web opt-in；close源focus_enabled=false与候选DOM的tabIndex−1／全局Escape／viewport焦点策略分开，不是原生无障碍资格。任意直接DOM或原生属性修改不是保证取消请求的通用协议。

## 资源、验证与后续接入

11张源材质及raw metadata与既有35张HUD PNG（33图标＋2背景）的全字节身份已由源研究记录，原许可仍适用，不能改称库MIT。字体未由该UI指定，示例使用已有OFL字体路线，不复制游戏字体。`MobEffectScreen`／Row的各项验证按下述具名阶段分别记录，native对照仍未完成。

`mob_effect_screen.json`仅更新为有限命名族A，表示真实专门组合已建立；不把图标或两个新名称视为完整游戏GUI或native认证。


## 已执行验证（2026-11-01）

- 正式 Node 合同10项通过；首轮 parts 为17 CPU／React18、19各16 SSR，独立审查为23 CPU，均为各自具名阶段。之后浏览器确认并修正 List 聚焦造成隐藏祖先滚动2逻辑单位的问题，当前正式 Node 和包使用 overflow:clip／显式尾部可达性修订。旧阶段及失败证据保留。
- 正式Playwright共34个不同桌面／移动合同分阶段通过：首轮32通过、2个移动端可信点击超时；将这两个指针测试的宿主frame从800px改为可见的360px／scale1后，两项重测通过。保留原trace，没有force click或组件改动，不称一次34全绿。重测中间一次配置把正则序列化为对象，未执行任何测试，单独保留。
- 当前源码浏览器11组通过（web-08），两种原始背景在1×／2×／3×共六张整行平面、201,600个RGBA像素严格零差。该结果只覆盖原图背景的Web采样；没有把文字、游戏材质路由或整屏算入。额外真实wheel／PageDown、DOCUMENT键盘取消、控制器字段快照／最新提交、inert及末行可达性为web-06的5项通过，该阶段最后一项合成触摸超时保留。web-07原始触点序列使移动Chromium viewport实际滚动105px，通过；不认证物理设备或Pocket引擎。
- 完整既有打包验证通过，含193组件＋6数据＋12函数和532原字节引用。新MobEffect同一实际tgz在React18.3.1／19.3.1各42组SSR、17运行时反例、12公开类型／24严格类型反例通过（NodeNext、skipLibCheck:false），11张原PNG／11份raw metadata／license及三CSS检查通过；853个包文件与tar完全相同。首次新包验证把Vite内联URL当文件名而误判，修正观察器为完整原PNG字节检查后，同一tar通过，组件／tar未改变。
- 同一安装包在React18／19×默认Vite开发／生产四组合，各11挂载组通过；每组合都验证六张原背景平面，包文件零漂移，没有alias／dedupe／optimizer绕行。
- 实际source与built展示页各6组通过，覆盖33个原图图标、独立grid／size、ambient／timer、真实Combobox、宿主拒绝／接受、伤害通知、Escape、代码及宽屏／390px预览。首次public脚本用了不存在的按钮名，保留失败trace；按真实标签修正后通过，无产品改动。

受检功能tar SHA256 `d9da917729b047cf41bd5c5261031122f4edfd542bea698d3cbd4cac227607c3`，runtime index `ea338512614036b51e8eb61eedd060c88927784f01fc3a537c0a47e1c02e5956`，声明 `b066a6ac9982fc3e80f2fba3f380d6dc430eb3cc2a763cffc18354df331e2378`。最后文档归档与Git提交身份单独记录；未经测试的发布、部署或npm上传不包含在本记录。
