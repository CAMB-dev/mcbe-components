# 原始分页位图字体：可选宿主准备工具

`scripts/prepare-classic-bitmap-font.py`读取用户自己的原始`font.brarchive`，生成现有`BitmapText`／Credits字体接口可用的描述表。它不注册字体，不修改默认OFL／Classic字体，不生成WOFF或重新绘制字形。原始PNG与元数据留在忽略的`.cache/local-fonts/classic-bitmap`中，不进入Git或npm包。

## 使用

在源码仓库根目录显式提供本机文件及候选profile；没有自动安装路径或输出目录选项：

```powershell
python scripts/prepare-classic-bitmap-font.py "C:\path\to\font.brarchive" --profile cp437-paged-candidate --characters "åöó" --check-only
python scripts/prepare-classic-bitmap-font.py "C:\path\to\font.brarchive" --profile cp437-paged-candidate --characters "åöó"
```

默认包含95个可打印ASCII；上述追加得到98个不同字形、两张原始输出页。工具固定核对原始档案和三张字体页的SHA256；换游戏版本需要重新审计。`--text-file`按字面UTF-8读取，BOM、CR／LF及其他控制字符不被当作分隔符删除。无法用CP437表示的字符、非BMP、空的非空格源字格均拒绝；需要这些文字时，由宿主明确选择其他字体或fallback。

产物包括`font.json`、`provenance.json`、两份原始metadata，以及实际引用的完整PNG。每字格保留8×12及全部空行／空列，偏移为`[0,-3]`；非空格字距取原alpha右边界＋1，空格4为明确Web策略。`lineHeight:12`是源字格行政策，不是原生Credits人名之间的距离。第三原始页也核验，但当前CP437 byte范围不会引用它。

宿主必须把描述表的相对页路径解析为实际资源URL。例如Vite项目将本机准备目录放在对应相对位置后：

```tsx
import { BitmapText } from 'mcbeui';
import type { BitmapFont } from 'mcbeui';
import prepared from '../.cache/local-fonts/classic-bitmap/font.json';
import page0 from '../.cache/local-fonts/classic-bitmap/originalpages/default8.png?url';
import page1 from '../.cache/local-fonts/classic-bitmap/originalpages/default8_1.png?url';

const font: BitmapFont = { ...prepared, pages: [page0, page1] };
<BitmapText font={font} scale={2} sampling="point" shader="bitmap"
  renderer="cpu" profile="atlas-rect" layout="advance">
  {'Moss & ó'}
</BitmapText>;
```

示例针对上述98字形／两页产物；宿主使用其他准备集合时，按自己的`font.json.pages`逐项解析。原始字体图像继续遵循其上游权利和Minecraft条款，不由项目MIT代码许可重新授权。

## 候选规则与已验证边界

候选以16列、每页10个完整行、共160字格分页，使用严格CP437 byte选择页和局部格。原`default8.json`声明字高12、Y偏移−3和`ascii_extended:true`，没有直接声明该引擎查找公式，因此profile名称保留`candidate`。没有为单字拟合字距、位置或画形。

在旧原生PNG的固定`Carlos Lidón`整行上，新增原始`default8_1.png`字格使前景分割mask由350个缺失像素变为0差异，双方均3175个前景像素。原点、比例、ROI和分割门槛均未改；完整方法与限制见[Credits记录](CREDITS_QA.md)。这不是RGBA、阴影、采样器、字体选择、其他文字或整屏认证。

准备工具的12项合成回归通过，覆盖分页边界、非对称完整字格、字距、拒绝空字格／不支持字符、只检查零写入、输入／输出别名及hardlink原子替换。实际固定档案的check-only和prepare均通过，98个字格与两张整页另作独立核验；139个既有字体文件的字节和mtime未变。私有产物描述表SHA256为`d70db74808536d451973e1a61c026b07ec4aeee84b9458904596d358430acfb0`。

这些结果不把CP437全集或所有游戏字体判为原生已恢复。工具逐文件原子替换，未提供多文件事务；以前准备过但当前不引用的私有页不会被自动删除。实际组件渲染和安装消费另按具名阶段记录。

## 实际组件与安装消费

同一个已安装的193组件／211值功能包，在React18.3.1／19.3.1×默认Vite开发／生产四组合均通过六组新字体输入合同。没有source alias、dedupe或optimizer替代；每个消费者的853个既有包文件在运行前后与受检tar完全一致。

每组合的九张完整预期图由原始字格和独立声明的几何产生，RGBA严格零差：Carlos POINT5、ASCII＋å／ö与显式彩色阴影、page1／page0交替顺序、全部95个可打印ASCII，以及实际`layoutCredits`／`CreditsRoll`的三stage排版。最后一项另核对stage顺序、每行位置／字距、真实挂载回调与无障碍原文。缺失字形的错误回调、原文、真实ref及卸载清理也通过。

实际`BitmapText`的Carlos canvas同样在原来固定的native前景mask域得到0差异、3175个前景像素。raw canvas原点仍为`[648,819]`；`offsetY:-3`在scale5下推导advance wrapper原点`[648,834]`，没有位置搜索。该结果不把Web RGBA对照升级为native RGBA或引擎字体路由证明。

首次运行在前四个直接字形场景通过后，因测试给Credits profile的`maxMeasureCalls`／`maxMeasuredUnits`设为无效的0而停止。仅把这两个测试预算修为合法正数后，四组合完整通过；字体表、组件、九张像素预期及比较阈值均未改，原失败保留。实际记录为`.cache/classic-bitmap-installed-02/FINAL.json`。

维护者可运行独立测试，无需原始游戏字体：

```powershell
python -m unittest discover -s tests -p classic_bitmap_font_preparation_test.py
```

合成测试使用Pillow创建测试图片；准备工具本身只依赖Python标准库和仓库中已有的纯解析帮助函数。
