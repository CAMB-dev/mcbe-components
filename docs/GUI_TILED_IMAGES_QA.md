# 原版材质的源坐标平铺

2026-11-02。`GuiImageGeometry` 新增可选 `tiling: { size, originRounding }`，由 `layoutGuiImages`、`renderGuiImages`、`GuiImageLayer` 以及 `GuiLayer` 的image / sprite命令复用。它生成完整的重复网格，复用原始纹理；不使用CSS repeat近似GPU几何，也不将截屏裁块作为材质。没有增加组件或运行时导出数量。

```tsx
<GuiLayer width={320} height={144} guiScale={1} rasterOrigin="top-left"
  commands={[{
    kind: 'image', texture: originalBg32URL,
    rect: [0, 0, 320, 144], physicalPrecision: 'float32',
    tiling: { size: [64, 64], originRounding: 'truncate' },
  }]}/>
```

`size` 是每个完整tile的逻辑尺寸，独立于PNG的物理尺寸。`originRounding` 必须明确选择 `floor` 或向零取整的 `truncate`；该策略只属于这个平铺声明，不能外推为所有原生UI的全局规则。未设置tiling的图像保持原来的floor路径。

网格按列、再按行生成。每个tile的源位置使用 `rect.origin + column/row × tile.size`，独立物理量化；取整或ceil扩大的绘制宽度不会变成下一个tile的步长。最后不足完整tile的条带使用实际源尺寸占比裁UV，然后走原有UNORM16及half packing。它可重复完整图片或显式 `uvRect`，不能与nineSlice同时使用。`physicalPrecision: 'float32'` 延续已有标量物理量化合同，不宣称恢复所有引擎浮点累加方式。

`scissor` 和 `outputRect` 不改变源网格及其相位，也不删除被裁掉的tile。生成顶点之前预检每mesh最多16,384个quad、整批最多65,536个quad，防止16位索引溢出及过量展开。循环由预检后的整数列／行数控制，不依靠浮点位置递增来结束。React两条图像路径都拥有tiling配置快照；只改变tile尺寸或取整策略也会重新绘制。

## Credits 源候选与原生对照

固定样本ZIP SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`：`ui/credits_screen.json` 背景大小100%×2000%、tiled_scale2×2；其继承的 `ui/ui_common.json` / dirt_background使用原32×32 `textures/ui/bg32`、tiled true。公开原图与捕获resource284的完整RGBA均为SHA256 `9d4995989eab1686456fda7a1b45e539937f1e313e246ecad5b487d667657eec`，图片文件编码不同，像素一致。

在2570×1402、guiScale5中，逻辑stage为ceil后的514×281，投影仍是514×280.4。背景源尺寸据此为514×5620，tile为64×64。这个有限候选**显式选择居中及零附加offset**，给出源rect `[0, -2669.5, 514, 5620]`。它生成9列×88行、最后列宽2及最后行高52，不使用捕获后的顶点作为源rect。

本轮先比较全部几何属性，再用公开API验证整张目标：

- 按上述声明逐tile truncate，独立生成的全部3168个12字节顶点、4752个索引与捕获一致。独立VB SHA256 `f941240a7514e1ee68a4d931b3c1816ecf6e1f29618917a6bc9404a99bdf7120`。同一声明仅换floor，则738个顶点记录不同；没有搜索offset或对某一行打补丁。
- `tests/gui-layer.spec.ts` 的可选原生用例实际调用公开 `renderGuiLayer` 及React `GuiLayer`，输入上述源参数和ZIP中的完整bg32。它不向绘制器输入捕获VB、IB或CB。指定ANGLE NVIDIA D3D11后端下，完整2570×1402的FBO返回、实际canvas读回及一比一DOM截图均与原生背景RGBA零差。
- 真实参考为已有捕获的queue0/API67/Global15后、第一段shadow前的readback，按真实rowPitch10496解码；仍是整个3,603,140像素目标，没有mask或ROI。预测与实际目标完整RGBA SHA256为 `a5c0c453c0202480abaaef3b70c1ae42ab1139226ae40dc88a25ea47bbdbd45b`。
- 候选来自观察后的结构假设及源码字段，不叫盲测。零差只支持这组明确参数和这个捕获背景，不证明默认center锚点、动画实际在跑、elapsed time、所有布局尺寸、字体或整个CreditsScreen已还原。两层背景／base_screen实例都未显式给出anchor默认值；继承实例的anims覆盖／组合语义也尚未恢复。Microsoft的[UI element参考](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuicomponents/ui_element?view=minecraft-bedrock-stable)说明这些属性的含义，但未提供本次所需的原生默认值。

此前[栅格原点验证](GUI_LAYER_RASTER_ORIGIN_QA.md)只到内部prepared网格，本轮增加公开源声明→网格→GPU→React DOM这一段。旧CPU1530、默认GL2090及SwiftShader80残差仍各自保留；不要把本轮D3D11结果外推为所有后端和整页零差。

## 展示与持久回归

公开展示页 `#credits` 新增 Original tiled artwork预览，直接消费原图和公开GuiLayer，可用统一Combobox切换64×64／32×32 tile。它展示通用平铺原语；原有CreditsScreen播放器仍使用其明确的Web surface策略，未在动画循环中反复创建GPU上下文。

持久用例验证：负坐标floor／truncate、列序、完整网格与裁剪相位、尾部UV、非整数tile步长、混合裁剪、真实React配置变更、image-only及combined两条路径、错误声明和几何预算。原生用例的私有readback不存在时明确skip，不下载／分发私有参考。

首两次测试收集分别因重复import和在describe内设置worker级launchOptions失败，记录保留；类型检查也捕到重复import。首个完整76项批次75通过，原生FBO／React读回均零差，但DOM截图因旧fixture的root位于(16,16)失败；为一比一对照将该用例宿主设为(0,0)后单项复验通过，原失败未覆盖。最终批次与包身份另记本目录收据，不把这些执行合并成一轮绿灯。

## 最终具名批次与可发布包

- `.cache/credits-tiled-source-01/browser-05.json`：图像层、合成层、模型和实体四份完整spec共76/76 PASS，0 skip / flaky，含源声明生成整背景及真实React DOM对照。
- 独立复核随后发现 `1e-300 / 1e30` 下溢为0列的空网格漏洞。现明确拒绝非空源尺寸产生0列／0行；`guard-06.json` 在最终guard上5/5 PASS，覆盖源几何、预算、两条React平铺路径及同一原生整背景。76项批次是guard前阶段，不合并冒充最终81项单轮。
- `demo-04.json`：完整公开Credits展示10/10 PASS，含实际统一Combobox、两种tile尺寸、字体、控制与窄屏。先前 `demo-02.json` 为9PASS／1FAIL：并发CSS图片与GPU fetch使原检查只读到首个空响应体。新检查保留各实际响应的status／resource type／长度／hash，要求有非空实际响应，并验证所有非空响应字节相同，没有重新下载或用期望hash选响应。早期失败保留；专门复验 `demo-03.json` 为2/2 PASS。
- `built-demo-01.json`：实际生产构建的平铺切换与原图字节2/2 PASS。此轮是生产展示页；不把它写成完整10项生产回归。测试收集阶段的JSON import attribute错误也保留在 `demo-01.log`。
- `npm run verify:package` 的 `package-02.log` PASS，实际React18.3.1／19.3.1的全公开API／SSR／类型／资源／许可及既有family门禁均通过。guard前的package-01也另留，不冒充最后产物。
- `installed-browser-01/RESULT.json`：两个实际npm安装peer分别通过公开源声明→完整FBO及真实React DOM的3,603,140像素RGBA零差，以及image-only GPU与React重复尺寸变更。各浏览器bundle由已安装 `mcbeui` 构建，无源别名；不是默认Vite开发／生产消费矩阵。
- 独立安装包复验 `.cache/credits-tiled-package-independent-01/RESULT.json`：每peer26项CPU／SSR检查、7项严格类型负例，223项导出；先生成公开布局再比较冻结候选，全部VB／IB原字节一致。非法策略、尺寸、互斥nineSlice、单mesh／合计预算与下溢均拒绝。两组件和image／sprite声明SSR均无IO、警告、回调、ref调用或源属性泄漏。
- 独立源码及整DOM截图复验 `.cache/credits-tiled-independent-03/PUBLIC-TILING-REVIEW-02.json`：SHA256 `98991369177ed53869c78ab783527cb8023fbedb7d5db168192a2cc714bd33c8`。重新解码完整DOM PNG与原始footprint，RGBA零差；producer的FBO／live指标与独立PNG比较分别记录，不假装独立agent重新运行了浏览器。

最终受检功能tar为 `.cache/credits-tiled-source-01/functional-candidate-02/mcbeui-0.1.0.tgz`，SHA256 `6d1bd84b59aa9d0698c143951407621d219488e3cfef18b41d27e7cb59c1d014`。ESM SHA256 `0600df2f28815e856d7c402e3af02728145bfd8813952eef6fa5f9f892ec3326`，DTS `398f125a735d071b59d3129547b351f54716651addd8864b62171971565b5732`，均与两实际安装包一致。仅文档终版tar的非文档字节一致性另存 `final-documentation-pack/IDENTITY.json`，不覆盖功能tar。组件数仍205／运行时值223，覆盖分类没有增加。

本轮未打开Computer Use或重新采集Minecraft／PIX。所有浏览器在完成／失败路径关闭；root自有源5436和生产预览5437的关闭身份记入 `SERVICES.json`，用户4173不在操作范围。
