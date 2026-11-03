# 放大镜POINT边界诊断（2026-11-03）

后续阶段使用完整渲染目标与`top-left`原点，已令指定两建筑页完整RGBA零差，见[新光栅验证](CRAFTING_RASTER_TARGET.md)。下面保留原始解析POINT反例；它不因新策略有效而成为正确取样规则。

指定GUI5／GUI4完整建筑页已有5／160点RGBA残差。已有记录确认两者使用相同的完整原始16×16`magnifyingGlass.png`、POINT／CLAMP采样；普通源布局与原生packed XY、UV及相关MVP字段一致。纹理不需要重绘或替换。

本次只读取已保存的完整产品与原生PNG，使用标准库解码和`Fraction`精确有理数计算，检查如下假设：

```text
texel = clamp(floor((physicalPixelCenter - physicalRectOrigin)
                    * textureSize / physicalRectSize), 0, textureSize - 1)
```

GUI4物理矩形为`[1134,298,68,68]`；GUI5为`[1095,6305/32,85,85]`，来自既有正常源布局的half字段及guiScale。没有加入epsilon、拟合UV偏移或逐点修补。

| 诊断 | GUI5 | GUI4 |
| --- | ---: | ---: |
| 原完整页差异 | 5 | 160 |
| 解析规则选中的不透明像素 | 2,950 | 1,869 |
| 其中与原生不符 | 32 | 13 |
| 仅在内存替换这些不透明像素后的完整页差异 | 32 | 80 |
| 旧错误变精确 | 5 | 80 |
| 原本精确变错误 | 32 | 0 |
| 双方仍错但颜色改变 | 0 | 1 |

表中“替换”只是CPU反事实诊断：保留实际产品的其余全部像素，在内存中替换解析规则判为不透明的位置，再比较全部3,603,140个RGBA像素；没有把这种修补写入图片、产品输入或渲染器。透明区域的底图未假定为固定颜色，因此这也不是完整解析渲染方案。原图alpha只有0／255。

GUI5明确出现32个新错误，足以否定把该解析规则直接当作原版POINT采样的做法。GUI4改善也没有达到原生一致。故本轮不新增采样API，不修改默认shader；现有5／160残差保持不变。结果不证明最终机器指令、光栅插值精度或唯一根因。

既有两个图像顶点shader代数写法、完整viewport／裁切viewport实验均未消除这些残差；本次没有重新执行它们，也没有启动浏览器、GPU重放、Computer Use、Minecraft或PIX。

可审计记录位于`.cache/magnifier-invariant-position-20261103-01/`的`rational-point.py`和`RATIONAL-POINT-02.json`，含完整输入PNG／RGBA SHA256及转换计数；首次诊断记录也保留。私有原生采集不随npm包分发。
