# Classic方块模型的显式参考校准

`classicBlockModelCalibration`是一份只读的`GuiModelProjection`配置。它为已有普通模型提供共用投影，不改变`createGuiCuboidModel`或任何组件的默认行为。

```ts
import {classicBlockModelCalibration, createGuiCuboidModel} from 'mcbeui';
import type {GuiModelItem} from 'mcbeui';

const item: GuiModelItem = {
  model: createGuiCuboidModel([0, 0, 0], [16, 8, 16]),
  projection: classicBlockModelCalibration,
  textures: {all: '/my-authorized-stone.png'},
  textureSizes: {all: [16, 16]},
};
```

上例展示API接入。原图集的UV量化相位与独立PNG可能不同，单独采用此投影并不使任意PNG、模型、光照或布局获得原生零差。物品的来源几何、整图／图集、面色和宿主原点仍分别提供；参考验证使用完整原图组成的显式图集。

配置为yaw45°、pitch30°、scale0.625、offset`[1+10/√2, 8.945084636506264]`，先按物理像素floor宿主原点，再投影并对GLOBAL位置作half量化。对象与offset数组均冻结，类型也只读；调用者可复制配置提供不同投影，但修改后需自行验证。

## 参数来源与范围

这是基于Bedrock 1.26.6005.0的Classic参考采集进行的**有限校准**，不是从游戏源码找到的相机常数。三个既存固定角度／比例的Y约束交集为`[8.94361006595582, 8.946559207056708]`；在新GPU比较前一次性选择其中点。只更换所有模型共用的Y平移，未进行逐物品／逐顶点补偿，没有改图、UV、shader、颜色或阈值。

已验证条件为2570×1402、DPR1、GUI4／GUI5、指定原字体及NVIDIA RTX3050／ANGLE D3D11。建筑页的九个非玻璃板模型单元在两个比例均为完整RGBA0：三个阶梯、三个半砖、两个完整方块和一个地毯。两张整页依然分别存在GUI5的1,422点和GUI4的1,078点残差，主要是玻璃板与放大镜，不能宣称整页零差。Compact固定场景仍为完整RGBA0，空筛选页保持160点差异。

旧G57的两种比例及原图集／完整原图组装路径同时保留旧参数与新校准检查。它们使用原生before背景且参与旧约束研究，是兼容性控制，不是blind holdout或新的整页认证。任意模型高度、其他相机、DPR／平台、透明玻璃板和自动fit-to-frame均不在此资格内。

`/#gui-layer`的组合附魔台示例已使用这份公开配置；普通模型接口继续接受调用者自己的投影。该阶段交付时为268组件＋7数据＋13函数＝288运行时导出，后续的[玻璃板类校准](CLASSIC_PANE_CALIBRATION.md)是另一份显式数据配置。

完整运行、独立解码、包与展示验证见[本阶段QA](CLASSIC_MODEL_CALIBRATION_QA.md)。
