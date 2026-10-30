# GuiLayer实体命令与NPC源人物

`createNpcEntity`从完整原版NPC模型和皮肤生成`GuiLayer`的`kind:'entity'`命令。`npcSkinNames`提供60个controller顺序的源alias，`npcAppearanceOptions`按原行为文件的外观列表顺序提供60个`{variant,skin}`选项。当前公共运行时为140组件＋6数据＋11函数＝157值；没有新增人物React组件。相机、投影、物理viewport和材质必须由宿主明确提供，尚无恢复完成的原版自动取景默认值。

## 使用

```tsx
import { GuiLayer, createNpcEntity, type NpcEntityOptions } from 'mcbeui';
import 'mcbeui/styles.css';

export function Actor({ frame, inputs }: {
  frame: { width: number; height: number; guiScale: number };
  inputs: NpcEntityOptions;
}) {
  // inputs包含宿主求值的model /view /projection /viewport /material。
  const command = createNpcEntity({ ...inputs, skin: 'npc_6' });
  return <GuiLayer {...frame} commands={[command]} label="NPC preview" />;
}

// 由宿主把<Actor frame={...} inputs={...}/>作为NpcPortrait.actor或
// NpcEditor /NpcDialogue的actor、NpcSkin.actor传入；各槽的相机可不同。
```

宿主按实际输出尺寸配置frame，矩阵不会根据CSS大小自动重新取景。`GuiLayer`保留已有loading /ready /error、`onReady` /`onRenderError` /`onRenderStateChange`与`renderKey`重试合同；需要语义DOM回退时，由宿主在完整层ready前保留。低层`renderGuiLayer`也接受entity draw，但需要已经解码的单张纹理，纯`createNpcEntity`不fetch、不建GPU。

|输入|单位与所有权|
|---|---|
|skin|精确大小写alias或源variant整数0…59；省略选源数组首项，不代表游戏UI默认binding。|
|model /view /projection|必填、列主序`Float32Array(16)`；复制输入，无捕获相机或隐式near /far。|
|viewport /scissor|完整frame内的物理整数`[x,y,width,height]`；viewport必填，scissor可选。独立于CSS /DPR /game单位。|
|material|必填`GuiNpcPortraitMaterial`；所有light /fog /color /UV /subpixel字段显式给出。fog范围及距离除数经float32转换后须非零。|
|bonePose|可选完整最终命名矩阵记录，包含隐藏骨骼；每项为`Float32Array(16)`。已是最终pose，不再隐式乘一遍父矩阵。|

`outputRect`只裁输出，不改变全frame投影；裁剪后原viewport不会变成自动fit相机。React准备阶段复制源、矩阵与纹理快照，改变输入应提交新命令；请求取消、context loss或失败仍按既有生命周期回退 /显式重试。entity只接受一个完整64×64叶纹理，不接受拼装atlas。

## 源模型、pose与60皮肤

来源为固定官方`v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。60张完整原PNG、六份完整几何 /动画 /controller /client-entity /behavior-entity JSON及原许可共67件、147,483B，见[npc-actor-assets.json](npc-actor-assets.json)。PNG共129,797B，原编码含RGBA8与indexed8，均解码为64×64；八张存在低 /中alpha，原文件不阈值化。MERS和texture-set描述未分发，不宣PBR支持。

源`Array.skins[query.variant]`的顺序保留为`npcSkinNames`；alias大小写和variant一一对应。行为文件`minecraft:npc.npc_data.skin_list`另有明确外观顺序，由`npcAppearanceOptions`保留；UI collection ID到实体variant的实时引擎传输仍未恢复。支持的`npc-box64-rigid` profile保留10骨骼、13源cuboid、box UV与inflate；controller可见性留下8可见骨骼 /11 cuboid，生成66面 /264顶点 /396索引。不是通用Bedrock实体引擎，不支持任意模型、mirror、旋转cube或任意纹理尺寸。

外观列表位置不等于variant。例如`npcAppearanceOptions[20]`是`{variant:25,skin:'npc_teacher_1'}`，而`npcSkinNames[20]`仍是`'npc_apiary_1'`。选择器应保留条目的variant作为稳定ID，渲染时传variant或skin；不要把选项下标直接当作实体variant。数组及每条记录均冻结，公开类型为`readonly NpcAppearanceOption[]`。

```tsx
import { npcAppearanceOptions, type NpcSkin } from 'mcbeui';

// actor由宿主使用createNpcEntity与各槽明确的相机配置提供。
const skins: readonly NpcSkin[] = npcAppearanceOptions.map(({ variant, skin }) => ({
  id: String(variant), label: skin,
}));
// <NpcSkinPicker skins={skins} onValueChange={id => selectVariant(Number(id))}/>
```

这里保留原alias作为示例label，不推造游戏中的本地化名称。`#npc`人物gallery按同一原外观顺序分页；其选项下标只作gallery本地页面状态，绘制命令明确使用条目的variant。

省略bonePose时，从原general动画的折臂参数和骨骼层级生成有限folded-idle。CPU对五份原生CBV的640个可见pose float字段逐位一致；这不恢复Molang的`this`、运动 /look-at /baby query或live动画。显式pose可以覆盖全部10个骨骼，源与矩阵均隔离复制。`createNpcEntity`处理原JSON数据，不执行任意引擎脚本或世界操作。

```sh
python scripts/prepare-npc-actor-assets.py --check
```

工具只在源码仓库使用；检查无需私有archive。资源保持Mojang原权属与EULA，库代码MIT不重新许可这些原件。

## 有限材质与深度

`npc-portrait`是一个明确的有限材质profile：POINT采样、材质alpha小于0.5丢弃，存活片元写alpha1；lighting /fog /UV动画值来自显式输入。源PNG低alpha仍保留，不把源文件改成binary-alpha，也不认证所有原生材质分支。

entity与image /sprite /model /text按命令顺序画同一个RGBA8目标，实体使用经过能力检查的D24S8、LESS深度比较与深度写入，blend与cull关闭；同次渲染多个entity共用一次depth1 /stencil0清理。后续2D命令恢复自己的状态。库对不支持的深度 /uniform能力或超过有界资源输入报错，不把不支持能力静默当作已认证路径。这些是具体实现边界，不保证总驱动显存、任意浏览器或帧率。

## native-01实际比较

独立硬件批通过公共`src/index.ts`的`createNpcEntity`＋`renderGuiLayer`，使用npc_1…npc_5完整原PNG，省略bonePose、运行正常源编译与默认folded-idle。相机 /model /view /projection /material /scissor和原PRE framebuffer背景为**捕获fixture显式输入**，不作为产品默认；没有把捕获VB、bone palette或遍历ID表作为模型输入。

保留2570×1402全frame投影，输出矩形`[885,686,800,319]`。五个完整scissor各51,040像素，共255,200像素，与原生isolated postG56…60严格RGBA零差；包含未改背景、边缘和每scissor的160个alpha204像素，无silhouette mask、epsilon或丢弃边缘。先行空commands背景copy也对全部255,200像素严格零差，两道门禁分开，不累加为更大的实体覆盖数。

实际为Chromium156 /ANGLE NVIDIA RTX3050 Laptop /D3D11，一次完整批、无retry /换后端；真实FBO depth24 /stencil8、一清理、五次396-index draw。518个root输入 /552个总输入前后不变。证据为`.cache/npc-entity-independent-qa-01/native-01/runs/native-01/FINAL.json`及同目录`RESULT.md`，按各自源freeze身份保留。

这证明一个已捕获相机 /材质 /姿态下五个整裁剪的有限匹配，不是全部60皮肤或全部GUI pixel perfect。正常UI自动取景、camera /scale /垂直放置、其他portrait角色与对话状态、UI到variant绑定、live动画 /PBR /其他材质、全部GPU后端、完整NPC GUI /DOM字体及world /Present仍有独立缺口。新的原版采集与客户端 /包测试各自记录实际执行结果，不把来源、list-only或旧154值消费者结果当作新156值包认证。

## 实体渲染阶段验收（156值）

独立CPU审查发现helper的`instanceof Float32Array`会拒绝真实跨realm矩阵，现统一使用typed-array intrinsic kind校验，仍拒绝伪造标签 /Int32Array /DataView，并复制输入。helper phase03的18组检查、640个原生pose字段位级一致、无IO与完整源码 /demo类型检查通过；仅helper校验改变，没有改模型、相机或材质。

最终实体正式14项通过，19个合成完整RGBA门禁零差；相关旧`gui-image-layer` /`gui-layer-tga` /`gui-layer` /`gui-model` /`gui-sprite`五文件77项全部通过，零skip /retry /flaky。824项输入前后不变，18个实际绘制context均为NVIDIA /D3D11。依据`.cache/npc-entity-contract-qa-03/FINAL.json`（SHA256 `c13a940a023bf943de511918f2eb72b84e88057653100c22f0d1c9a62973ac5b`）。这些合同检查独立于原生像素门禁，不累计成更多原生覆盖。

qa02首批10通过 /第11失败 /后3未执行的证据保留。第11错误地要求原地修改React props后最终ready节点仍忽略改动，与已有React不可变输入合同冲突；qa03改为观察首次实际FBO readback，保留model /pose /source /material四处突变及原始完整RGBA预期。产品未为通过该断言修改，首次请求快照和真实位图关闭归属均通过。

helper phase03完成后，fresh518项源身份下重新运行原生两道门禁，背景copy与五人物完整255,200像素仍各自严格RGBA零差；552个总输入前后不变，一次执行 /无retry /同一NVIDIA-D3D11后端。最终证据`.cache/npc-entity-independent-qa-01/native-attrs-02/runs/helper03-native-01/FINAL.json`（SHA256 `5791e534575daca002b03cf79a374b8853723beff4c533333c151e5162ce1f94`）；旧native-01身份仍单独保留。

最终源码包通过React18.3.1和19.3.1实际安装消费者：156运行时值、ESM /SSR、strict NodeNext类型、全部原门禁、60皮肤、66份原件与许可均通过，两消费者各542个包文件逐字节等同所测tar。1,115项输入无变化，额外installed跨realm CPU检查通过。依据`.cache/npc-entity-package-qa-02/FINAL.json`（SHA256 `c824dfa2010e77398efb1340989ac98ea5364e851a7f2a2ae55e26eb878830a1`）；该所测源码tar为`79ff50800f55ab04921b2c98cc9fa4095557b86baaea9ac5fa8b8007d8674462`，3,677,516B。文档收尾后的交付tar另核非文档payload，不把源码tar身份写成最终文档包身份。

公开`#npc`人物gallery的22项辅助检查全部通过：12页各五个模型覆盖60个源alias，实际每次ready为五次396-index绘制，1 /2 /3倍物理输出、390px窄屏局部横向移动、延迟图片时loading门禁、真实context loss及Retry均通过。19个实际gallery context均为NVIDIA /D3D11，723项输入无变化，page /console /HTTP /request错误和warning均零。依据`.cache/npc-entity-independent-qa-01/gallery-01/runs/public-02/FINAL.json`（SHA256 `495c7d3cdfb8ff1edb078da3f9e9e3cf9b36a93232116260ced59c041de35f27`）。这是显式宿主相机的公开集成验收，不是60皮肤原生像素认证；首公开批observer在documentElement尚null时初始化失败的原记录保留，第二批仅将observer目标改为document，未改产品或断言。

## 外观顺序增量验收（157值）

完整原行为文件`behavior_pack/entities/npc.json`为5,098B，SHA256 `1dfce74b80b8603d183eae864d209256b301bc2d4901753ccf25a0ae3d1f68b4`。资产准备及两种只读检查通过，新资源库67件；此前66件的bytes /SHA /mtime均保持。行为文件中的60个variant经源controller映射为只读外观选项，25个列表位置与controller数组下标不同，包括教师 /建筑 /养蜂及两组Business皮肤。原`npcSkinNames`和工厂的数字variant含义保留。

完整15项实体合同通过，包含此前14项与新的独立外观数据合同；该合同直接读完整原行为 /controller JSON验证60项全序、双射、非连续分组、冻结及名称 /数字variant工厂一致性和零IO。19个合成完整RGBA门禁仍零差，825项输入前后不变，18个实际绘制context均为NVIDIA /D3D11。依据`.cache/npc-appearance-contract-qa-02/FINAL.json`（SHA256 `a31122d005dc69252255a7b3200e2ca59e00859062fc6637357391085eb9b591`）。本增量未重复旧77项或原生像素批，旧结果仍保留其源身份；不把原生255,200像素门禁扩展到新的UI选择传输或全部皮肤。

实际157值源码包通过React18.3.1 /19.3.1安装消费者的ESM /SSR、完整旧新资源门禁、67件原资源 /许可、全部60项外观映射和冻结、strict NodeNext及新只读类型。两消费者各543个文件逐字节等同所测tar，1,062项产品输入前后不变；README等说明文档明确排除于产品身份冻结。依据`.cache/npc-appearance-package-qa-01/FINAL.json`（SHA256 `35e3f2b39b2a90db31c66e8bd938dedfb3ffe50cf2ad8c01454e990e11378cc2`）。所测tar为`95eee4289c60fa638e46a977a99805a6341226a2573d3520ed4d82059ecbc469`、3,682,335B；最终文档交付包另核非文档payload。

新公开gallery完整22项辅助检查通过，覆盖60选项 /12页；读取实际绘制时绑定纹理的alias，独立核对原行为文件和controller，不仅核对文字。第5 /6 /7页分别为教师 /建筑 /养蜂，第10 /11页分别为EverydayBusiness /BusinessMobs；另直接选择这些页的第二项，页面接受的variant和实际GPU纹理均一致。原1 /2 /3倍、390px局部横移、延迟图片loading及真实GLloss /Retry合同保留并通过。24个实际gallery context均为NVIDIA /D3D11，726项总输入无变化，page /console /HTTP /request错误和warning均零。依据`.cache/npc-entity-independent-qa-01/appearance-public-01/runs/public-01/FINAL.json`（SHA256 `1cad4b328bd5622feaf7aafd177e7470c7f5fcdb82a9cce34e64feaa81fc8170`）。这是正常Web选择映射和绘制绑定验收，不宣Minecraft运行时collection传输、60套原生像素或自动取景完成。

自动取景仍未恢复。后续CPU研究找到一个受独立场景Y201与float32包围盒量化支持的Basic缩放候选，但Basic的32×64矩形无法区分两种规则，对话页两种延伸都失败，因此没有将候选写成产品默认。行为文件的picker /portrait offsets仍是原始参数，不能直接当最终model矩阵。该研究没有新增GPU采集、修改相机或扩大像素认证范围。
