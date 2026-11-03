# 输入尺寸与原版表面收尾（2026-11-04）

TextField和TextArea现在在显式style.height存在时取消内置默认最小高度。未指定高度仍为48／112px；调用者显式minHeight优先，不改写传入的style对象。CSS padding／border的下限、百分比父容器解析仍遵循浏览器标准。

数字输入保留原生type、上下键步进、step／约束验证、form／reset与真实input ref，仅隐藏浏览器箭头。普通search隐藏浏览器清除装饰；独立SearchField的自有原版清除按钮保留。TextArea默认不显示浏览器resize grip和滚动条，保持内部滚动、选字、编辑与表单行为；需要拖动时可用显式CSS resize覆盖。

invalid保留普通原图表面、白色键盘聚焦、ErrorGlyph、ARIA与错误说明。没有额外粉色边框。既有source文字阴影保留。

## 失败与复验

本地证据位于`.cache/input-source-surface-20261104-01`。red01为4通过／7失败：两个控件显式高度、SSR最小高度、数字箭头、textarea resize grip／scrollbar与search清除装饰。green01修复后11项通过；typecheck02通过。原PNG未重绘、裁切、换色或放宽比较阈值。

四种输入在160／240／360px、normal／hover的24个完整原图平面，共389,120个RGBA像素，与独立原PNG九宫格参考一致。它认证Web原图采样，不认证原生字体、caret、IME或整个Minecraft页面。

回归包括select一致性、invalid、settings controls、server forms和structure editor。regression01为75通过／1失败，暴露旧invalid测试仍要求铁砧crossout拉伸；HEAD输入源码也复现。曾尝试恢复stretch，regression02虽然76通过，但该尝试与既有原生证据冲突，因此撤回。正确期望依据[铁砧原生记录](ANVIL_IMAGE_QA.md)：18×12 game逻辑框内画12×12方形，水平inset3；GUI2为36×24框内24×24。regression03最终76／76通过，0skip／flaky，保留contain产品实现，仅修正过时测试；Smithing的独立stretch合同不由此变更。失败记录均保留。

## 当前原版观感抽查

本机Minecraft v26.60桌面窗口的中文主菜单、设置／可访问性和视频设置已实际查看。主菜单灰色倒角按钮、白／灰文字层级，设置开关、绿色滑轨与选中分段、深色边框和方角与库的Classic方向一致。只做页面导航，未修改设置、世界或账号；返回主菜单后关闭Computer Use。该抽查只支持整体风格判断，不声称对其他GUI新采帧或逐像素零差。

当前发布验收采用用户允许轻微不对齐的观感标准；旧精确图像记录继续作为后续精修依据。最终包与展示验证结果见[交付状态](DELIVERY_STATUS.md)。

最终源／生产展示各三尺寸通过；新功能包的React18.3.1／19.3.1与四种默认Vite安装消费通过。4173预览中的附魔台、砂轮和窄屏80px textarea已另行查看完整截图，后者完全在viewport内，未出现控件自身裁切。展示section的长截图会受到viewport外采集影响，不能据此推断真实输入框被裁断。临时5550／5553服务在用例全部通过后需显式结束，报告expected3／unexpected0／skipped0，保留该清理事实。
