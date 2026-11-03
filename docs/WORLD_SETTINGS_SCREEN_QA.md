# World 设置组合验收

2026-11-03。源基准为官方 Bedrock Samples v1.26.60.5，commit `15701fa9c13923f12662984c32c124327e40e3d3`，完整ZIP SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。API、源挂载和缺失依赖见 [WORLD_SETTINGS_SCREEN.md](WORLD_SETTINGS_SCREEN.md)。

| 检查 | 实际结果 | 范围 |
| --- | --- | --- |
| Node01 | 132通过、0跳过 | 基础Frame／Fields／World／材质及Cloud／Debug／Screen；发生在最后事件快照修复前 |
| Node04 | 22通过、0跳过 | 最终ServerCustomContents与整页CPU／两peer SSR；与前批次有重叠，不累加 |
| Browser04 | 135通过、1跳过 | 桌面＋Pixel7模拟，四文件完整批次；最后事件快照修复前；跳过为既有手机hover条件 |
| Browser05 | 42通过、0跳过 | 最终整页定向批次，含真实input／select事件currentTarget归属、受控值、晚到否决、隐藏保留、原容器归属、外部Classroom接口 |
| 功能包Package05 | React 18.3.1／19.3.1通过 | 268组件＋6数据＋13函数＝287运行时值；每peer新增12组SSR／CSS合同、17负类型合同；基础依赖合同分别保留 |
| Installed05 | 4组合通过 | 默认Vite开发／生产×React18／19，实际安装包，无源码renderer别名；每组合10组检查 |
| 完整画面 | 16对、7,072,000像素RGBA严格0差 | 八种GUI1／2、mouse／touch、CSS／source-image状态；仅开发／生产一致性 |
| Built03 | 9通过 | 实际4173生产展示：桌面、Pixel7、320px，三模式、服务器、Debug、Cloud、宽度、无原生内容滚动条 |
| 源／示例生成 | 两个preparer --check通过 | 固定ZIP源身份、条件、绑定、原文字串和显式宿主示例可复现 |

功能tar SHA256 `7c4de9f988b79e244361f92f73452dc1a257838a65e6f714476a21c876ccc0a0`，7,280,127字节，保存为私有 `package05-tested.tgz`。最终文档打包另做 dist／package／许可成员逐字节相同检查，不把文档tar冒充原受检tar。发布闭包226个源码模块、853个原字节引用（808PNG／39TGA／6JSON）；未新增伪造纹理，私有字体、shader、native捕获不入npm。

Installed05实际Chromium156.0.8078.4，ANGLE Vulkan SwiftShader；不声称NVIDIA或Minecraft原生匹配。四组合的page errors、console errors、HTTP失败均为空，浏览器和矩阵服务均finally关闭。

## 真实修复与历史失败

- Server Slider／step slider／dropdown保留真实input／select事件。控件被移出原Server容器，即使仍connected，也不能发送请求；submit同样检查本地owner。
- 实际安装包EventOwnerProbe01复现延迟回调 `change.event.currentTarget=null`，同时独立control仍是INPUT。最终使用同一生命周期提供的事件快照；Probe02在真实安装包证明currentTarget与control一致。原事件、nativeEvent和可取消边界保留，不伪造可取消事件。
- Axe初次发现Server多选按钮名称不含当前显示摘要；修复后名称随已接受选择更新，已包含摘要的宿主名称不重复。旧10组SSR哈希不改写；测试只在逐项验证这一个预期aria属性差异后核对其余完整SSR与ID。原变更／renderer AST不再冒称完全未变，未修改的scope／props／tooltip仍保留历史pin。
- Root课堂组件形状、React18 inert、Cloud／Debug示例预算已修复。Classroom源模块缺失时明确要求外部适配，测试按钮是标明的替身。
- Package01被测试tuple的string-or-undefined推断阻止，修为只读tuple；Package02被旧catalog264／实际268计数阻止，清单同步后新run通过。Package03／04是晚期修复前的历史包，最终为Package05。
- Demo02的三项失败是测试把全部output当成一个状态输出，误命中两个Slider output；改为aria-live状态节点。Browser03为146通过／1跳过／3失败：两个是Playwright.check立即断言不适用于延迟受控接受，改为click再等待已接受值；另一个把固定DPR1的42像素材质合同误放到Pixel7 DPR2.625，取得110物理像素，未改原图或像素阈值。最终Browser04恢复正确项目范围；Browser03桌面七项材质检查通过，手机失败保留，不升级为手机材质认证。

上述批次有重叠，不拼接为单轮全绿；早期Browser01／02、Package03／04和Installed03／04保留身份。最后Root事件快照变更仅由最终定向、安装与生产批次覆盖。

## 无障碍与原生边界

最终Axe四份原始结果均保留：World初始视口仍有1个label-title-only报告；滚动到实际sleep slider后全scope为0报告、2个incomplete，Chrome真实名称已存在。Server scope为0报告／21pass／2incomplete，Cloud scope为0报告／18pass／1incomplete。没有排除规则或隐藏问题节点，也不称全站WCAG认证。

Computer Use只枚举当前窗口与应用，没有匹配到Minecraft；进程名Minecraft／Bedrock查询也无结果。没有游戏输入、新native截图或PIX重启，CU JS会话随后立即reset。保留用户4173，关闭本阶段拥有的5491及矩阵5493／5494。

World／Packs组的max-allocated-groups是明确Web内在高度策略。Classroom原始实现、Cloud精确图像和五个zh_CN字串仍是外部依赖；宿主示例不冒充恢复的源文件／官方翻译。原生字体／默认锚点／采样／剪裁／整页、Book／工作站、ResourcePack／Manifest等既有残差保留。206源文件覆盖分类不因新增四组件自动提升，完整goal继续进行。
