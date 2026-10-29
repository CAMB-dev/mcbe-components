# 文字阴影：单位与显式缩放

设置阴影前，先确认数值所属坐标系。CSS、GuiText 与 BitmapText 的 offset 单位见下表。

| 入口 | offset单位 | 后续影响 |
| --- | --- | --- |
| CSS `text-shadow` /阴影token | 元素局部CSS px | 随祖先transform /zoom及DPR改变屏幕位移 |
| `GuiTextGeometry.shadow.offset` | game单位，加到origin后做物理floor | 独立于fontScale；由显式frame /guiScale与显示映射决定 |
| `BitmapText.shadow.offsetX /offsetY` | 字体metric /source-pixel单位 | 先乘BitmapText的scale，随后仍受祖先映射 /DPR影响 |

例如BitmapText的source offset1配scale2，得到局部2CSS px，不是固定2个物理像素：

```tsx
<BitmapText font={font} sampling="point" shader="bitmap" scale={2}
  shadow={{ color: '#000000', offsetX: 1, offsetY: 1 }}>Text</BitmapText>
```

GuiText则可明确写 `shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] }`。这里是game1，不会因fontScale=.5自动变成game.5；颜色 /tint也需由具体role指定，不能据示例推断所有原生阴影都用同一色。

## 已知缩放时如何换算

若元素到viewport CSS只有已知uniform缩放s，DPR为d，且阴影无blur：

```text
deviceDelta = localCssOffset × s × d
localCssOffset = desiredDeviceDelta / (s × d)
BitmapTextSourceOffset = localCssOffset / BitmapTextScale
```

这里s要包含实际祖先transform /CSS zoom；page /visual viewport因素需在完整映射中只计一次。不能从font-size猜s，也不要把GUI scale与宿主展示倍率重复相乘。

具体例：在已观察Anvil GUI5 profile、宿主uniform scale2.5、DPR1时，目标2physical px对应局部0.8CSS px。调用方可只对这个已知profile设置：

```css
.known-anvil-profile {
  --mc-anvil-cost-shadow-offset: .8px;
}
```

这只是该frame /host的显式换算，不是新默认、自动补偿或其他DPR的原生证据。未知祖先 /DPR时不应套用这个值。位移正确仍不证明字形AA、颜色、裁剪或最终合成相同。

一般可逆2D affine映射A使用 `local = inverse(A) × (deviceDelta / DPR)`；平移抵消。旋转 /skew不能只用bbox宽度比代替矩阵。perspective下映射随位置变化，不能保证一条文字处处有同一屏幕offset。

## 原生观察与不能推广的部分

| 有限同role样本 | 字体 /采样 | 阴影相对主字右 /下位移 |
| --- | --- | --- |
| Enchant费用GUI4 | default8、Bitmap /POINT | 约4 /4physical px，即约1 /1game |
| 同Enchant费用GUI5 | 同源页 /shader /字格 | 约5 /5physical px，仍约1 /1game |
| Anvil费用GUI5 | Unicode、BitmapSmooth /LINEAR | 约2 /2physical px；投影后约.4 /.4game |

因此不能统一为“全局2physical px”，也不能把所有role都设成game1。Anvil缺同role第二scale，字体 /shader也与Enchant不同，不能用另一控件补齐该证据。

投影后约.4game是已量化MVP位移，不是唯一的原始CPU常量。“一个字体source texel再device floor”能解释这些样本，但仍是候选；未知fractional phase也可能产生相同结果。不要据此重定义已有offset单位或擅改默认token。

来源为CPU只读复核 `.cache/native-text-shadow-policy-01/REPORT.md` /FINAL.json，FINAL SHA256 `3463e72892e9177deaa89fe764851c71b391fb7ae422f0344561c7d8b7a77477`：12对main /shadow、96个重解packed vertices、48份原CBV、63个source pins。它不新增native捕获 /浏览器验证 /组件或全库通过数，不认证唯一engine阴影算法。
