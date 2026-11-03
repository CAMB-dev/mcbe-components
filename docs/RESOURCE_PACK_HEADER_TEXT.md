# 资源包标题原始字体计数

`ResourcePackSection.headerTextProfile`把实际`collection.count`交给独立TrueType图层，使用原始图集矩形、字形偏移、尺寸与advance。`ResourcePackManager.headerTextProfiles`接受`selected`／`available`／`realms`／`unowned`四类独立配置。没有新增公共组件或运行时函数，仍为268组件＋8数据＋14函数＝290运行时值。

未配置时保留原CSS文字。配置后以源advance确定计数宽度，用一个裁切画布绘制计数；普通标题、图标、按钮、列表与操作请求仍由原组件负责。它没有把整页Settings切换成GPU绘制。

```tsx
import {ResourcePackSection} from 'mcbeui';
import type {ResourcePackHeaderTextProfile} from 'mcbeui';
import 'mcbeui/resource-packs.css';

const countProfile: ResourcePackHeaderTextProfile = {
  frame: {width:1200,height:900,guiScale:2},
  font: yourPreparedTrueTypeFont,
  origin: [160.25,60],
  projectionScale: 1.5,
  paintOffset: [0,-2],
};
<ResourcePackSection kind="unowned" profile="global"
  width={140} scale={2} title="Resources" titleVisible
  expanded={false} noPacks viewMoreLabel="More"
  collection={{capacity:0,count:'12',items:[]}}
  headerTextProfile={countProfile}/>
```

配置中的`origin`是宿主解析后的全局GUI绘制原点；`paintOffset`是它相对计数控件左上角的局部GUI偏移。这两项有不同职责，产品不会读取DOM矩形反推原生位置。`frame.guiScale`必须等于Section的`scale`。原图像／字形网格需要一对一的呈现比例；CSS zoom、滚动中的分数位移或任意缩放不继承本阶段资格。

`font`、`projectionScale`、`originQuantization`、`sampling`、`tint`、`hudOpacity`、可选`shadow`与物理`scissor`沿用[TrueType路径](TRUETYPE_TEXT.md)。`color`指定普通及锁定颜色，默认RGBA `[76,76,76,255]`；`activeColor`指定悬停／键盘焦点／按下颜色，默认白色。按下状态将源原点下移一个GUI单位，并抵消父按钮已经执行的呈现位移，避免移动两次。阴影默认关闭。

`renderKey`接受字符串或有限数字，改变后可重试失败请求／丢失的context。帧、已使用字形、两种颜色与paintOffset先做纯校验，无效配置不获取字体页。字体缓存准备见[原始TTF生成工具](CLASSIC_TRUETYPE_CACHE.md)的`--gui-font`，原始TTF、生成图集与配置均由调用方托管，不随npm库分发。

普通文本始终保留为一个语义计数。只有当前按钮状态的画布准备好后才通过opacity隐藏该文字的视觉显示，辅助技术仍能读到它；装饰画布为`aria-hidden`。加载失败、context失败、无效配置或状态暂不匹配时显示普通文字。强制颜色模式显示文字并隐藏装饰层。标题绑定不可见时不创建计数画布。宽度采用显式字体advance；既有计数控件高度、50%最大宽度与溢出裁剪继续适用。

展示入口：`/#resource-packs`的独立标题示例，打开“启用原版标题计数”。需要本地准备好Classic缓存，缺失时开关禁用。它可以与“启用标题图标采样”同时使用。

## 像素与合成范围

接入前先比较同一正常源数字的八个完整画面：两个实际后端分别执行不透明完整目标、透明完整目标、透明裁切与不透明裁切。全程使用普通字体输入／HOST原点；原生before只作比较背景，捕获文字顶点和矩阵不作为绘制输入。

| 实际后端 | 不透明完整／裁切 | 透明完整／裁切 |
| --- | ---: | ---: |
| NVIDIA RTX3050／ANGLE D3D11 | 均RGBA0 | 均RGBA0 |
| SwiftShader Vulkan | 均2点灰度差1 | 均21点灰度差1 |

每幅均比较全部3,603,140个RGBA像素，alpha无差异。透明叠加在软件后端的额外残差保留；本次不改变shader或取样规则来拟合它。裁切没有改变这两组完整输出结果。

实际`ResourcePackSection`另通过原始Classic字体、`collection.count:'0'`、明确HOST原点与paintOffset、透明小画布及真实DOM截图验证：NVIDIA下完整3,603,140像素RGBA零差。该测试单独将控件位置注册到已知原版点，并只显示真实计数画布；原生before背景仍为复制。它证明组件的计数接入，不证明整页布局、标题字体、所有数字／字符串或软件后端原生零差。

普通行为检查覆盖源advance宽度、悬停／按下／键盘操作／锁定颜色、只移动一次、已用度量原地更新、计数字符串更新、请求失败／无效声明回退、零错误字体IO、四类Manager映射、强制颜色和卸载。首轮新计数4项通过；完整回归首次56项通过、2项失败：旧展示测试用无名称checkbox定位器匹配到新增开关，及原版测试点位于320高测试容器外而被裁切。后续按开关名称定位并在条件宿主中暴露该坐标，图标与计数12项通过；没有改变生产位置、原图、shader或预期PNG。

最终同一源回归批次58／58通过，包含新计数、旧图标及资源包原有行为。源展示与生产展示各在桌面、Pixel7和320px通过3／3。实际React18.3.1／19.3.1功能包检查通过，含新公开profile的正类型及两个负类型合同；功能包SHA256为`9763c9c6659fc21652eba86d0d0862a08b88c93ce828cf644d58402e80e69787`，7,330,877字节。

实际安装包的四种默认Vite开发／生产消费场景也通过，没有源码alias或优化器替代。使用真实Section、GUI2、项目自有测试图集的“A”两种度量及原版图集的“0／10”；16张完整计数画布截图组成8对开发／生产比较，全部1,566个RGBA像素零差，独立读回验证测试图集的76字节颜色。每次挂载／卸载释放真实Section ref及计数canvas，实际解码Blob对应90字节自有PNG或45,691字节原版源生成图集。四场景均为SwiftShader；这些小画布比较不是完整Header／Manager／原生整页验收。

首轮安装浏览器脚本复用旧用例名称，把两个原版计数误标成GUI4／5，实际输入始终GUI2。保留该报告；第二轮改用计数名称并从真实DOM读取GUI scale与计数，明确核对GUI2／“0／10”后四场景再次通过。没有把名称当作比例证据。源码shader和TrueType几何均未修改，另用独立标准库PNG解码复核实际Section原版对照的全部RGBA零差。

证据位于`.cache/header-text-composition-20261103-01/`中的`run01/RESULT.json`、`browser01/02/03/04.json`、`package01.log`、`installed01/02/RESULT.json`、`demo-source01.json`、`demo-built01.json`及`INDEPENDENT-NATIVE-AUDIT.json`。沿用保存的原版帧，没有打开Computer Use、Minecraft或PIX。完整原生字体排版、其他比例／语言／状态与整套GUI验收继续进行。
