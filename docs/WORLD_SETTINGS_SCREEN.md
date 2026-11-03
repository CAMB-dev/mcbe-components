# World 设置整页组合

`WorldSettingsScreen` 将具名字段、World／Add-ons 导航、真实资源包管理器及服务器工厂装配到固定源挂载点。新增可独立使用的 `WorldServerSettings`、`WorldCloudSettings`、`WorldDebugSettings`。当前源码为268组件、6数据和13函数，共287个运行时导出。验证范围见 [本阶段验收](WORLD_SETTINGS_SCREEN_QA.md)。

源基准是 Mojang Bedrock Samples `v1.26.60.5`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。这里只组合 `settings.screen_world_create`、`settings.screen_template_create`、`settings.screen_world_edit` 三个别名；通用设置、Realms、Ore UI 与平台服务不据此视为完成。字体、源表达式求值、实际 provider 数据、内在尺寸和原生整页像素仍有边界。

## 固定结构

| 内容 | 实际源顺序／行为 |
| --- | --- |
| World 组 | Game → Classroom wrapper → Server → Multiplayer → Education Cloud → Debug |
| Packs 组 | level texture packs → add-ons |
| 根内容 | `settings.section_content_panels` 是 panel，World／Packs 两组重叠，各组内部独立纵向堆栈 |
| 内边距 | Frame 已解析根 W−4、offset `[2,0]`、底部4预算；整页不重复缩进 |
| Header／Footer | 源 controls 数组为空，不添加 Save footer |
| 弹出层 | 使用同一 Frame content popup host |

`mode` 必填 `create | template-create | edit`。模板创建不等于普通创建；例如世界名输入必须遵循实际 `$is_world_create` 分支。

## 受控快照

`WorldSettingsScreenProps` 保留 `SettingsFrame` 的真实 div ref、controller ref、返回按钮和模态接口；整页拥有 selector、content、header、footer，不接收自由 children／ReactNode 页面。必填字段包括 `snapshot`、`value`、`layout`、`font`、`typography`、`navigation`、`hiddenSlots` 和 `contentLayout`。

`snapshot` 的结构固定为四项：

- `context`：World inclusion、Education、pregame、NX、publish、Editor、Cloud、multiplayer client、debug 等显式输入。三别名的基础 Realm／通用设置门保持源常量关闭。
- `navigation`：完整 World 导航数据，context 由整页统一传入；不能再传第二份 context。
- `views`：七个实际视图布尔值 `game_button_toggle`、`server_settings_button_toggle`、`multiplayer_button_toggle`、`cloud_button_toggle`、`world_debug_button_toggle`、`level_texture_pack_button_toggle`、`addon_button_toggle`。
- `pages`：game／multiplayer／server／cloud／debug／level／addon／classroom 八个具名快照。模块被 ignored 时允许显式 null；仅 view-hidden 时仍须完整快照，保持模块与真实 DOM 身份。任何非 null 数据，包括 ignored 分支，都会预检。

受控 `value: WorldSettingsNavigationId | null` 与原始 `views` 分开。点击导航只请求宿主变更；库不把选择偷偷归一化为单个可见页。原始多个 true 视图会保留。`hiddenSlots` 必须明确选择 `reserve | collapse`；隐藏节点不可交互。

`contentLayout: 'max-allocated-groups'` 明确声明 Web 内在高度策略：重叠组采用最大已分配高度。它不是已恢复的通用原生 `%c` 规则。`layout` 不接收 contentHeaderHeight／contentFooterHeight，因为实际源为空。

`onRequest` 是判别联合：frame、navigation、launch、field（含 section）、server-value、server-submit、pack（含 section）、classroom。所有变更由宿主接受；库不写世界、不调用服务器、不自动打开 URI。`fieldOptions`、`serverOptions`、`packOptions`、`sectionRefs`、`popupHostRef` 提供具名真实控件接入。

## Server：工厂和独立提交

`WorldServerSettings` 转发 div ref，代表 `world_section.server_section@server_form.custom_form_scrolling_content`。这个子模块自己还有 W−4、offset `[2,0]`，区别于根 Frame 已有的缩进。

`snapshot` 必须包含：

- `'#custom_form_length'`、`fields`：完整集合，保留 label／toggle／slider／step_slider／dropdown／input／header／divider／multiselect 九种工厂类型。
- `value`：每个可编辑字段的已接受值，包含隐藏项。
- `'#submit_text'`、`'#submit_button_visible'`。
- `metrics.generatedHeight`：宿主明确解析的 generated_form 高度；`metrics.submitLabelMaxHeight`：提交文字预算。

`ServerCustomContents` 只负责 generated_form。其后独立32高 light 提交按钮是真实 sibling；target 为 `button.submit_custom_form`，文字元数据保留 `#submit_text` 的 global／once。没有第二个 ServerCustomForm 全屏壳或 HTML 自动 submit。

`onValueRequest` 给出 custom_form 集合、源 index、sourceControl、稳定 control、候选 value 和原字段 change；`onSubmitRequest` 给出实际 target 与当前已接受值。原生 input／select 事件通过字段 detail 传递，延迟通知保留事件快照的稳定 currentTarget。真实 option click 和 submit 支持晚到祖先／document 否决；原生不可取消事件或已经消费的键盘动作不承诺任意回滚。控件被移到原 Server 容器外，即使仍 connected，也失去发送资格。多选按钮的可访问名称包含当前显示摘要，已包含摘要的宿主名称保持原样。

## Cloud 和 Debug

两者与 Game／Multiplayer 复用 `SettingsFields` 的同一生命周期、真实 DOM、popup 和请求通道，不接收自由 rows。共有17种字段 kind；新增实际 underline-action、image。完整绑定清单及嵌套结构见 [源字段数据库](world-settings-fields-source.json)。

| 页面 | 直属／展开记录 | bindings | conditions | strings | metrics |
| --- | --- | --- | --- | --- | --- |
| Cloud | 5／9 | 6 | 1 | 5 | 9 |
| Debug | 7 | 163 | 1 | 0 | 7 |

Cloud 使用实际 `edu_common.underline_button`：10高状态、文字 offset `[2,1]`、底部1像素平铺下划线和0.6 alpha；hover／pressed 为源绿色。精确 `textures/ui/icon_external_link` 及 JSON 在固定 ZIP 中缺失，必须传 `snapshot.images` 解析的 URL 与物理 sourceSize，不能自动换成相似图。显示9×9与原图物理大小分开。

固定 zh_CN 缺少以下五个 Cloud 字符串：`menu.eduCloudStorage.caps`、`options.cloudFileNameTitle`、`options.cloudFileLastChangedTitle`、`options.cloudToggleCloudSave`、`options.cloudHelpText`。宿主显式提供文字；示例中文不是声称恢复的官方翻译。示例外链图为宿主明确选择的原始20×20资源，也不是找回了缺失文件。

Debug 三个下拉保留2／74／74，共150个实际 radio。源中的英文是 literal，不伪装成本地化键；匿名选项保持规范 `$slot[index]` 身份。版本显示使用真实 `#base_game_version_debug_text`。

## Classroom 外部模块

固定源仅引用 `classroom_settings.classroom_section`，未提供该 namespace 的实现。Education 激活该模块时，必须提供 `classroomModule`，其中 `sourceIdentity` 固定为这个源身份，`Component` 为实际 React component；模块快照是 `{visible, height, data}`，data 必须是有限普通数据。

适配组件接收宿主数据、宽高、scale、font、mode、visible、disabled、readOnly、inert、统一 popupHost 和 onRequest。库提供挂载与请求归属接口；测试中的 ExternalClassroom 按钮只是明确测试替身，不是交付的 Minecraft Classroom GUI。缺少真实模块会明确拒绝，不能用普通表单假装实现。

## 样例和边界

展示入口 `#world-settings` 直接使用公开整页组件，含三模式、触控、禁用、只读、游戏内服务器、Debug 开关与独立 Cloud 预览。宿主示例数据和接受规则在 `demo/world-settings-screen-data.ts`，不成为库运行时默认值。

使用聚合 `mcbeui/styles.css` 提供现有服务器基础控件皮肤；可选加载 `mcbeui/fonts.css` 使用开放字体。新增 `mcbeui/world-settings-screen.css`、`mcbeui/world-server-settings.css` 子路径提供组合样式，其基础控件样式仍应由消费项目引入。

开放字体不是原版 Mojangles 的度量认证。此阶段不把 Web 开发／生产相同画面、共享材质引擎或 source snapshot 验证称为 Minecraft 原生整页 pixel perfect。
