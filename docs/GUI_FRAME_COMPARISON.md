# 完整GUI帧的严格RGBA比较

源码仓库提供标准库工具，可将渲染输出与调用者自己的参考PNG逐像素比较：

```powershell
python scripts/compare-gui-frame.py --expected reference.png --actual rendered.png --output new-report.json
```

支持Python3.10+，无需浏览器、Pillow或NumPy。输入须为非交错RGBA8 PNG，每边不超过8192、总像素不超过16,777,216；工具检查PNG CRC、压缩数据长度及五种行filter。原始样本值直接比较，不进行色彩管理、预乘转换、缩放、裁剪、掩码或容差处理，透明像素中的RGB也参与比较。

退出码0表示完整RGBA相同，1表示确有像素差异，2表示输入／IO错误。尺寸不一致直接拒绝，不能自动裁成共同区域。JSON记录两份PNG与解码RGBA的SHA256、完整像素数、不同像素／字节／alpha数量、最大通道差、绝对误差、差异包围盒和前12个差异。比较期间输入变化会失败；已有输出文件不会覆盖，输入图不会改写。

该工具只验证传入图像的数值关系，**不证明参考来自原版，也不证明游戏版本、GUI比例、字体或GPU后端身份**。`nativeProvenanceVerified`始终为false；原生资格、资源来源和产品运行证据需另行验证。包中有本文，执行脚本需源码仓库。

五项独立检查覆盖不同PNG编码的相同RGBA、透明RGB与alpha差异、同像素数但不同长宽拒绝、CLI退出码／已有输出保留，以及CRC合法但deflate无效时返回输入错误。底层PNG解码器另有六项检查，不把这些工具检查计为组件的原生像素验收。

```powershell
python -m unittest discover -s tests -p gui_frame_comparison_test.py -v
python -m unittest discover -s tests -p crafting_candidate_audit_test.py -v
```
