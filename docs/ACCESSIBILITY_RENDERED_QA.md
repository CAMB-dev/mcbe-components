# 展示页语义与实际背板复核

记录日期：2026-11-02。这是有限 Web 回归与检查工具的验证，不认证原版 Minecraft 整屏、所有交互状态或 WCAG 全站符合性。

## 已修复的产品与示例问题

- DocumentViewer 保留一个 tablist；分类容器和分类标题为 presentation，分类文字通过 tabs 的 aria-describedby 保留。配对正文改用允许 tabpanel 角色的 div，避免 article 的角色覆盖。正文自己的 heading 不变。
- 服务器表单多选示例的名称包含可见选择摘要；Emote 独立预览使用实际动作文字。新增两项公开示例标签回归通过。
- StartMenu 的通用零 padding 规则优先级覆盖了 form-fitting 规则，实际文字可落到深色边框。恢复普通每边5单位、Dressing 额外每边1单位、Profile 与 Friends 每边2单位的源几何；没有通过修改源文字颜色掩盖问题。1×／2×／3×、Profile 两分支和按钮状态回归通过。首次21项为20通过／1个fixture未打开 Friends；修正 fixture 后新增项单独通过，原失败报告保留。
- 独立 Invite pagination 示例补上该浅色控件所需的灰色宿主背板；XYZ 示例补上深色宿主背板，保留原红／绿／蓝文字。没有改变两个源组件的原色。

文档两套实际浏览器测试最新23／23通过，包含源码图片角点、几何、滚动、键盘、refs、强制色及三条 ARIA 关系／角色规则。证据：`.cache/a11y-document-final-02.json`。其他标签检查：`.cache/a11y-labels-01.json`。

## 保留原始 Axe 与像素复核的边界

原始广泛检查保留在 `.cache/chat-resume-chat-integration-regressions-01.json`：93项中的90通过／1设备跳过／2失败。不能将随后单项修正伪称这次原批全绿。

Axe 的 CSS 背景推断不能完整识别本库的 sibling image 和 border-image 背板。`tests/helpers/painted-contrast.ts` 保留所有原始规则结果，仍拒绝 serious／critical 的非对比度违规；每个 serious 对比度目标都必须完成实际截图检查，不使用组件名单跳过或关闭规则。

检查采用原始图、透明／黑／白 text-fill 三探针和恢复图，共五次捕获。color、背景、border、布局和图片均不改动。黑／白端点量化后的字形样本与真实透明文字背板共同确定采样位置，使用严格同质校验的 CSS intended foreground 和 Axe 原来的3／4.5／7阈值计算，包括原本黑底黑字等不可见样本。没有按原图恰好等于前景色筛掉失败文字。

8位黑／白端点不证明数学 coverage 恰为1；记录原图候选样本的 RGBA 分布、偏离 intended foreground 的数量和最大通道差，不宣称恢复了所有抗锯齿边缘。原始和恢复图完整 RGBA 必须相同，每次探针须保持几何及全部非 fill computed style 相同。支持的原生文本输入读取当前 value；空值／placeholder、混色、不同文字尺寸或字重、透明度／滤镜／混合、不支持的 replaced／generated 内容和阴影均保守拒绝。

原生控件截图会临时隐藏 caret 并经 CSSOM 归一化 style 字符串。工具在任何截图前保存原始属性，并在最后一次截图之后及所有失败出口恢复，另核对原始属性、完整 computed style 和几何。

检查工具13项浏览器测试实际全部通过，包含低对比度、混色子文字、currentColor 背板、跨黑白背板的不可见字、子透明度／滤镜、伪元素装饰、属性选择器导致的附带绘制、原生当前 value、精确属性恢复等正反例。证据：`.cache/.cache/painted-contrast-contracts-06.json`。此前不完整探针和 native caret 的失败报告保留；这些历史结果不构成当前检查器资格。

## 当前整页结果

加严后的完整展示页与世界弹窗实际检查通过，耗时175.351秒：`.cache/a11y-wholepage-painted-04.json`。展示页 raw Axe 仍报告30个 serious 对比度目标和16个 moderate landmark-unique目标；30个对比度目标逐个完成五次捕获，共15,777个端点量化字形样本，最低 intended-foreground 对实际背板对比度为4.837877（原阈值未降低）。所有 serious／critical 非对比度规则为空；世界弹窗的 raw Axe 结果为空。汇总在 `.cache/a11y-wholepage-painted-04-summary.json`。较早的 `-02` 使用旧版探针，不能替代当前加严检查；`-03` 在原生 textarea 的保守拒绝处失败，未执行后续弹窗检查。

即使具名检查通过，原始 Axe 也不等于零违规：所有原始 minor／moderate 结果仍保留。局部图像背板采样不能证明未报告目标、完整 AA 边缘、全部状态或原生游戏的无障碍与像素符合性。
