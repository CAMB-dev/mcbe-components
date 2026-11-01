# Progress controller 引用与模态所有权修复

日期2026-11-02。公开API保持205组件／223运行时值，类型声明不变。本轮修复React宿主调用及Web模态所有权，不新增原生像素资格。

## 真实失败

合法调用`controllerRef={setController}`（React useState的稳定setter）在ProgressScreen关闭时即可触发`Maximum update depth exceeded`。普通文字更新也会释放／重挂callback ref并替换句柄。另一个宿主通过真实root ref将独立模态portal到Progress根内时，外层根本身未被inert，旧外层controller仍返回true并排队退出。

持久调用点见demo/progress-owner-fixture.tsx，全部从公开barrel导入；tests/progress-owner.spec.ts驱动真实DOM。原三项同批全部失败（.cache/progress-owner-01/red-01.json）；移除state-setter案例里的无关DOM ref后，最小闭屏复现再次失败（red-02.json），React错误边界保留原始最大更新深度信息。失败报告／截图／trace均保留。

仅稳定句柄及引用effect依赖后，两项通过／模态一项仍失败（handle-only-01.json）；再加实际top-owner检查，原三项全部通过（green-01.json）。这区分了引用生命周期与所有权两处独立原因，没有通过移除state setter、隐藏错误或放松断言来得到通过。

## 修改

句柄用session级useRef保留，callback ref只在其引用或session生命周期变化时释放／挂载。其捕获的helpers通过latest/generation/events/root/boundary等refs读取已提交状态，不保留首次props、回调或当前focus值。

请求入口和延迟有效性检查共享live()；它现在要求当前modalBoundary确实拥有文档的顶层Web modal lease。仅检查祖先inert无法覆盖嵌套portal。Factory切层仍先更新最新plan／边界，再协调lease，最后挂载controller；旧请求继续通过generation／layerkey／节点／最新状态复核。会话替换后的旧句柄返回false。

这不改变源路由、图像、切片、颜色、字体、DOM几何、显隐绑定或动作目标。嵌套测试证明的是宿主Web portal所有权，不证明原版引擎存在相同工厂流程或仲裁规则。

## 实际验收

- 原三项先red，最小setter再red，分步2green/1red，再3green；报告如上。
- 新五项控制器调用点，加原ProgressScreen11、独立Progress部件13、两组材质16与FileTransmission行为5，**同批50／50通过**（regression-01.json），包含iframe、factory切层、两个modal、延迟document veto和控制选择。16个既有完整材质平面仍RGBA0，未重新生成期望。
- npm run verify:package完整通过（package-01.log）：实际React18.3.1／19.3.1的205组件／6数据／12函数、ESM／SSR／声明／CSS／字体／676原图字节引用及既有Invite/Credits/Chat/Progress/FileTransmission门禁。DTS SHA1251c9eef5f91e67f0d1cf1b3d207e40b3680eb80aa5bc87f19ab033d3d1b09d与修复前相同。
- 实际冻结tar默认Vite开发／生产×React18／19四组合通过；每组合保留六个Progress refs、真实Pixel/CJK字体、受控选择、五个源动作，另实际运行全部五项controller回归，共20次。相同持久调用点被复制到消费者，只把public import／已安装fixture路径替换为mcbeui；无source alias或optimizer覆盖。每项从真实浏览器React.version确认对应peer。报告.cache/progress-public-01/default-vite-owner-fix-01/RESULT.json及各owner-react*-*.json；所有own server／browser已关闭。
- 老Progress工具链脚本的220常量已改为实际安装包目录的导出计数，避免205／223包被过时的202／220阶段常量拒绝。完整包检查仍精确核对全部导出与catalog，不靠数量掩盖缺失组件。

当前功能ESM SHA0433b24a5d9e88dfe778183b0c4d32d9a80d45e66e9798dda1384f4d23698a1e。最终tar／文档repack及关闭记录在.cache/progress-owner-close-01/FINAL.json。全部GUI、默认原生字体／shadow／shader、书本／模型及整页逐像素目标仍未完成。

最终纯数据／SSR回归：Progress105／105与FileTransmission13／13均通过，日志node-progress-final.log／node-file-final.log。根源服务5431按exe、完整命令、创建时间核对后关闭；5420…5423资格服务已关闭，未触碰用户4173，Computer Use未开启。
