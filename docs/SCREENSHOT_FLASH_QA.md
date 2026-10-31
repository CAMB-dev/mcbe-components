# ScreenshotFlash：显式宿主材质与闪光时钟

`ScreenshotFlash` 只表现源Screenshot画面的闪光，不调用相机、截图、保存 /导出或引擎screen-close。固定官方 `screenshot_screen.json` 为1,201字节 /4个定义，声明alpha由1到0、easing为in_expo；duration变量在该源与固定globals均没有默认值。完整源与原件身份由producer维护的 [screenshot-flash-source.json](screenshot-flash-source.json) 记录。

## 最小用法

```tsx
import { useState } from 'react';
import { ScreenshotFlash } from 'mcbeui';
import type { ScreenshotFlashImage, ScreenshotFlashTrigger } from 'mcbeui';
import 'mcbeui/styles.css';

export function AppFlash({ image }: { image: ScreenshotFlashImage }) {
  const [trigger, setTrigger] = useState<ScreenshotFlashTrigger | null>(null);
  return <>
    <button onClick={() => setTrigger(value => typeof value === 'number' ? value + 1 : 1)}>
      播放闪光
    </button>
    <ScreenshotFlash
      size={[320, 180]} scale={2}
      flashImage={image} trigger={trigger}
      durationMs={200} easing="web-in-expo"
      onFinished={() => setTrigger(null)}
    />
  </>;
}
```

200ms是此示例的宿主选择，不是原版默认值。`flashImage={src,sourceSize:[width,height]}` 必填，图像就绪归宿主；不根据未知材质ID取图。独立样式为 `mcbeui/screenshot-flash.css`。ref指向真实div；这是aria-hidden、非焦点、pointer-events:none的装饰层，不阻挡操作。

## 必填材质与背景

源引用大写 `textures/ui/White`，固定公开包没有该精确条目。唯一case-fold候选小写white.png是15²，121白texel和104黑texel，不是纯白替代物。组件没有默认flashImage，不把候选alias、裁出白区或程序画白冒充原图。demo显式传整个候选只是宿主选择，不新增Screenshot默认素材或资产副本；完全相同的132字节whole候选已存在于既有Crafting registry /库存CSS及旧包中，这不证明它是White的native alias。

`feed_common.transparent_background`名称不代表真正透明：实际control.png为2²、RGBA(9,9,9,255)，源alpha .8；组件复用既有Jigsaw完整原图。上层闪光在layer6，独立alpha变化。闪光到0后这个深色背景仍在；示例由onFinished后把trigger置null来隐藏整个层，组件不以自动卸载代替引擎关闭动作。

## 激活、受控与生命周期

|输入|Web合同|
|---|---|
|`durationMs`|必填有限非负数，0为即时客户端完成；自动activation开始时snapshot时长 /曲线，同trigger改设置不重播已完成activation。|
|`trigger`|null为idle，字符串或有限数字为activation标识；变化才重播，隐藏 /cancel后恢复会建新activation，不写入截图服务。|
|`visible` /`hidden` /`cancelled`|控制宿主显示或取消；取消不伪造完成回调，清理已安排的RAF。|
|`control`|`{kind:'alpha',value}`或`{kind:'progress',value}`，范围0…1；绕过RAF与自动reduced-motion，可倒退，但每activation完成只通知一次。|
|`motion`|system（默认）/animate /skip仅用于自动时钟，system监听prefers-reduced-motion；不覆盖受控alpha /progress。|
|`easing`|默认web-in-expo是标准Web指数映射，也可linear或返回0…1的纯函数；不是已恢复native in_expo曲线。|
|`onFinished`|提供trigger、mode、客户端单调elapsedMs、reducedMotion；alpha0 /progress1后的本地通知，不关闭或保存游戏画面。|
|`size`|显式逻辑宽高配正整数scale，或 `size="parent"` 用CSS父frame且禁止再传scale；不自动观测native窗口 /安全区。|

自动时钟用所属window的performance /RAF，监听与RAF在失活 /卸载时清理。React18 /19的内部ref adapter始终返回void：若调用方callback返回cleanup，由adapter在detach /替换时调用一次且不再额外发null；普通callback有node /null，object ref清空。这项合同的真实mount证据与SSR分开记录如下。

## 当前证据与限制

rev02修复了初版把caller cleanup返回给React18的真实兼容缺口；初版报告保留。producer源SSR在React18.3.1 /19.3.1各18检查、零warning /IO，实际adapter函数9项CPU协议检查通过；它们本身不等于ReactDOM mount或浏览器验证。

随后独立实际浏览器批17项全部通过、零跳过 /失败 /retry，20份输入pin无漂移，当前React root为19.3.1：2项SSR、14项client和1项完整15²候选图平面。真实refs /StrictMode、时钟 /受控值 /reduced motion与清理得到该有限客户端范围验证，完整候选225像素RGBA差0，包含其黑色边缘；该17项批次不包含React18 mounted验证，也不认证Native White alias或原生时间 /曲线；后续安装客户端范围另列。

该批状态为 `PASS_WITH_REPORT_PATH_OBSERVER_RECOVERY`，记录 `.cache/screenshot-independent-qa-01/browser-run-01/RESULT.json`：Playwright同一次执行已17项通过，外层wrapper因误以cwd定位相对report路径出现ENOENT；随后在configDir对应目录找回原report、整字节SHA相等复制为canonical。保留observer异常与原report，没有改产品 /测试或重跑，不写成测试失败后重试变绿。

后续真实React18.3.1 /19.3.1安装包通过ESM /SSR /严格类型 /CSS /素材 /许可门禁，649个dist条目与构建及两个安装消费者逐字节相同，见 `.cache/storage-release-01/PACKAGE.json`。已测包SHA为 `e859946cf1cc9fbb70700e93682642312278ab786ab636c049eae3d791bf7b8c`，最终仅文档重打包身份另证。首轮新增泄漏门禁因既有Crafting /库存CSS的相同whole候选误报而失败；原日志与独立来源追溯保留，修正了门禁范围，没有新增Screenshot默认素材。

实际安装客户端React18 /19各dev /production四场景全部通过，见 `.cache/storage-installed-browser-01/run-01/FINAL.json`；1,906份输入pin无漂移。每场景都真实挂载：controlled alpha /progress不截获底层操作，RAF完成恰一次且feed背景保留，取消停止时间线且不发完成；callback ref替换 /卸载各执行一次cleanup、不重复null，包含React18真实mount。页面 /console /请求错误为0，四场景的浏览器与服务各自finally关闭。公开构建另有14项辅助检查通过（Storage与Screenshot合计），见 `.cache/storage-public-01/FINAL.json`，含底层操作、受控完成背景与显式reduced-motion策略；不与17项源浏览器批或安装四场景合成虚构正式总数。

没有可用原生Screenshot闪光frame或曲线 /时间provider证据，不认证native White解析、动画曲线、帧调度、screen-stack或完整整页像素。此文档不修改producer的源metadata、公共素材或其历史证据。
