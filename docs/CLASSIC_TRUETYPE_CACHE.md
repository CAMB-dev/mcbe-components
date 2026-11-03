# 从原始TTF重建Classic Ten缓存

新增源码工具`prepare-classic-truetype.py`，只用调用方持有的原始Minecraft Ten 2.001 TTF，生成固定的64像素字高、2×2过采样、1024²缓存。输出整幅1,048,576个RGBA像素与保存的原生R28图集完全一致；三个已解码数字的图集矩形也由打包器自动得到，没有输入捕获坐标或像素。

这解决了一个具名字体缓存的生成来源。现在可用可选`--gui-font`生成[独立TrueType图层](TRUETYPE_TEXT.md)的配置；现有`GuiTextFont`仍只支持固定字格。完整排版与跨后端字体认证尚未完成。

## 使用

在源码仓库运行，需要Python3.10+与使用GCC／Clang／TinyCC参数语法的C99编译器。工具不下载编译器或字体，也不安装系统字体。

```powershell
python scripts/prepare-classic-truetype.py "PATH/TO/vanilla/font/minecraft-ten.ttf" --compiler "PATH/TO/tcc.exe"
python scripts/prepare-classic-truetype.py "PATH/TO/vanilla/font/minecraft-ten.ttf" --compiler "PATH/TO/tcc.exe" --check-only

# New directory; preserves the default three files and adds gui-font.json.
python scripts/prepare-classic-truetype.py "PATH/TO/vanilla/font/minecraft-ten.ttf" --compiler "PATH/TO/tcc.exe" --gui-font --output .cache/local-fonts/classic-ten-gui64

python -m unittest discover -s tests -p classic_truetype_preparation_test.py
```

默认输出目录为`.cache/local-fonts/classic-ten-cache64`；可用`--output`指定新目录。已有目录一律拒绝覆盖。`--check-only`仍会在工作区临时目录编译、复算，但不会修改已有产物；比较全部文件字节而非只检查文件存在。临时编译产物在退出时释放。

工具只接受127,504字节、SHA256为`fc34c190dbfae5fe2f27adb45a93425f502388191854a6a0c2ac2f7c594a688f`的原始Classic TTF；HBUI Minecraft Ten v2 OTF或其他版本不会静默代替。原文件经验证后复制到临时输入，传给上游解析器的正是已核验字节。

| 文件 | 内容 |
| --- | --- |
| `atlas.png` | 原始覆盖值复制到RGBA四通道；不转成白RGB加alpha，也不反预乘 |
| `packed-chars.json` | 0…255共256条原始`stbtt_packedchar`矩形、offset、advance、offset2及源字形存在标记 |
| `font-cache.json` | 格式版本、源TTF与stb身份、参数、相对文件名及两个产物的SHA256 |
| `gui-font.json`（可选） | `GuiTrueTypeFont`的局部字形矩形／offset／size／advance；名义行距8，页URL相对该JSON |

256条记录中181条对应源字体存在的字形；75条缺失记录按上游默认复用同一个`.notdef`。空格的打包单元可能有透明滤波边缘，不应按其矩形大小推导可见宽度。原始offset／advance保留stb像素单位；工具没有伪造`GuiTextFont`的完整字格或原生Unicode fallback。

源码工具与vendored头文件只在Git仓库中提供，不进入npm运行时。原版TTF、生成字图集、编译器和捕获文件均不随库分发。独立字体身份接入见[Classic Ten](CLASSIC_TEN_FONT_QA.md)。

## 固定算法与完整图集验证

使用未经修改的[stb_truetype v1.26](https://github.com/nothings/stb/blob/d14d46f6b44456eb88beac58cba833a4135d4c89/stb_truetype.h)，固定commit为`d14d46f6b44456eb88beac58cba833a4135d4c89`；保留上游双许可。stb的[过采样说明](https://github.com/nothings/stb/blob/d14d46f6b44456eb88beac58cba833a4135d4c89/tests/oversample/README.md)解释了过采样与预滤波的关系。

候选在执行前固定为pixelHeight64、横纵oversample2、padding1、0…255字符范围、上游内置行打包器与默认缺字复用。生成器仅打开原始TTF；独立比较程序在生成后才打开原生图集和packet。没有继续搜索参数、裁切计分、epsilon或逐点修补。首个C程序仅因旧Windows CRT不支持`fopen`的`x`模式而退出9；改成二进制stdout和独占Python写入，没有改变字体参数。

生成alpha的完整SHA256为`77bb13ce5a27ed58642ad731c2551bbd15cc446a3460200d13d40d45b0ba8b82`。原生四通道均等于该alpha；独立标准库PNG解码确认全1,048,576个RGBA像素零差。工具固化该源生成结果的哈希作为编译器／算法漂移守卫；它不使用哈希生成像素。当前实际验证的编译器为Windows x64 TinyCC0.9.27，其他编译器若产生不同结果会明确失败。

两次真实工具编译输出全部文件逐字节一致；只读校验前后产物SHA及mtimeNs不变。拒绝已有目录与错误字体均非零退出且不写入目标。六项独立Python守卫检查不受信任TTF、alpha完整性、记录身份／范围／非有限数、PNG四通道与CRC、产物链接／哈希及上游许可。

## 正常度量与有限绘制探针

原始packed offset按8像素／game单位转换，baseline使用`ceil(64/(990-(-250))*990)/8 = 6.5`。三个数字“0／5／1”的全部12个本地half顶点、UV及打包矩形与原生G74／79／85一致。这只是当前正常输入的独立关系，不能推广成已恢复所有文本的baseline或advance。

对G74另做私有绘制探针，使用源生成的完整图集及本地度量、显式宿主origin`[423.6,151.5]`与projectionScale1.5。该普通构造的MVP在X平移项仍与原生相差1ULP，没有直接注入捕获矩阵。其余元素一致；这个失败不被隐藏或拟合修平。

| 实际后端 | 完整3,603,140像素的RGBA差异 |
| --- | ---: |
| NVIDIA RTX3050／ANGLE D3D11 | 0 |
| SwiftShader Vulkan | 2（灰度各差1，alpha无差异） |

两次探针完整输出SHA相同；最终后端从实际绘制context读取。探针暂时复用私有prepared图像边界，Tint等价于当前全1全局tint下的76字节颜色，并使用原生before作为背景；实际新增绘制只有一个数字，不把复制的背景算作字体或整页重建。它不是公开TrueType文字接口的验收。

后续独立TrueType接口已完成度量／顶点／shader接入及公开混排验证，见[新阶段](TRUETYPE_TEXT.md)。普通宿主排版、其他缓存范围／版本及跨后端灰度验证仍未完成。既有Unicode位图SwiftShader38点残差属于另一采样路径，不能借此宣布解决。

证据位于`.cache/classic-truetype-raster-20261103-01/`。本阶段没有打开Computer Use、游戏、PIX或采集新原生帧；沿用保存的参考。静态程序导入／字符串检查不能证明实际引擎使用哪个库，此处只宣称这个固定实现的完整产物等价。
