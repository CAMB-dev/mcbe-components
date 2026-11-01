# Progress：源界面与可复用部件

这组组件按 Bedrock `progress_screen.json` 的源结构组合进度界面，保留原始完整纹理、显式可见标志、资源包集合与教育云分支。它们不连接游戏或云服务。旧的 `Progress`、`LoadingScreen`、`StorageSharingProgress` 保持原有接口。

```tsx
import {
  ProgressScreen, ProgressIndicators, ProgressPackGrids,
  ProgressResourceDialog, ProgressCloudPanel, ProgressCloudConflictDialog,
} from 'mcbeui';
import type { ProgressScreenProps, ProgressScreenModel } from 'mcbeui';
import 'mcbeui/fonts.css';
import 'mcbeui/progress-screen.css';
```

## 选择组合层级

| 组件 | 直接输入 | 职责 |
| --- | --- | --- |
| `ProgressScreen` | `ProgressScreenProps` | 根路由、维度背景、标题、基础/云面板、资源与冲突 factory、焦点及退出。 |
| `ProgressIndicators` | `templates/state/availableSize/scale/imageClipPolicy/customBar/label` | 原图波形、旋转图、存档图、经验条、粗进度条及显式 Web custom-bar。 |
| `ProgressPackGrids` | `runKey/instanceId/packs/profile/size/disabled/readOnly/onSelectionChange` | 两个独立受控资源包 grid，不注册整屏模态层。 |
| `ProgressResourceDialog` | `{snapshot: ProgressScreenModel, popup}` | 一个独立实例的资源 factory，`popup` 不必等于 snapshot 内的 resourcePopup。 |
| `ProgressCloudPanel` | `{snapshot, kind, imageClipPolicy}` | `upload/fetch/download/server-fetch` 内容面板；不注册根级 menu-cancel 路由。 |
| `ProgressCloudConflictDialog` | `{snapshot}` | 独立云冲突 factory、三种保留请求、遮罩与焦点；`conflictPopup:null` 时无弹窗。 |

后三个复用部件的语义回调通过 `snapshot.onAction` / `snapshot.onPackSelectionChange` 提供。公共部件拥有语义延迟与原生事件收尾；应用不需要接入私有 `onRawRequest`。`snapshot.rootRef`、`snapshot.nativeProps` 用于对应独立根节点。

独立弹窗的内部源控件拥有 dialog 语义和名称；外层 `snapshot.nativeProps` 可以设置 id、原生事件等，不能覆盖 role/tabIndex/aria-modal/aria-label/aria-labelledby。不要直接把完整 Screen 的根级语义属性复制到这些外层节点。

`ProgressScreen` 初始建议 `open:false`，由用户动作打开，以记录正确的返回焦点。`controllerRef.request('button.menu_cancel')` 表达逻辑源输入，`activate-focused-web` 是明确的 Web 聚焦激活策略；它们不模拟物理手柄。

## 十五个根入口

`route` 接受：`progress_screen`、`modal_progress_screen`、`delete_progress_screen`、`realms_stories_loading_progress_screen`、`world_loading_progress_screen`、`experience_world_loading_progress_screen`、`overworld_loading_progress_screen`、`nether_loading_progress_screen`、`theend_loading_progress_screen`、`world_saving_progress_screen`、`fetching_edu_cloud_worlds`、`edu_cloud_download_progress_screen`、`fetching_edu_servers`、`joining_edu_server`、`world_convert_modal_progress_screen`。

教育版、云存档、Desktop/Pocket、鼠标/触控以及 Android/iOS 标志彼此独立，组件不从 UA 或窗口宽度推断它们。门控条件不满足时，部分入口按源规则继承空内容；基础 `progress_screen` 自身也没有默认世界加载面板。需要源 helper 时可明确提供 `injectedContent` 与来源，不能把无内容入口自动替换成任意 loading 页面。

`experience_world_loading_progress_screen` 继承普通世界加载内容，不因名字带 experience 自动选择粗进度条。`delete_progress_screen` 的源动画列表包含进入与退出，`joining_edu_server` 的列表为空。转换、删除、存档等名字均不意味着组件会执行操作。

## 显式显示参数

`profile.availableSize` 是逻辑画布宽高，`profile.scale` 是整数 CSS 倍率。组件根据这些尺寸裁绘，弹窗不会因为内容长而插入浏览器原生滚动条。资源包内容自身保留源滚动区；窄页面可在组件外提供局部横向视口承载固定画布，展示页采用此方式。

展示页把打开的整屏预览及独立资源/冲突弹窗放入宿主全视口 portal，保留原画布尺寸。极小窗口的滚动发生在宿主容器上；点画布外空白处会发出当前层的逻辑取消请求，或由宿主关闭独立部件预览。这是展示页的退出方式，不是向原 GUI 添加关闭按钮或声称原生支持背景点击退出。

`profile.intrinsicSizes` 记录没有恢复的 `default/%c/%cm/c%` 求值结果，键为准确的源控件路径。缺少活动分支的必要键会提前拒绝渲染。`70c%`、`99c%` 与普通百分比不同，不能直接转成 CSS `70%/99%`。`demo/progress-demo-profile.ts` 展示了独立的宿主配置方式：等待实际字体加载后测量文字，结合源固定尺寸与明确的有限 Web 约定提供这些值。它是展示页参数，不是产品内置默认或原生测量证据。

`profile.fonts` 分别给 title/progress/code/error/button/pack/conflict/auxiliary 角色提供字体族、逻辑字号、行高和来源。展示页使用打包的 `MCBE Pixel` 与 `MCBE CJK` 开放字体替代，先等待 `document.fonts.load()`，再测量与挂载。没有将这些字体称为原版 Mojangles/Noto Sans 或已复原的字形 shader。可提供 `renderText(text,context)` 作为非编辑文字的 glyph-only 输出；整页、布局、按钮和可访问文字仍由库拥有。

## 进度图像与帧

`ProgressIndicators.templates` 显式选择源 helper：`wave/spinner/fancy/thick/custom/autosave/cloud-upload`，可以同时选择多个。`barAnimationVisible`、`spinnerAnimationVisible`、`loadingBarVisible`、`progressAnimationVisible`、`useDeterminateAnimation`、`autoSaveVisible` 保持独立。只有 `cloud-upload` 自身按父级 animation-visible 与 determinate 标志选择其两个子分支，组件没有把所有进度图像归并为互斥状态。

波形与旋转图的帧是 `0..9`，存档图是 `0..8`。传入 `waveFrame/spinnerFrame/autoSaveFrame`，组件显示对应完整原始图集窗口，没有隐藏时钟或猜测引擎动画相位。`paused` 是宿主状态；自动播放、暂停、减少动态效果和端点停留若由应用实现，应单独声明 Web 策略。

`percentage` 保留未取整的源比例。`imageClipPolicy` 必须明确选 `visible-fraction-web` 或 `left-removal-web`，两者都是 Web 裁剪解释，不声称恢复了引擎 clip-ratio 求值。`currentAmount` / `totalAmount` 与图像比例独立。

原生 `progress_bar_renderer` 尚未恢复。选择可见 custom 模板时，需要 `profile.customBar={kind:'explicit-web-clip',clipRatio,provenance}` 才能绘制明确的 100×2 Web 分支；`native-unrecovered` 不会伪装成成功的原生绘制，也不会从 current/total 静默计算比例。

## 受控资源集合与 factory

`packs.required`、`packs.optional` 分别声明 dimensions 和 entries。grid 不会从数组长度推断维度；required 行禁用、optional 行可选，`selected` 是宿主受控值。源 `toggle_default_state:true` 不会覆盖显式的 `selected:false`。`payload` 保留原始引用，不遍历、调用或冻结它。

`selectedCountText` 与 `selectedSizeText` 是独立宿主字符串，组件不计算数量、下载大小或单位。展示页在接纳包选择后由自己的宿主回调更新计数，并提供拒绝选择的开关；这不是组件自动接纳。

```tsx
<ProgressPackGrids
  runKey="session-1" instanceId="pack-list-1"
  packs={packs} profile={profile} size={[300,120]}
  disabled={false} readOnly={false}
  onSelectionChange={detail => {
    if (!allowChanges) return false;
    setPacks(previous => updateAcceptedPack(previous, detail));
  }}
/>
```

`ProgressResourceDialog.popup.factoryId` 包含五种源实例，按钮矩阵如下。所有文案来自相应 source binding 或 `profile.labels`，不会用源文件里的注释替代有效属性。

| factoryId | 上 / 中 / 下按钮目标 |
| --- | --- |
| `test` | 完整选择器，两按钮为 `button.confirm_download` / `button.deny_packs`，有效文案都取 `gui.close`。 |
| `resource_pack_download_server_required` | 无 / `button.join_and_download_everything` / `button.leave`。 |
| `resource_pack_download_optional_and_required` | `button.join_and_download_everything` / `button.join_and_download_required` / `button.leave`。 |
| `resource_pack_download_optional` | 无 / `button.join_and_download_everything` / `button.join`。 |
| `resource_pack_download_required` | 无 / `button.join_and_download_required` / `button.leave`。 |

资源行名称和指定的绑定按钮文字保留源 once 实例采样语义。用新的 runKey / instanceId 表示重新实例化，不依靠隐藏、重绘或修改数组长度来重置。

## 动作、退出与焦点

普通 pointer/keyboard 原生事件先执行，语义回调在 owner window 的任务中等待事件传播完成。应用的 `preventDefault()`、document 最终 veto、晚到的 disabled/readOnly、会话或 factory 替换、卸载都可以使原请求失效。回调读取最新已提交的宿主函数。`onAction` / 包选择回调可返回 `false`；库不会据此自行执行服务或乐观修改受控数据。

资源 factory 的 Escape 目标是源定义的 **`modal.escape`**；根源映射是 `button.menu_exit`；云冲突为 `button.close_edu_cloud_conflict_resolution_popup`。这些目标不是别名。readOnly 阻止修改操作，保留可用的退出路径。`no_close_button:true` 只移除冲突窗口的关闭按钮，不取消其源 Escape 映射。

资源与云冲突是两个独立 factory。源入口同时声明并实例化两者时，`modalOrder` 必须明确按从底到顶排列 `['resource','conflict']` 或反向；这是一项明确的 Web 焦点栈策略。资源 factory 不额外添加黑遮罩；云冲突沿源 form-fit 背景使用原始 `screen_background` 图像与 `.75` alpha，不叠加无依据的额外 mask。

关闭、下载、重试、中止、加入服务器、保存世界、选择本地/云端/同时保留、打开帮助链接都只发出语义请求。HTTP、文件覆盖、合并、外链 URL、TTS、网络和游戏状态由应用执行。演示只更新本地 UI 和请求记录。

## 未恢复的 provider 与视觉边界

精确的 `textures/ui/icon_external_link` 以及 Realms 背景基模板仍缺少可确认的实现。需要这些活动分支时，宿主必须显式提供 `profile.unresolvedMaterials.externalLink/realmsBackground` 的完整图像、实际天然尺寸与 provenance。组件不拿 servers/navy 或自绘图冒充缺失材质。动态服务器区域标记同样由宿主整图输入。

展示页将全部十五入口保留在选项中。选择 Realms 时若没有背景输入，会提示先选择本地完整图片；链接默认不显示，提供图标后才能启用。本地图片不会上传或变换成新材质，也不因此获得原生身份认证。

原始纹理的局部逐像素测试、源结构验证、实际浏览器交互验证、包消费验证各有独立范围。有限 Web 背景 gradient、intrinsic/default 字体求值、动画相位、引擎 custom renderer 及完整原生界面的字体栅格仍未资格。公开 API 和可运行展示不等于原生整页已达到 pixel perfect。
