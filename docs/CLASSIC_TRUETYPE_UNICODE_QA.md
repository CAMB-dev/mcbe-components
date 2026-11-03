# Classic Ten字符覆盖扩展验证

阶段：`.cache/classic-truetype-unicode-20261103-01`。本阶段扩展**源字体生成工具和可选预览**，不改变库运行时、公共类型、shader、原字体、既有原生截图或像素阈值。仍为275组件／297运行时值；这不是Minecraft全部文字或GUI完成的声明。

## 来源与默认兼容性

固定原始TTF为127,504字节，SHA256 `fc34c190dbfae5fe2f27adb45a93425f502388191854a6a0c2ac2f7c594a688f`，stb v1.26头文件身份仍为`ecd30b05e0dd4fea3a13c26810dd9e1992dc379049482c393d5a19e6b5090aab`。仅先验证／复制的原始字体进入C解析器，不接收任意未验证TTF，也不下载或安装字体／编译器。

实际C枚举551个映射码点；基础0–255内181个，新范围370个。默认四文件`--gui-font --check-only`完整字节通过，原三个基础产物也在每份扩展输出中保持原字节。原基础alpha完整SHA仍为`77bb13ce5a27ed58642ad731c2551bbd15cc446a3460200d13d40d45b0ba8b82`；其之前R28原生图集资格不扩展到新六页。

扩展输出七张完整1024²PNG／551条GUI记录。它省略75个缺字占位，保留真实源字体的别名／空白；不把551记录称作551种不同可见轮廓。新页是排序64字符组的宿主缓存策略，不读取捕获图集位置，不重画字形或用.notdef替代请求缺字。默认旧模式未改变。baseline6.5／名义行距8仍为已有有限profile，原生其他语言布局／整形／fallback未知。

## 生成器与加载器

实际原字体／TinyCC运行Python最终15项PASS、0skip：旧7项及新8项，包含字面去重排序、控制符／surrogate／预算、禁止覆盖基础记录、页编号、描述哈希、缺字拒绝且无输出、四字符子集、全字库两次生成逐文件相同、check-only保mtime、CLI累计文件预算前置拒绝，以及七张PNG独立解码后四通道和原始C alpha摘要一致。实际`--text-file`另通过四字符／两页子集，基础三文件仍相同。

加载器Node六项PASS、0skip，独立严格NodeNext类型检查PASS，结果保存在阶段收据。它检查固定基础三文件、扩展描述和完整PNG哈希、路径／尺寸／页码点集合，未准备缓存时明确不可用，描述或图片改变时拒绝。额外独立调用实际已安装公共`layoutGuiTrueTypeText`，551个生成映射全部接受，550个run／2,200顶点，无错误；这不是native布局比较。

## 实际预览及素材路径

源浏览器source04桌面／Pixel7／320px共6/6PASS：三个旧预览回归和三个新扩展预览，均实际使用准备的原始字库。新分支切换覆盖551／7页提示、Ā／Ω／Ж／€跨页、阴影、缺字拒绝、回旧缓存及关闭释放。

每个尺寸实际收到12次扩展Blob解码输入，涵盖0001／0003／0004／0006四页；全部长度／SHA与生成的完整PNG一致，且premultiplyAlpha／colorSpaceConversion／imageOrientation均为none。记录来自正常fetch→Response.blob→createImageBitmap链，原Blob和选项继续传给原解码器，没有额外GET、替换纹理或预期哈希筛选。独立`SOURCE-DECODER-AUDIT.json`重核四个必需页和每次输入。

首source01三旧PASS／三新FAIL是无名称status定位器同时匹配output和缺字提示；改为明确提示定位。source02三旧PASS／三新FAIL是把Vite的PNG-URL JavaScript模块当成原PNG。source03同样3/3失败：完整raw-PNG响应在Playwright网络接口观测到空body。保留全部模块／空传输记录；source04新增实际生产者Blob观察后获得真实PNG字节身份，未改生产图像、采样、文字或容差。

## 已安装消费与打包

installed01实际React18.3.1／19.3.1、默认Vite开发／生产四组合PASS，无source alias或优化器替代。消费的是已测功能包的同一运行时ESM `f16ee3be9e02c8fccfe4f46dedb1b29bad71a2598ef297429ec10208c5da05a5`，原字体数据由宿主私有目录提供。四种画面包括GUI4／5混排、全部七页样本及阴影切换。16张完整640×112图组成8对开发／生产比较，573,440 RGBA像素相同；全部七张源图均实际进入解码器且字节相同，缺字纯布局拒绝不增加IO，unmount后canvas／ref释放，错误为空。实际后端记录在RESULT，不据此称新Unicode字形原生零差。

最终构建和生产展示、非文档包成员身份由阶段FINAL补充索引。运行时代码／DTS与上一已测功能包保持完整字节身份；没有把旧全库包门禁宣称为本阶段重跑。原始TTF和新增生成页只在忽略缓存／本地演示，均不进入Git或npm。未开启Computer Use、Minecraft或PIX；保存的Book闲置整帧资格已查明，不以重复修它们代替当前字库工作。原生输入编辑、字体路由、多语言排版、其他GUI／状态／比例与全目标仍未完成。

最终`npm run build`通过，生产built01桌面／Pixel7／320px六项全部PASS、0skip/flaky，包含旧预览和新增扩展分支；每个新增分支的原字体可用性均实际为true。桌面新增字形PNG已目视检查。源source04六项与built01六项是两个独立批次，不是一次全库GUI认证。运行时ESM及DTS分别仍为`f16ee3be9e02c8fccfe4f46dedb1b29bad71a2598ef297429ec10208c5da05a5`／`9db7dfa6af022faf6827c4a1b810738fdc5de0ff6af0167ef681433440b34cba`，与上一功能包相同。

最终文档包逐成员比较上一已测功能package03：899个非文档成员全部相同，包含manifest、ESM、DTS、CSS、所有字体／素材／许可／notices。原始TTF、七张生成图集的完整字节和inline编码均不进入该包。库包级门禁和前一阶段两peer完整合同以字节身份保持，不宣称本阶段重跑旧全库SSR／所有组件像素。只有生成器、工具加载器、字体数据及主预览进行了本阶段新增验证。全部自有5545–5548服务关闭，用户4173预览保留。
