> 原始TrueType计数现有独立`headerTextProfile`与Manager映射，可与本文图标路径同时使用。见[计数接入与验证](RESOURCE_PACK_HEADER_TEXT.md)；本文图标范围不扩张为整页字体认证。

# Resource Pack header image sampling

`ResourcePackSection.headerImageProfile` 和 `ResourcePackManager.headerImageProfiles` 让标题加／减号复用公开的 `GuiImageLayer`。原 PNG、全图 UV、源 Tint／Hud 和整个 framebuffer 的投影保持独立；内部只输出图标附近的整数裁窗。它不替代标题字体、按钮皮肤、集合布局或 Settings 的整页布局。

展示入口为 `/#resource-packs` 中的“启用标题图标采样”。默认关闭；开启后可点击独立标题切换加号／减号。示例使用明确的宿主坐标与绘制矩形，不把捕获坐标注册成产品默认值。

```tsx
import {ResourcePackSection} from 'mcbeui';
import type {ResourcePackHeaderImageProfile} from 'mcbeui';
import 'mcbeui/resource-packs.css';

const images: ResourcePackHeaderImageProfile = {
  frame: {width: 1200, height: 900, guiScale: 2},
  toggleOrigin: [180.25, 60],
  expandedPaintRect: [180.25, 63.5, 10, 3],
};

<ResourcePackSection
  kind="unowned" profile="global" width={140} scale={2}
  title="Resources" titleVisible expanded={false}
  collection={{capacity: 0, count: '0', items: []}}
  noPacks viewMoreLabel="View more"
  headerImageProfile={images}
/>;
```

| 字段 | 含义 |
| --- | --- |
| `frame` | 完整物理 framebuffer 的宽高及源 GUI scale；scale 必须与 Section 一致 |
| `toggleOrigin` | 正常状态10×10控件中，加号图像的 GLOBAL game origin；宿主已计入源 offset[-2,0] |
| `expandedPaintRect` | 减号正常状态的 GLOBAL 量化前绘制矩形；展开时必需，独立于10×10控件尺寸 |
| `scissor` | 可选的完整 framebuffer 物理整数裁剪矩形 |
| `renderKey` | 更改后重试失败请求或丢失的 WebGL context |

Manager 接受按 `selected`／`available`／`realms`／`unowned` 分类的可选映射。未提供 profile 的标题继续使用普通 Image；每个已提供的标题最多使用一个小 canvas，没有额外的 Manager 整帧图层。

宿主必须提供解析后的源坐标。这里没有从 DOM BCR 反推原生坐标，也没有恢复 `100%c`、默认 anchor、字体 intrinsic、Settings safezone 或滚动求值。展示应保持源像素网格，允许整个 target 整数平移；CSS zoom、分数平移／滚动或非等比例缩放可能再次重采样 canvas。使用 profile 不等于整页原生认证。

本次原生展示对照采用 DPR1。库不从 `devicePixelRatio` 推断源 framebuffer、GUI scale 或宿主展示映射。无效或有缺项的坐标、scissor 和非有限 renderKey 在请求资源前保留错误回退；不支持 CSS `:has` 时只显示普通 Image。

正常／锁定使用 Tint RGB `.3`，hover／focus-visible／pressed 使用白色，Hud 为1。按下时源图像 Y 增加1；canvas 展示同时补偿父内容已有的 CSS 位移，避免移动两次。控件仍使用原来的真实 button、受控展开值和宿主 action，没有在渲染层乐观修改集合。

只有与当前实际按钮 pseudo-state 一致、且当前 canvas 为 ready 的请求才替换自己所属的 Image。等待解码、更新几何、失败或 contextlost 时保留原图；旧 normal canvas 不能盖住已经 hover 的白色回退图。`renderKey` 可重试，卸载会取消请求并释放当前资源；forced colors 使用普通回退。

减号原 PNG 是全白不透明的11×3图像，将其直接拉伸到10×10会成为方块。普通回退现在保持其比例。GPU profile 不猜测 paint extent：未提供 `expandedPaintRect` 时保留回退并报告 data-render-error。示例里的3单位高是明确的 GUI2 宿主绘制策略，不是对所有版本原生 `keep_ratio` 默认值的声明。

## 有限原生验证

真实原版帧中的 G81／queue0 event515 使用11×11加号；两枚图标各改变1168像素。G87／queue0 event568 使用11×3减号、同一 UI/Blit shader 和 POINT／CLAMP，实际 quad 的最终 half 坐标是 `[442.5,37.59375]…[452.5,40.40625]`；完整 target 仅有 `[2212,188,50,14]` 的700像素变白。全部33个源 texel、四个顶点、完整 UV、VS／PS常量和同 draw 的 before／after均独立核验。

捕获的最终 half 顶点是 oracle，不能直接充当量化前 `expandedPaintRect`，否则会二次 floor／ceil。测试使用宿主正常控件 origin、原11:3比例、物理高度 ceil 和居中这一显式条件策略生成输入，比较打包后的几何；没有将这些值作为默认布局。

真实 Section／Manager profile 在 SwiftShader 和 NVIDIA D3D11 上，使用原生 before target 作背景，完整2570×1402输出分别与 G81／G87 after target 全 RGBA 零差。整数裁窗仍使用整个 framebuffer 的 MVP；背景内原有字体与其他控件不算新重建。独立原生 JSON 布局、其他 GUI scales／状态及整页字体仍待认证。

普通 CSS 的已知相位负例继续保留：加号的 `pixelated` 与 `crisp-edges` 均有128像素全帧差异；减号比例回退有28像素全帧差异。没有以阈值、mask、局部裁切或选择后端隐藏这些差异。CSS 取样属性描述浏览器的图像处理行为，并非 Bedrock 的采样器接口，见 [CSS Images 3](https://www.w3.org/TR/css-images-3/#the-image-rendering)。

```sh
npx playwright test tests/resource-pack-header-images.spec.ts --project=pixels --workers=1
```

测试还覆盖 SSR、真实展示入口、鼠标／键盘按下、异步 fallback、contextlost、显式重试、错误 scale、缺失 minus paint rect、forced colors 和卸载。原生测试需本机私有采集，缺少时明确跳过，不生成替代参考；私有 WPIX、shader、GPU dump 和原生截图不进入 npm 包。
