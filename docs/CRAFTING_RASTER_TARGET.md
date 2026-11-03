# 合成台光栅目标

指定GUI4／5建筑页现在可以使用正常源输入绘制完整2570×1402目标，并与保存的原生参考逐RGBA字节一致。需要显式使用顶部原点与完整物理目标分配；默认裁切分配保持原行为。

```tsx
const imageRender: CraftingScreenImageRenderProfile = {
  frame: {
    width: 2570,
    height: 1402,
    guiScale: 4,
    rasterOrigin: 'top-left',
  },
  rasterBounds: 'frame',
  imagePhysicalPrecision: 'float32',
  itemImages: true,
  itemModels: true,
  text: yourExplicitOriginalFontRoles,
};

<CraftingScreen imageRender={imageRender} recipeBook={recipeBook}
  crafting={crafting} />
```

`frame.rasterOrigin`转发给已有`GuiLayer`：省略或`'webgl'`保留历史原点，`'top-left'`使用顶部原点。`rasterBounds`的默认值为`'window'`，只分配普通源布局计算出的物理裁切区；`'frame'`分配整个`frame.width × frame.height`目标。

完整目标只改变canvas分配范围及其在原窗口内的平移。语义根节点、输入、按钮、可见绘制窗口和宿主占位不扩大；窗口仍按正常内容边界裁切。切回`'window'`可释放较大的canvas并恢复原尺寸。非法枚举进入现有错误／CSS回退，不分配GPU目标。

2570×1402的每个RGBA8平面约13.7MiB；实际还需canvas、上传资源及驱动存储。这是显式的内存取舍，不是自动启用的默认策略。`GrindstoneImageRenderProfile`和`AnvilImageRenderProfile`共享这些选项，但本阶段的原生零差结论仅覆盖下面的合成台场景。

## 原生验证范围

实际NVIDIA RTX3050／ANGLE D3D11、Chromium156、DPR1；每组评分全部3,603,140个RGBA像素，不使用mask、epsilon或重采样。

| 指定场景 | 默认窗口／WebGL | 完整目标／top-left |
| --- | ---: | ---: |
| GUI4建筑配方页 | 160 | 0 |
| GUI5建筑配方页 | 5 | 0 |
| GUI4收起配方书 | 前阶段0 | 本阶段0 |
| GUI4空搜索页 | 前阶段160 | 本阶段0 |

前两组默认基线在本阶段逐字节重现后才执行新模式。独立Python标准库解码确认两建筑页只改变原本错误的160／5点，全部变精确，没有新增误差；语义绘制窗口位置与尺寸也相同。后两组当前正常输入另行完整执行，不把前阶段成绩重计为本阶段默认基线。

模型仍使用显式[共用方块校准](CLASSIC_MODEL_CALIBRATION.md)与[玻璃板校准](CLASSIC_PANE_CALIBRATION.md)、完整原始图像和明确的十四图图集位置。文字仍需调用方的原版页、度量与具名采样profile。有限参考参数尚不等于恢复通用引擎算法，页面零差也不认证其他状态、语言、字体、DPR或GPU。

## 排除与实现验证

最小两图场景可用命令重现旧160／5点；强制CPU分步舍入和合并舍入均未改变结果。只切换`top-left`可令最小场景零差，但组件裁切目标的GUI4仍差26点；使用完整目标后四个具名页面均零差。没有修改shader、UV、纹理、模型、字体、原生预期或逐点修补。此结果支持显式光栅策略，不声称已测得唯一机器指令或插值实现。

实际组件测试先在旧实现上因canvas仍为655×381而失败；实现后23项合成台交互合同通过，包括切换分配时保留真实搜索输入和根节点、根布局及可见绘制窗口不变、切回旧分配、unmount释放、非法选项回退。

功能包`rasterorigin20261103-02`实际React18.3.1／19.3.1的SSR、声明及资源检查通过，新增两个非法枚举负类型。首次包检查因测试漏写类型导入而失败，保留记录后修正。四种真实安装默认Vite消费场景通过，三种光栅状态的六对完整800×600画面、共2,880,000个RGBA像素开发／生产一致。该浏览器矩阵实际为SwiftShader，不代替上述NVIDIA原生验证。

本地`#crafting-layer`提供“Crafting raster allocation”切换。完整目标为该演示的初始选择，库组件默认策略未改。证据目录`.cache/magnifier-clip-arithmetic-20261103-01/`保留全部失败、候选、输入SHA及六个产品整页结果。本阶段没有启动Computer Use、Minecraft或PIX，也没有采集新原生帧。

最终源展示三项和4173生产展示三项分别通过桌面、Pixel7和320px；验证分配切换、GUI2／4／5与同一语义根节点。冷加载完整展示页约45～52秒／用例，测试等待真实ready后再检查尺寸。初次源展示三项因loading失败，第二轮为1通过／2失败，期间更新已被展示页导入的组件目录触发过重载；最终冻结依赖后3通过。旧报告保留，不把重载认作所有等待失败的唯一根因，也没有放宽像素比较规则。

功能tar的SHA256为`e2cf5fee467062c180c8f85f2e2317dc563c02a8c5aba958a7ffe3192af151e7`，7,309,292字节。最终文档包另核对与这份功能包的891个运行时／package／许可成员一致；未发布npm注册表。
