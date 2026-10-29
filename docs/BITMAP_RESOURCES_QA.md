# BitmapText共享资源治理与验证

本轮治理显式 `renderer="webgl-shared"` 的私有GPU资源与loadTexture resident cache，不增加公共API，仍120组件 /134运行时值。CPU默认、独立webgl及公共 `renderBitmapGlyphs` 完整读回保留。最终kernel Node11、loader Node22、正式65、03实际React包、固定8draw新native与48矩阵及115生产辅助检查按各自范围通过；不自动解决默认字体 /Present。

## 共享GPU与预算

同一库模块、同一Document复用一个Offscreen WebGL session；不同Document分session，预算ledger跨该模块全部Document，不跨独立库副本。每owner仍有canvas /bitmaprenderer /显示结果。私有后端沿用同一shader core及顺序run绘制，复用资源，不是多实例一次draw batch，也未新增Worker并行调度。

reuse仅在session存续期间。reuse-stress保留一个稳定owner；若全部owner同时signature变化，旧lease全释放后仍可能经微任务销毁 /重建session。不能把保持session的复用观察写成任意48实例全量更新都newGL0或资源永不重建。

| 资源 | 当前策略 |
| --- | --- |
| Programs /shaders | 每session懒建，最多3program /6shader |
| Buffers | 每session最多9个、payload总量最多8MiB |
| Target | 每session一个target FBO与对应纹理，另有Offscreen呈现面 |
| 页纹理 | 每session LRU最多256页 /16MP；完整byte snapshot对比尺寸与内容，不只靠对象 /URL身份 |
| 共享总记账 | 每模块跨Document最多256MiB，另限512leases及16MP呈现输出预算 |

snapshot可发现同一mutable PixelTexture的字节变化；同内容页复用并提升LRU，淘汰删除GPU texture与cache snapshot。loadTexture的URL cache与GPU页cache是不同所有权。

256MiB计显示输出、scratch的Offscreen与FBO两份RGBA面、显式背景copy、页GPU＋CPU snapshot、buffer payload及瞬时ImageBitmap保守峰值reservation。扩张前先预留，尺寸变化先缩变小轴再扩另一轴。超预算报错并显示原文，不静默切CPU。

该账本不包含临时JS打包数组 /typed arrays、shader driver二进制、active fetch、owner /host持有的decoded refs和宿主其他资源。最大单atlas run含884,736个number，实际heap大小随引擎表示与数组capacity而变，不能按固定每项bytes宣传通用大小。它是有限库payload约束，非总JS heap /GC、driver /OS全部显存硬限；多库副本也分别记账。

## 显示、取消与释放

共享组件直接由私有后端绘制、transferToImageBitmap，再transferFromImageBitmap到owner；不调用readPixels，不走Canvas2D /putImageData。公共 `renderBitmapGlyphs` 仍完整readPixels、返回framebuffer或显式straight-alpha数据，canvas独占与单调用生命周期不变。不能把共享优化宣传为整个库无读回或零拷贝。

这里的0readPixels /无Canvas2D仅指共享GPU目标绘制与显示链；BitmapText的colorRgba解析及loadTexture字体解码仍可使用Canvas2D /getImageData，整个字体加载链并非无CPU读回。

取消不发布过时结果，未消费bitmap在finally关闭；成功 /失败 /取消均结算reservation，释放旧lease会清空旧显示。最后release经微任务销毁全部session资源；context loss使session失效并通知所有owner回退原文，输入更新可取新session，不承诺原输入自动重试。取消不必无条件销毁仍有效的整个session。

## loadTexture resident cache

私有LRU最多64entries（包括pending），成功结果最多32MiB retained decoded backing ArrayBuffer。resident命中复用同一Promise /PixelTexture并提升MRU；settlement检查entry身份，旧success /failure不能影响同URL新entry。失败删除允许retry；单个超32MiB结果交原caller后不resident，不整体清空其他有用cache。完整backing byteLength计数，非仅typed-array view；别名backing可保守重复计。

eviction只放弃cache所有权，不abort已开始fetch，不使existing owner引用失效；evicted pending仍服务原owner。active fetch /owner-held decoded refs /瞬态解码不受resident预算全局约束，没有新增并发队列或取消API。PNG获取到的ImageBitmap在finally关闭，涵盖后续canvas /context /draw /read失败；未创建成功时无对象可关。TGA /原图颜色与重采样算法不因LRU改写。

## 当前验证状态

`.cache/texture-cache-resource-01` 实际Node22项通过：真实TS loader /cache配network /DOM /bitmap mocks，覆盖entry /byte边界、pending /同URL替换、失败retry、PNG finally及TGA不变。独立browser-results.json首轮5项通过、6.341556秒、0skip /unexpected /flaky，覆盖真实HTTP /browser PNG；它不证明共享shader或native像素。

`.cache/bitmap-shared-resource-02/provisional-01` 保留首kernel10 /10及原pins。review确实发现presentation失败在target resize之后会低估旧output charge；最终实现清空失败目标、owner charge归零，而preflight拒绝保留原目标。新增挂载direct lease失败后另一owner仍能呈现完整16MP的case，最终node-resources.log实际11 /11、629.6261ms、exit0。mock资源生命周期 /调用 /记账证明不等于真实GPU像素或总进程内存。

## 最终正式浏览器与实际包

`.cache/shared-text-resource-independent-qa/formal-01/report.json` 实际单批65 /65 PASS、90.318725秒、0skip /retry /flaky /errors，七整文件同standard worker1、actual SwiftShader，823个source /demo /test /font pins不变。分项为shared14、webgl7、BitmapText13、glint11、itemrenderers12、nativebitmap3、loader5；loader5与上面的browser首5是不同运行记录，同用例不重复增加。nativebitmap测试保留其原残差诊断，65通过不意味着旧native诊断全部零差。

正式canonical `.cache/shared-text-resource-independent-qa/FINAL.json` SHA256 `1f5abfe07cf7d5e5e1bd8d12f6fb3e994c307da6b7c1583349e0f4daf3694620`，RESULT.md SHA256 `e257b9670fe9c5226f702f5352cb4a1ef4fd356e8f0f35730ea88521ed7f1ae8`。48同页 /八轮更新保留稳定anchor，实际2program /4shader /1page upload /1固定target、共享readPixels0；300tiny页LRU与合法大页A→B→A三upload、预算拒绝保ready owner、transfer失败清0、最后release观察到的GL对象0均在65正式合同内，不把它们另加测试计数。

复用stress保持稳定owner；结果只在session存续内说明复用，不宣称全48同步signature更新newGL0。本轮native分别比较共享无readback DOM /独立显示参考与公共raw FBO，不把旧raw-shared名称迁作当前共享raw输出。

FINAL03 `.cache/bitmap-resource-production-03/package/consumer-identity.json` 的实际verify:package exit0、36.41秒，React18.3.1 /19.3.1各134runtime /SSR /strict TS /原API /assets /licenses通过。tar /build /两个实际安装consumer各256dist同字节，453个source /demo /config /verifier pins未变。已测consumer-verified.tgz SHA256 `fce119bcdacd6b3e1708b30d23b02d4905415fb933a07cf989f68dc4d3a1a2c6`；dist/index.js 577,473bytes，SHA256 `b34ec8061062be8731c7ae5493cf1888883dc1c270bfc5a2885a7147f84ee1bb`。

02包实际exit0是其provisional source成功历史；后因真实presentation账本问题撤回freeze、修后source变化才03重验，不能说02包失败或把其成功套到03。旧报告完整保留。当前包消费不替代新native或生产browser。

`.cache/bitmap-resource-release-03/package-api-preservation.json` 实读旧Anvil已测tarball与新03包各256dist，只有index.js与index.js.map变化，其余254份types /CSS /fonts /原assets同字节。这是包payload保持范围，不新增正式测试。

## 当前source的固定8draw实际native复验

`.cache/bitmap-resource-independent-01/runs/native-2026-10-29T14-42-14-408Z/report.json` 实际通过：新共享DOM、独立导入旧已发布8e7ec2d共享DOM与原native bytes的独立GPU-copy显示参考，在initial及插入13×7异目标后均完整2570×1402 /3,603,140像素RGBA0。独立公共raw FBO两次同完整target对原native RGBA0，原native SHA `6033d7afb5f28ecaac4663dea433e6529927f041d942e1ba76e36a77767d41df`。共享readPixels实测0，不能把公共raw或DOM截图写成新共享raw读回。

这是原捕获8draw及原before背景的条件式复验，DOM比较使用匹配预乘显示语义的独立参考，不以DOM反推原RT alpha。96source /133旧证据 /16输入pins不变，NVIDIA后端范围与旧捕获一致；不是默认字体 /任意布局 /world /Present恢复。

48矩阵首轮五grid新旧与48个独立PSO cell均0，但整harness因loss后“累计context必须2”错误假设失败，首report /scripts保留，raw false未回填。增加warm /color往返后，old /new都合法累计创建了3个session；只修harness为loss前相对新增1、1live、旧pool全部lost，不改生产 /输入 /期望。修后完整重跑 `runs/many-2026-10-29T14-45-14-871Z/report.json` 通过。

五个1560×576完整grid（cold48 /warm changed color48 /original color48 /hide24 /recover24）各898,560像素相对旧published全RGBA0，包含空白 /padding /卸载格；48个完整260×72 cell另与未改独立PSO shader全0。当前矩阵共享readPixels0、published168；loss /survivor /恢复 /最终释放均通过，不把48当成48份新native捕获。

cold48实际GL调用计数如下，非时延或VRAM基准；draw /bufferData次数未减少，未实现跨owner batch：

| 调用 | Published | 当前 |
| --- | ---: | ---: |
| createProgram | 96 | 2 |
| createTexture | 240 | 56 |
| createBuffer | 816 | 5 |
| readPixels | 48 | 0 |
| drawElements | 192 | 192 |
| drawArrays | 48 | 48 |
| bufferData | 816 | 816 |

最终 `.cache/bitmap-resource-independent-01/FINAL.json` SHA256 `ce5d71796e3a9840cec12cd41b81471b611bace6ff9d278d22d394c1baf04b35`，RESULT.md SHA256 `b7c120061b79dfb1baf776261f3f53da9082d8979737ba9697ba1d27ea574f82`。96source /133旧证据 /16原输入 /6published Gitblob snapshots逐条哈希不变；实测NVIDIA RTX3050 /ANGLE D3D11、DPR1。固定8draw与生成browser合同各保留范围，不扩展到所有font /scale /driver或全库目标。

## 当前source的生产浏览器

`.cache/bitmap-resource-production-03/production/FINAL.json` SHA256 `03919292b695aec0cf51a821224f6287c4bb86d05ed5778707df05faa30da496` 记录首轮实际exit0、18.64秒：42个bitmap＋73个Source Anvil共115辅助checks通过，不加正式65。专属webgl /shared /CPU与scale /sampling /shader切换、40ready原尺寸 /hide /remount /390px局部pan及完整Anvil合同通过。实际standard SwiftShader /Vulkan、无生产GPUhook；40 DOM ready不证明具体GL对象数、缓存复用量、256MiB账本或物理VRAM。

8实际HTTP入口、256dist /47site均与03包pins同字节；main-B4lLTS7R.js 168,625bytes SHA256 `6aeeb592f7095fe672cace726924618b3605c4798cfd9e98d2d261ac645631b4`。bitmap25 /Anvil27个observed HTTP font URL分别fresh200 /sitebyte0。本次raw取消0、page /console /非取消网络错误0，仅限该次观察，不宣称普遍无取消。两serial浏览器finally关闭，用户tabs /4173 preview未动，没有ComputerUse或桌面操作。

最终仅补文档重打包须另逐条确认与03已测tarball仅README /docs有差异，所有非文档payload同字节，消费验证通过该身份链关联。旧27正式、旧8draw /包 /生产身份留在 [BITMAP_SHARED_QA.md](BITMAP_SHARED_QA.md)，本轮另据实际报告；draw batching、默认字体、总heap /全部VRAM硬限与world /Present仍未完成。
