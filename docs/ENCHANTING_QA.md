# 附魔书本与经验文字独立 QA

2026-10-29。验证对象是当前 React / WebGL 重建、Classic GUI 2、Chromium DPR=1。结论是本次修正改善了可见书本结构和经验彩字阴影，浏览器运行与受控参数检查通过；**没有取得当前版本 Bedrock 原生截图，不能判定书本或文字阴影为原生 pixel perfect。**

## 经验文字的证据等级

原始 `enchanting_screen.json` 明确给出 `enchant_cost`：`shadow:true`、bottom-right 锚点和 offset `[-2,-2]`；成功色来自 `[.5,1,.125]`，失败色来自 `[.54,.37,.36]`。这些信息来自已核对本机与公开 full release 的原始 JSON，GUI 2 对应文字右/下4 CSS pixel偏移。

原定义没有声明阴影 RGB 或变暗系数。另查本机 `materials/ui.material`，`ui_text` 只引用 `shaders/text.fragment`，没有提供文字阴影变暗计算。[Microsoft 官方 UI element 参考](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_element?view=minecraft-bedrock-stable) 同样只规定 `shadow` 是是否渲染文字阴影的布尔属性，没有给出0.25算法。

因此当前成功阴影 `#203f08`、失败阴影 `#221717` 是按彩色文字变暗得到的**近似与实现选择，Bedrock 原生算法未验证**。原先统一灰色阴影没有跟随彩字色相，本次改为绿色/棕红色阴影确有视觉改善；但不能将“更合理”写成“已经证明原版就是这些字节”。`--mc-enchantment-cost-shadow` 允许宿主在得到原生证据后校准。

自动测试分别核对两种主色、当前默认阴影、2×2 CSS pixel无模糊偏移、右/下4 CSS pixel位置和变量覆盖。阴影字节是浏览器组件的回归期望，**不是从原始 JSON 直接导出的原生验收值**。

## 书本来源与目视检查

原始 `enchanting_table_book.png` 为64×32，SHA256 `e8d23533b48976b578098db767e2c8161a31fa5d7b22bf576bf531b1bc7f000f`。资源文件先前已经与本机原图字节匹配；本次测试再次固定该哈希与尺寸。

生产实现参照官方 Java 1.21.5 客户端的 BookModel / ModelPart.Cube：左右封面、书脊、左右页块、两张翻页面，使用同一张 atlas 的 box UV 布局。这为重建提供了比平面四边形更具体的参考，但 Java 几何、姿态或 UV 算法不构成 Bedrock `enchanting_book_renderer` 的实现证据。

独立查看修改前后与本次运行实际截图后：

- 默认打开状态能看到正面浅色纸页、两侧金棕封面边和书脊，前一版倾斜薄纸片的观感已有改善，没有看到整本错误显示成封面背面。
- 关闭状态可见褐色正封面，当前80×80画布内绘制边界为 `(24,14,30,50)`，不是把纸页面缩成一条线。打开状态边界为 `(6,13,67,50)`。
- `pageFlip=.25` 保持同一整体边界，但与0状态相比有467个RGBA像素变化；`open=0` 与 `open=1` 相比有3128个像素变化。两项参数确实改变 WebGL 图像，重置后回到完全相同的图像。
- 光照仍为纹理颜色直接采样，投影、相机、翻页方程和极薄面的厚度属于重建；仅凭当前正面截图无法逐面认证所有 UV、背面方向或遮挡关系。原生阴影纹理、动态光照、原生逐帧姿态尚未复现或验证。

父任务看到的2024年 Wiki Bedrock GUI 图片可作关闭书本外形参考，但版本和缩放条件不匹配，不能当成当前版本逐像素基准。

## 运行与组合验证

新增 [enchanting-renderer.spec.ts](../tests/enchanting-renderer.spec.ts)，**5/5 PASS，9.1s**：

1. 原始 atlas 哈希/尺寸、canvas显式 `renderer-reconstruction` / Java几何来源标签、实际 WebGL draw 调用及非空纸页/封面像素。
2. `open` / `pageFlip` 控件改变实际渲染，恢复原值后图像确定性一致。
3. 成功/失败经验色、当前近似阴影、位置和宿主覆盖行为。
4. 主页面附魔台实际 WebGL 与完整未遮罩组合截图，无 page error，draw 后 `gl.getError()=0`。
5. 空槽和装有青金石时均保留32×32、不乘0.35透明度的 underlay，槽内偏移2 CSS pixel，层级低于物品图像。

主页面书本位于 `aria-hidden=true` 的装饰父层，测试直接定位 `canvas.mc-enchanting-book`；初次测试使用可访问性角色查询找不到该装饰元素，已修正测试定位，没有更改生产装饰语义。

使用独立5184端口执行，结束后确认对应 Node/Vite 进程已退出。命令为 `npx playwright test --config .cache/enchanting-independent-qa/playwright.config.mjs`。集成后可运行 `npx playwright test --project=pixels tests/enchanting-renderer.spec.ts`。

实际截图位于 `.cache/enchanting-independent-qa/`，包括 `book-open.png`、`book-closed.png`、`book-quarter-turn.png` 和 `enchanting-unmasked.png`。这些是当前实现的证据，**不是原生游戏期望图**。测试只在独立 canvas specimen 中固定整数屏幕位置，主页面组合截图保留原始生产布局。
