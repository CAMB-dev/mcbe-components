# 玻璃板模型的显式参考校准

`classicPaneModelCalibration`提供同一组普通cuboid参数、面材质／UV、投影和参考图集位置。它是类别级的有限校准配置，默认组件行为不变。

```ts
import {classicPaneModelCalibration as pane, createGuiCuboidModel} from 'mcbeui';
import type {GuiModelItem} from 'mcbeui';

const item: GuiModelItem = {
  model: createGuiCuboidModel(pane.min, pane.max, pane.options),
  projection: pane.projection,
  textureSizes: {edge: [16,16], body: [16,16]},
  textures: {
    edge: '/my-authorized-glass-pane-top.png',
    body: '/my-authorized-glass.png',
  },
};
```

这是独立PNG接入例。指定原生参考的零差验证使用完整原图组成的图集；独立PNG的UNORM16相位及CLAMP边界不同，不自动继承同样结果。[完整图集示例源码](https://github.com/CAMB-dev/mcbe-components/blob/main/demo/pane-calibration-example.tsx)使用公开配置和两张未经裁切的原PNG，没有捕获atlas像素。

`min/max`为`[0,0,7]..[16,16,9]`。`options`包含边缘／主体绑定、保留纹理alpha的源面色和显式UV；应整体传给构造器。边缘为宽2的U窄条`3.8..5.8`，主体使用完整16²纹理。不能把本管线的源面色alpha0理解为CSS完全透明，也不宜仅复制投影而丢失该透明度合同。

`projection`固定yaw45°、pitch30°、scale0.75及校准平移；两个GUI比例共用同一个对象。`referenceAtlas`记录1024×512中body`[816,224]`、edge`[832,224]`的有限放置元数据，纹理字节由调用者提供。对象、UV角点、颜色、投影和放置数组均冻结且类型只读。

## 资格范围

已验证Bedrock 1.26.6005.0、Classic、2570×1402、GUI4／5、DPR1、NVIDIA RTX3050／ANGLE D3D11下的红玻璃板三个可见面。两份建筑页中玻璃板单元均为完整RGBA0；同场景其余九个配方模型也保持零差。整页仍有放大镜160／5点残差，没有把它们掩掉。

投影采用固定1.2类级缩放假设，平移为两种比例既存half约束交集的中点；UV窄条是有限参考规则。参数于新GPU评分前冻结，不是恢复了引擎的自动fit-to-frame／相机／UV算法。配置生成普通六面cuboid；只有up／east／south有原生证据，反向面为对称的常规作者定义。其他颜色、朝向、平台、DPR和背景尚不在此资格内。

`/#gui-layer`展开 **Calibrated glass pane** 可预览两种GUI比例，关闭后释放canvas。原PNG及许可通过`python scripts/prepare-pane-calibration-assets.py --check`核对完整字节，demo资源不进入npm库。当前268组件＋8数据＋13函数＝289运行时值。

详见[验证记录](CLASSIC_PANE_CALIBRATION_QA.md)。
