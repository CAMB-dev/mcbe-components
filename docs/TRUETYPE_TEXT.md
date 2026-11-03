# 可变字形TrueType图层

`GuiLayer`新增`kind:'truetype'`，使用完整方形图集与独立字形矩形、偏移、绘制尺寸和advance。纯函数`layoutGuiTrueTypeText`可在无DOM环境计算顶点与批次。它和既有`kind:'text'`的固定字格路径分开，后者的128／256页与字格采样约束保持不变。

```tsx
import {GuiLayer, layoutGuiTrueTypeText} from 'mcbeui';
import type {GuiTrueTypeFont, GuiLayerCommand} from 'mcbeui';

// Load the descriptor from your own prepared assets. Resolve relative page URLs
// against the descriptor URL; the renderer does not fetch or resolve font JSON.
const font: GuiTrueTypeFont = {
  ...yourPreparedFont,
  pages: yourPreparedFont.pages.map(page => new URL(page, descriptorURL).href),
};
const command: GuiLayerCommand = {
  kind: 'truetype', text: 'Minecraft 0123', font,
  origin: [4, 4], projectionScale: 1.5,
  color: [255, 255, 255, 255], sampling: 'point',
  shadow: {offset: [1, 1], tint: [0, 0, 0, 1]},
};
<GuiLayer width={640} height={112} guiScale={4}
  rasterOrigin="top-left" commands={[command]}
  label="Minecraft text" />;
const geometry = layoutGuiTrueTypeText({width:640,height:112,guiScale:4,...command});
```

原始字体可通过[Classic Ten准备工具](CLASSIC_TRUETYPE_CACHE.md)的`--gui-font`选项生成配置。原始TTF、生成图集与本地配置不随npm库分发。`#gui-layer`中展开“Original Classic TrueType atlas”可预览；未准备本地缓存时显示准备提示。

## 字体与绘制合同

- `pages`为1…256个完整图集URL，`pageSizes`逐页声明1…4096的方形物理尺寸。React可用`pages: Map<number, URL | PixelTexture>`覆盖使用的页；函数接口`renderGuiLayer`需要显式解码后的页Map。
- `glyphs`按Unicode字符键索引。每字形提供`page`、像素单位`atlasRect:[x,y,width,height]`、局部单位`offset:[x,y]`、局部绘制`size:[width,height]`和`advance`。源矩形与绘制尺寸相互独立。零尺寸字形只移动笔位置，不获取纹理；透明但非零的原始缓存单元照常保留。
- `origin`为全局GUI单位，默认保留float32。`originQuantization:'physical-floor'`为显式替代策略。`projectionScale`只缩放局部字形与排版尺寸，不缩放全局origin；局部位置先按half打包，再乘投影列。阴影offset也使用全局GUI单位。
- `color`为RGBA四字节；`tint`与`hudOpacity`使用0…1。独立shader直接计算`textureRGBA × vertexColor × tint`，然后乘HUD alpha。保留源RGBA四通道，不把覆盖图集改成白色RGB，不套用位图字格的clamp／smooth规则。默认POINT，bilinear可显式选择，后者没有原生资格声明。
- CR／CRLF归一化换行，行距由`lineHeight`给出。所有阴影批次先绘制，再绘制正文；每个阶段按页号排序，页内保留字符顺序。跨页重叠字形因此具有明确的页批次顺序。
- 不做浏览器字体栅格化、整形、自动换行、fallback或编辑光标布局。缺少已使用字形会明确报错。每命令最多4096个Unicode字符及8192个UTF16单元；沿用GuiLayer总顶点、纹理与帧预算。
- React沿用统一的资源快照、异步取消、解码、context与卸载边界；等价输入保留画布，已用度量或策略改变会重新绘制。SSR只输出待绘制语义，不获取资源。

Classic生成配置将原始packed offsets／advance按8转换，baseline为6.5；`lineHeight:8`是该示例的名义行距，不代表恢复原生多行leading。原生默认宿主绑定、完整字体分页、其他语言与跨GPU精确性仍待验证。

## 当前验证范围

三个源数字的12个本地half顶点与UV和保存原版一致。单数字使用普通HOST origin`[423.6,151.5]`及projectionScale1.5，普通MVP的X平移仍差1ULP；没有注入捕获矩阵或修补顶点。

公开函数、live画布、实际React画布与整幅DOM截图在NVIDIA RTX3050／ANGLE D3D11下与原版完整3,603,140像素RGBA零差；SwiftShader下仍差2个灰度像素，alpha零差。绘制使用原生before画面作背景，实际新增的是一个源字形，不能把复制的背景计作完整GUI复刻。

几何守卫、混排、覆盖通道、顶点alpha、阴影、已用度量更新、策略更新、无效输入前置拒绝与卸载有独立测试。首次软件回归中既有GUI5位图标签不满足原生零差，D3D11下原用例通过；新TrueType路径没有修改旧位图shader。第一次双后端测试的软件分支继承了测试器D3D11启动参数，后端身份检查正确失败；清空该分支参数后，实际SwiftShader结果如上。没有替换原图、容差或预期。

源码几何守卫5／5、准备工具守卫7／7；D3D11组合批次中27项通过，1项因软件后端启动参数继承而失败，修正后单独两后端2／2通过。旧位图、Credits背景和CJK原生用例在该D3D11组合批次通过，没有把分开的执行拼成一轮全套成功。

实际功能包SHA256为`a621716ab6812977515ab68dba477f814fc1dfa6cb83b189122d8d8c2522faaf`，7,326,112字节。它经过实际React18.3.1／19.3.1的完整已安装包检查，含新纯函数／SSR及三个新负类型合同；四种默认Vite开发／生产消费场景通过，未加源码alias或优化器替代。每种场景检查原始覆盖通道、度量变化、原版图集、比例变化与ref释放；八对开发／生产帧比较全部287,744个RGBA像素零差。四种消费使用SwiftShader，不算新增原生GPU资格。

源展示与生产展示分别在桌面、Pixel7和320px各3／3通过，使用实际准备好的原始缓存，覆盖编辑、不支持字符提示、比例与阴影切换和关闭释放。首轮包检查因示例误写不存在的Input导出失败，第二轮因清单仍写289失败；修正后第三轮完整检查通过。源码准备工具保留原默认三个文件字节不变，`--gui-font --check-only`复算第四个配置也完全一致。原字体、生成图集、编译器与捕获未进入npm。

证据：`.cache/truetype-text-layer-20261103-01/`中的`browser02/03/04.json`、`package01/02/03.log`、`installed01/RESULT.json`、`demo-source01.json`及`demo-built01.json`。原shader源码前缀LF SHA256仍为`e4b5552469d18349d9e4ddc420a66f13b1a66c503b1cfc7af4ba95ef23573238`。本阶段使用保存的原版帧，没有打开Computer Use、Minecraft或PIX。

## 扩展原字库的字符覆盖

准备工具现可用`--all-supported`或`--characters`／`--text-file`生成多页`GuiTrueTypeFont`，无需更换本节的公共API或shader。固定Classic Ten原字体551个实际字符映射均可生成，较基础缓存新增370字符，包含原字体已有的Latin扩展、希腊／西里尔字符和部分标点／货币符号。扩展描述省略缺字占位；其他字体／CJK／emoji仍需宿主提供合适的字库，不会自动伪造或替换。默认256记录的旧缓存继续保持字节。用法、宿主页分组及原生边界见[准备工具](CLASSIC_TRUETYPE_CACHE.md#原字体的其他字符)和[验证](CLASSIC_TRUETYPE_UNICODE_QA.md)。
