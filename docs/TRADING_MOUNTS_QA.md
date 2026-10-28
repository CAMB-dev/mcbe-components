# 交易与坐骑容器独立 QA

第三轮，2026-10-29。仅认证Classic source profile、原始纹理、Web受控交互和明确的本机原生截图范围；不把宿主villager/horse状态和自定义entity renderer当成已重建的游戏引擎。

独立原始来源：[Mojang v1.26.60.5 full release](https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip)，ZIP SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`。用户安装版1.26.6005.0的`trade_2_screen.json` SHA256 `01126a6eae0e5323f34d63040ef4b60bacd5c8f139e428effd5b92a391ed9334`，`horse_screen.json` SHA256 `f82cefb2ddbe420af3e5912a91df1134d495e1fee46a91cdfe33c62bf6a353da`；与public完整parsed对象一致。20张专属PNG（含后补的purple详情图）原始字节与安装包/full ZIP一致，测试中固定独立尺寸/hash，未读取生产manifest作为oracle。

## 交易源几何与图层

game pixel、GUI2乘2：left136×166、fold4×166、right176×166，总316×166。实际fold皮肤超出名义4宽，仍应遵循原layer遮挡，不能仅取中间条零差后认证全界面。

right top `[7,15,162,61]`。三个主槽为28×28，内部物品24×24；双input时分别 `[7,31.5]`、`[35,31.5]`、result `[75,31.5]`。trade按钮 `[104,36.5,48,18]`；help `[151,36.5,18,18]`。topstack为96+1+48+17=162，help宽18右对齐17宽holder产生1game重合是源算式。主双箭头holder的fill剩余12、每个6，图像宽`100%+3`=9；单input省略第二28后，每个holder20、箭头23，不能仍用固定16。

箭头原图16×13，但left/right metadata slice分别`[7,0,1,0]`/`[1,0,7,0]`，按不对称caps拉伸。XP153×5，root偏移top17；blue slice`[1,0,1,0]`、white`[4,0,4,0]`、empty`[6,1,6,1]`，nub11×5平铺在143×5区域。clip_pixelperfect=false，不人为floor到整数GUI格。公共完成度API与引擎clip_ratio约定应明确区分。

TradeOffer height24、每个holder23，允许源1game重叠。cost/result renderer16×16，main28槽中的renderer24×24。旧价strike尺寸6×2/12×2使用原red_slash5×2和不对称横slice。选中、无法交易和locked是独立状态；locked可保留Web焦点但禁止回调，不把所有red offer误设HTML disabled。

## 坐骑源几何

root176×166；equipment `[7,18]`，每槽18，最多两格。四种原overlay16×16、alpha0.5，源绑定为`#has_*_slot`，独立于物品空值，故occupied时仍应保留underlay并位于真实物品下面。

renderer_bg `[25,18,54,54]`，源内部custom renderer面板16.2×16.2、offset y16.2，最终实体形态没有原生认证。chested storage固定底板 `[79,18,90,54]`，实际grid宽由columns×18决定，不能把strength1/3的空背景缩窄。背包 `[7,86]`、hotbar `[7,143]`；标签、compact close按源profile。

## 执行记录

新增27项独立tests及专用fixture；所有输出`.cache/inventory-third-qa`，独立5194。skin及alpha使用真实PNG和固定源几何独立构造期望，RGBA0不放宽。本文件全部27项均已取得PASS（分批记录如下）；没有完整同状态原生Trading/Mount截图时，不认证整屏。


## 独立首轮发现

59项组合首轮中，本文件23项有21 PASS、2 locked皮肤失败。默认/hover/selected/selected-hover/unavailable/unavailable-hover、四个mount半透明overlay、四个不对称arrow均RGBA0。locked原PNG2×2每像素均117且alpha255，CSS用zero-slice border-image时实际透出底下页面并产生渐变；不是降低disabled透明度的源行为。改为原图普通background stretch，保持outer透明1game边界和所有原PNG不变，复验主体也加同一背景平面避免透明外框环境混入。

额外补验source`slotValidity`对应红色cell_image_red的slice1、3个12game高详情按钮、默认缺rune atlas时不伪造Latin“dab”，以及完整XP empty/white/blue/nub组合。详情图原button_purple4×4 SHA256 `653e726709b3573d7202f7ce2d5030478df72b5eab1f9edd0049174eb7349c70`。新增invalid/purple皮肤均RGBA0。详情的首轮检查因点击自动滚动后使用旧viewport bbox而误报，测试改为先量全部几何后点击，原坐标与容差不变。


新增XP完整组合检查另检出真实916像素差异：Progress的className位于wrapper，而交易CSS将wrapper误当实际track，因此empty/white伪层与directchild bluefill未正确替换，仍画通用经验条。改用真实内层`.mc-progress__track`及其fill选择器后，原empty/white/blue/nub独立组合在quarter/three-quarter分数clip上完整RGBA0，未floor裁切或改变原图。

执行：原59项组合55 PASS、4 FAIL；随后9项定向7 PASS（含两个locked修复），再将详情QA测量时机和XP生产selector修正，2项定向2 PASS。新增后库存36+交易27共63个独立source检查均有PASS，未声称同一次63绿。`npm run typecheck`完整通过；临时5194服务退出。首次失败trace保留`.cache/inventory-third-qa/first-run-evidence/`，全部输出独立目录，不占共享test-results。完整same-state原生交易/坐骑未取得，所以只证明源模型、真实PNG及Web交互，不认证整屏或live_horse_renderer。


后续owner仅修复TradeOffer可访问名称中的旧价/新价语义（没有变PNG、CSS或字色），再次使用本文件原始27项测试、独立5191/output，**单批27/27 PASS**（1.7分钟）；paired DOM的整个Trading section图像0差，label-content-name-mismatch归零。测试与oracle未改，生产保持freeze。
