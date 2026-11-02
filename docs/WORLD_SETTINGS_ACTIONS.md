# World settings actions

`WorldSettingsActionButton` 实现 Classic `settings_common.action_button`／`action_button_dark_text` 的原图状态；`WorldLaunchActions` 实现 `world_section` 的 Bedrock／Education 启动行。这是完整创建／编辑世界设置页的可复用部分，**还不是完整 WorldSettingsScreen**。

固定公开来源为 Mojang Bedrock Samples `v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。世界字段、普通设置、资源包、权限、实验列表和 Realm 服务仍有各自的绑定，不由这两个部件伪造。

```tsx
import {WorldLaunchActions, WorldSettingsActionButton} from 'mcbeui';
import 'mcbeui/world-settings-actions.css';

const font = {family: 'My game font, monospace', size: 10, lineHeight: 10};
const state = {label: '创建', enabled: true, labelMaxHeight: 20};

<WorldLaunchActions width={260} scale={2} font={font} hiddenSlots="collapse"
  model={{edition: 'bedrock', mode: 'create', pregame: true, editor: false,
    primary: state,
    realms: {label: '在 Realms 上创建', enabled: true, visible: true, labelMaxHeight: 25}}}
  onAction={detail => handleRequest(detail)}
/>

<WorldSettingsActionButton size={[260, 30]} scale={2} font={font}
  tone="light" label="复制世界" labelMaxHeight={10} target="copy_world_button"
  onAction={detail => handleRequest(detail)}
/>
```

## 源布局与宿主输入

尺寸均为逻辑单位；`scale` 是 1–32 的整数，每个物理轴不超过 8192，总面积不超过 16,777,216。百分比子宽保留小数，不悄悄取整。字体 family、size、lineHeight 和标签最大高度显式提供；这些不表示引擎字体 atlas、baseline 或 intrinsic 已恢复。

启动行高 35。Bedrock 主按钮占 `fill`，Realms 占 50%；Realms 被 editor 条件 `ignored` 时不生成，主按钮占满行。`visible:false` 的占位语义未恢复，调用者必须选择 `hiddenSlots:'reserve'|'collapse'`。`pregame:false` 对应整个源栈被 ignored，不生成 DOM 或保留按钮 ref。Education 的 Play／Host 各占一半，Host 与 Play 使用相同源 target，分别带 `shouldHost:true/false`。

源 selector 中的 Bedrock 实例把主标签最大高度覆盖为 20，Realms 子实例为 25；底层通用标签默认最大高度为 10。API 要求传入实际上下文的 `labelMaxHeight`，不把这三个值混为一个默认。文字单行裁切、无 shadow；pressed 标签下移一个逻辑单位，按钮自身尺寸与比例不变。

独立操作按钮的 `tone` 为 `light`、`dark` 或 `realms`。原图 skin 在一单位 inset 内，内容区三单位 inset，focus border 使用原白色纹理和源状态色。light 默认／锁定文字为 .3，hover／pressed 为白；dark／realms 默认白、锁定 .7。六张深色／Realms PNG 和原元数据复用现有素材，未重绘、缩放或生成新物品图。详见 [素材清单](world-settings-assets.json)。

## 请求与真实控件

| edition / mode | 按钮 | target | 附加数据 |
| --- | --- | --- | --- |
| Bedrock create / template-create | Primary | `create_world_button` | — |
| Bedrock edit（含 editor） | Primary | `play_world_button` | editor 只改变宿主 caption |
| Bedrock create / template-create | Realms | `create_world_on_realm_button` | — |
| Bedrock edit | Realms | `play_world_on_realm_button` | editor 中 ignored |
| Education create / template-create | Play / Host | `create_world_edu_button` | `shouldHost:false/true` |
| Education edit | Play / Host | `play_world_edu_button` | `shouldHost:false/true` |

这些源 target **没有 `button.` 前缀**。独立按钮的 `target` 是宿主已解析的源名称；它不替宿主执行创建、连接、导出、复制、删除或其他文件操作。

所有按钮使用原生 button，ref 指向实际 DOM；React 18／19 callback cleanup 都会执行。支持原生 disabled、hidden 和 inert；inert 保留外观并阻止输入。`buttonProps` 保留原生事件，`buttonRefs` 分别访问主按钮、Realms、Play 或 Host。

原生 `onClick` 同步执行；`onAction` 在完整事件传播后发出。叶控件、祖先或 document 的 `preventDefault` 都能否决。点击开始时记录已提交状态；宿主同步替换模式／目标、禁用、隐藏、inert 或卸载时，旧请求会丢弃。当前有其他原生 modal dialog 持有输入时，合成点击也不能绕过它。旧浏览器不支持 `:modal` 时仅保留原生事件边界，不声称其跨模态行为已验证。

## 验证范围

素材准备工具检查固定 ZIP SHA、6 张完整 PNG、6 份原 metadata 与原许可，不改写既有素材：

```sh
python scripts/prepare-world-settings-assets.py --check
```

当前交互、材质、实际包消费与公开展示的具名结果记录于 `.cache/world-settings-actions-qa-20261103-01`。完整原生世界设置页、字体、百分比栅格、输入设备映射及业务服务仍未认证；Web 状态检查不能代替游戏整页逐像素比较。预览入口为 `/#world-settings-actions`。

源研究还确认：Classic 世界游戏页有 69 个直属控件、41 个字段实例，只有实验功能列表使用其专门 factory；它们不是 ServerCustomContents 的九种 custom_form 控件。两个世界滑块没有直接给出 HTML min/max 域。普通世界游戏模式中被注释的 Spectator／Hardcore radio 不能当作活动选项补入。完整页仍需沿这些实际来源继续实现。

## 本阶段实际结果（2026-11-03）

- browser02 同批 62／62，通过且无 skip／retry；包含桌面与 Pixel 7 的六种模式请求、独立 should_host、ignored／visible、百分比子宽、同步回调状态替换、三层否决、inert、原生 dialog、真实 refs 和源皮肤状态。
- 24 个完整原图九宫格平面，GUI1／GUI2 合计 253,440 个 RGBA 像素严格零差。比较对象是独立读取的原 PNG，不是游戏截图。
- package03 新 tar 实际安装到 React 18.3.1／19.3.1，258 组件／276 运行时导出与既有族包检查通过；每 peer 的本族 9 组 SSR、10 个负类型、6 PNG／6 raw metadata／CSS／许可检查通过。
- 同一实际包在两 peer 的默认 Vite 开发／生产四场景通过，包括原生输入、inert、dialog、源替换、否决及 callback ref 清理。48 个完整操作行开发／生产对比，共 436,800 像素严格零差；仅说明这些 Web 输出一致。
- 真实 built 预览另有桌面／Pixel 7 共 4 项通过，包括中文选项、EDU Host 请求及 320px 宽度。

首轮 browser01 的 54 通过／8 失败保留：两项是真实 stale click，六项是测试错误假定禁用 PNG 为 4×4（实际 2×2）。修正状态捕获顺序和测试的原始尺寸后重跑完整批次，未改原图或放宽容差。该探索批也包含一次 ignored 实现修订，不作为冻结版本资格。早期 package01 的生成 worker 转义、类型 preflight 的 JSX children 约束及 package02 的配套 buttonProps Omit 编译失败均保留，最终 package03 单独通过。显式 children?:never 关闭无效子内容；类型修订前后实际打包 index.js 字节一致。
