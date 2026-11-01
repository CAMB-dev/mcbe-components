# FileTransmission 公开接入验收

记录日期：2026-11-02。公开新增 FileTransmissionScreen、FileTransmissionPanel、FileTransferProgress，当前205组件／223运行时值。API见[FILE_TRANSMISSION.md](FILE_TRANSMISSION.md)；原始私有阶段、未通过的alpha假设和观察后修订历史保留在[FILE_TRANSMISSION_IMPLEMENTATION_QA.md](FILE_TRANSMISSION_IMPLEMENTATION_QA.md)。本页不声明原生整页像素认证。

## 公开合同

固定Bedrock Samples v1.26.60.5的268×95传输窗口，十个独立显隐、六个文字绑定、精确按钮目标、238×5固定平铺nub。FileTransferProgress使用完整248px源条宽，不沿用另一Progress模板的90%父宽规则。三组件均有真实DOM ref；Screen controller稳定引用、最新提交读取、实际top-modal检查与嵌套退出隔离。事件通知等待owner-window任务，保留native/document veto、受控更新、会话／显隐／禁用／只读／卸载失效检查。

profile仅使用本源族的三种字体、七个测量值、五个文案、两种颜色、画布及来源／textPolicy。默认阴影、隐藏行参与%c、源clip、缺失平台标题和base_screen引擎factory仍未恢复。stackLayout和whole base/title providers均显式选择；服务、资费、上传和导航由宿主执行。所有潜在字段均先快照验证，不执行getter；无效rgb(1)等颜色不能在浏览器静默丢弃后继续送入glyph context。

## 实际检查与保留失败

- 精简profile后的CPU／SSR13项通过（.cache/file-transmission-public-01/node-03.log），包含1024flags、16种显式栈／显隐输入、零宽空文字、新profile字段／getter／预算及无效CSS颜色在glyph前拒绝。没有使用旧八角色profile凑出新示例。
- 从公开barrel挂载的源合同9／9通过：.cache/file-transmission-public-01/source-contracts-01.json，含五个操作／所有权案例和四个完整材料平面。
- 首次实际包检查因打包catalog仍为202/220而失败（package-01.log）；同步三个真实导出与目录后，package-02.log完整React18.3.1／19.3.1通过：205组件、6数据、12函数，既有Invite/Credits/Chat/Progress门禁保留；FileTransmission每peer24项SSR、严格声明正反例、10完整原PNG、9原metadata、许可及CSS递归字节通过。
- 首份冻结tar SHA256 f84c8d8f47d1e6564ae811e5fe8befbc3301d0e5fc8026ba514daa2e4d6e2e5d 实际npm安装后，默认Vite开发／生产×React18／19四组合通过；无alias／optimizer配置。验证三个真实ref、268×95面板／248×5条、受控比例、面板请求、readonly click拒绝与独立Escape、返焦、两个实际开放字体。记录default-vite-qualification-01/RESULT.json，所有own server和browser关闭。此tar不替代后续最终包的具名资格。
- 公开展示source首批7项为6通过／1只读二次打开时丢失定位；该批运行期间root编辑了main代码示例、触发开发模块更新，失败快照显示示例状态重置。停止源代码编辑后，同一case在demo-source-02.json实际通过，无产品guard调整。原失败／trace保留，不能称首批全绿。生产静态页面另做最终批，避免依赖此开发热更新归因。

## 材质平面边界

四份完整500×301，共602000像素。三个bar平面在首次产品观测前独立冻结，RGBA差异0，nub仅按预声明协议隔离paint并保留几何。原frame-fill参考采用一次straight-byte最终舍入，实际差7560像素，全部在252×30透明中心；这一失败和原51文件／hash全部保留。

独立原图opacity色块、54项多路径诊断中的18项image样本，以及四项预先记录预测的新image样本，支持该Chromium image-opacity Web量化profile；纯色／Canvas路径并不全一致。另建CALIBRATED-WEB-01，明确标为观察后的修订，只改源图生成器的alpha公式，完整frame校准后RGBA差异0。该平面不算首次盲测参考，也不认证Minecraft GPU／原生shader。协议与原始报告见私有阶段记录。

## 仍待原生验收

默认字体／glyph／AA／shadow、%c/%cm/default／safezone／anchor、tile phase／alpha／clip、平台provider、base-screen全工厂和动画、native focus／输入仲裁、真实移动平台及服务。本源文件A分类仅表示有限命名组合映射；全部Minecraft GUI目标保持进行中。

## 最终功能包与生产展示

package-03.log完整通过React18.3.1／19.3.1，含无效rgb(1)在glyph前拒绝的实际已安装包负例；每peer24项FileTransmission SSR与严格声明、10PNG／9metadata／CSS／许可，之前全部公开门禁保留。公开资源闭包162个源模块、676原字节引用（631PNG／39TGA／6JSON）通过。最终功能tar SHA256 eefa4096ba4727b14f776fc916366b21e85e8a911372c1ad2b07036613996e16，冻结至final-candidate/mcbeui-0.1.0.tgz。

该冻结输入的default-vite-qualification-02/RESULT.json再次实际通过React18／19×开发／生产四组合，三真实ref、完整源尺寸、两开放字体、受控比例、原生只读拒绝和退出／返焦均通过；所有own server/browser已关闭。首次工具链检查与最终功能包各自保留hash与报告。

生产静态展示最终同批10／10通过（demo-built-01.json）：桌面与Pixel7 profile各五项，包括字体／导航、完整整数canvas、三部件、独立绑定、警告继续／完成动作、原生veto／readonly、触屏空白关闭／返焦和文字检查。桌面／mobile各闭／modal四份raw Axe均为空（raw-axe-final.json）。这是指定Web构建和设备profile，不是物理设备、整站所有状态、通用WCAG或原生像素认证。

ESM SHA256 735c0562490d92ad65427bf1049ebd0b9c490d0ee46f0aef35ca6bf3ab6ec60a；声明SHA256 1251c9eef5f91e67f0d1cf1b3d207e40b3680eb80aa5bc87f19ab033d3d1b09d。最终只更新文档的repack将另存非文档逐字节等同证明，避免旧tar为新代码背书。

最终文档元数据同步后重新生成site，demo-built-02.json同批四项通过（桌面／Pixel7各字体与完整canvas、rawAxe／背板文字复验）。之前十项仍对应demo-built-01.json的具名构建，不合并写成一次十四项。最终仅文档repack的788个非文档文件与具名功能tar逐字节一致；具体hash记录于.cache/file-transmission-public-01/final-documentation-pack/IDENTITY.json。
