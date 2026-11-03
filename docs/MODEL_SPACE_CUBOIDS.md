# 原始模型坐标、逐面UV和薄平面

`createGuiCuboidModel` 可选支持实际模型的负坐标、超出0…16的坐标、指定面以及逐面UV角点。该扩展阶段未新增组件或运行时导出，交付时为268组件、6数据、13函数，共287个值；后续新增的[共用校准数据](CLASSIC_MODEL_CALIBRATION.md)独立于本构造选项。

省略新选项时继续使用原0…16方块约定、六面顺序、纹理键、UV与颜色。十二组从 `5e950fc` 冻结的旧模型／打包布局输出逐字节相同；旧GUI4／GUI5有限原生模型对照也已重新执行。

```ts
import {createGuiCuboidModel} from 'mcbeui';
import type {GuiModelItem} from 'mcbeui';

const model = createGuiCuboidModel([-8, .125, -11], [8, .125, -8], {
  coordinateSpace: 'model',
  faces: ['up'],
  textures: {up: 'all'},
  uvs: {up: [[0,48], [16,48], [16,45], [0,45]]},
});

const item: GuiModelItem = {
  model,
  projection: {
    yaw: 45, pitch: 30, scale: .625, offset: [0,0],
    originQuantization: 'none',
  },
  textures: {all: '/my-authorized-straw-bed.png'},
  textureSizes: {all: [64,64]},
};
```

该例是原始床尾的一片平面与显式宿主观察角度。将item放入现有ItemSlot／工作站的物品模型，或作为GuiLayer的model命令；字体、GUI原点、scissor、贴图provider与投影仍由宿主提供。

## 选项与校验

| 字段 | 合同 |
| --- | --- |
| `coordinateSpace` | 默认`block`，保留`0 <= min < max <= 16`；可选`model`允许有限float32坐标及一个收缩为零的轴 |
| `faces` | 可选六个规范面名的子集；无重复、未知名或稀疏项；输出保持既有up／east／south／down／west／north顺序；空数组产生空mesh |
| `uvs` | 按面给出四个明确角点，顺序对应该面的vertices；使用原始纹理的像素坐标，允许旋转／翻转后的角点排列 |

model模式要求每个输出面都有显式UV，避免将0…16方块UV公式偷偷套到任意模型坐标上。坐标各轴满足min≤max且至少两个轴严格为正；薄平面只允许输出垂直于收缩轴的面，拒绝线／点及退化边面。默认block模式仍拒绝零厚度。

UV声明即使对应面未输出，也检查面名、四角形状、有限数和非负值。输出复制UV角点，不保留调用者可变数组；实际纹理维度与可见面的UV上界仍由`layoutGuiModel`检查。颜色、原图、布局量化和shader保持既有合同。

## 三份原始模型预览

入口在 `/#gui-layer` 的 **Original geometry models**，展开时才创建canvas，关闭后释放。可选择small／large shelf mushroom及straw bed foot：共八个原始cube、35个显式面，含三个零高度双面平面、缺面、负uv_size与180度UV旋转。

`scripts/prepare-model-source-examples.py` 从固定官方ZIP `v1.26.60.5` 提取三份完整geo JSON、三张完整PNG与原许可，字节未经裁切／缩放／重编码。身份见 [清单](model-source-examples.json)。两种蘑菇PNG为32²、床纹理64²，geometry声明的UV空间均为16²；示例显式转换UV到原PNG像素坐标。

示例适配器仅处理这八个轴对齐cube。它按所引用的[Blockbench固定源码](https://github.com/JannisX11/blockbench/tree/ec0b2827104d0799c153bfb5f867579c0c44652f/js)约定处理X镜像、上下UV及角点映射，拒绝未支持的骨骼／cube变换，没有把它包装成通用Bedrock几何／动画解析器。原始JSON中的item_display_transforms保留作资料，不自动套用。

官方[geometry schema](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/geometry.v1.21.0?view=minecraft-bedrock-stable)列有gui.fit_to_frame；它不足以证明原版玻璃板的精确自动缩放公式。本轮未从截图拟合1.2缩放，也未改变玻璃板默认模型。此预览不是新床／蘑菇在原版物品栏中的像素资格证明。

```powershell
python scripts/prepare-model-source-examples.py --check
node --test tests/gui-model-source.node.test.mjs
```

五项Node组检查通过，含十二个旧输出控制、模型坐标／UV复制／缺面、薄平面、非法与inactive声明、完整原始资源。最终源浏览器22项通过、0跳过：新plane完整函数／live／mounted／DOM目标、原有模型生命周期／图集及四项指定NVIDIA D3D11原生profile、三种展示viewport。原生profile仅重画既有受限场景中的模型，不将其before背景算成新完成的整页GUI。

功能包 `modelspace20261103-02` 已通过实际React18.3.1／19.3.1的SSR、声明、三条新增负类型及既有资源／字体／许可合同。四个实际安装Vite开发／生产场景通过，八对完整canvas画面共147,840像素逐RGBA相同，实际为Chromium156／SwiftShader；其中合成plane另有独立完整RGBA期望。三张真实输入Blob在四场景均核对原PNG字节；HTTP空body不替代消费身份，未补GET挑选结果。所有canvas／refs、浏览器与矩阵服务结束时释放。

实际4173生产页的桌面、Pixel7及320px三项通过，且canvas未被单轴挤压。最初production失败只是测试误认Vite哈希文件名，最初安装矩阵仅依靠HTTP响应名称与body观察，无法证明全部实际消费的资源；修正为构建URL合同及真实decode Blob核验，原失败保留。首轮另外四项在软件后端被NVIDIA守卫拒绝，一项透明截图被默认白底合成；最终显式请求规定后端并保留透明截图，未修改原图、shader、期望RGBA或阈值。

证据在 `.cache/model-space-qa-20261103-01/`。组件数量不变，完整字体／模型投影／默认布局及全游戏pixel-perfect目标继续进行。
