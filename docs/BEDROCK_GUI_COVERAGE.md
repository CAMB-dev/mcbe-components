# Bedrock Classic GUI覆盖清单

这是固定官方源文件与本库155个公开组件的**范围映射**，不是原生像素验收表。155组件包含基础控件、可复用零件及组合，不能读作155个完整游戏GUI；A类的30个文件也不代表30个完整原生流程已完成。

固定来源为官方 `v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。实际 `resource_pack/ui` 有206个JSON文件、合计5,895,077字节；全部解析后发现198个顶层显式或继承的screen root，分布于128文件。root包含base /template /alias，不代表198个独立可访问界面，也不证明运行时注册、平台可用性或活动覆盖。

基础审计将当时133组件逐项对应到真实barrel导出与TS /TSX模块。ServerForms两个组件的实际37项合同与149值包消费通过后，仅将server_form.json从E更新为A。后续NPC五组件完整44项客户端合同通过，再仅将npc_interact_screen.json从E更新为A，相对前一快照其余205行逐字保留，该阶段组件数140。NPC154值React18 /19新包与56项公开辅助亦已通过；这两个增量不补造原生认证，文件状态也不用于计算Minecraft覆盖百分比或测试通过率。

## 八种状态

|代码|机器状态|文件数|含义|
|---|---|---:|---|
|A|`implemented_named_family_scoped`|30|已有命名族，范围限定：已有专门组合；不代表整文件、全部状态、引擎或native像素完成。|
|B|`partial_existing_parts`|16|已有部分零件：如AchievementToast不等于AchievementScreen，HUD部件不等于所有HUD工厂。|
|C|`generic_composition_candidate`|34|通用组合候选：现有部件可供宿主组合；未提供专门完整GUI，也不要求每个设置页增加wrapper。|
|D|`shared_dependency_not_screen_requirement`|32|共享依赖：模板、资源或基础模块，不按一文件一组件来计缺口。|
|E|`confirmed_missing_named_family`|9|缺少命名族：该源族确实存在，但当前组件快照无对应专门公开组合；基础控件可能已有。|
|F|`pocket_not_certified`|16|Pocket未认证：Classic组件不能认证Pocket布局。|
|G|`optional_family_unmapped`|63|可选族未建立映射：教育、平台、账户、交易等来源仍保留；服务能力由宿主负责。|
|H|`unknown`|6|证据不足：保持未知，不强制归为已覆盖或必需新增。|

## 尚缺的9个命名族

以下表示源文件存在、该快照没有专门公开组合，不表示所有功能都须另建组件或由库接管外部服务。教育 /平台功能、通用宿主组合与Pocket仍应按产品范围单独决定。

|命名族|实际源文件|
|---|---|
|教育黑板 /Chalkboard|`chalkboard_screen.json`|
|片尾名单 /Credits|`credits_screen.json`|
|教育沉浸式阅读器|`immersive_reader.json`|
|邀请 /人员浏览|`invite_screen.json`|
|教育作品集 /Portfolio|`portfolio_screen.json`|
|截图 /照片界面|`screenshot_screen.json`|
|开始菜单 /StartMenu|`start_screen.json`|
|存储管理|`storage_management.json`|
|UGC查看器|`ugc_viewer_screen.json`|

**ServerForms已接入有限源族**（`server_form.json`）：ServerActionForm /ServerCustomForm提供LongForm /CustomForm的225×200组合与typed字段，区别于ServerList。37项客户端合同通过，不据此推断第三MessageForm、后端协议或native parity，详见 [SERVER_FORMS_QA.md](SERVER_FORMS_QA.md)。

后续公开64项辅助也已执行通过，与37正式、Book85及6导航分别记录；它不改变上述八类含义，也不增加任何文件的native像素认证。

**NPC已接入有限源族**（`npc_interact_screen.json`）：五个组合与零件保留student /worldbuilder、basic /advanced /maximized、皮肤选择和action分支，完整44项客户端合同通过；旧ServerForms37 /导航6回归与公开56辅助分别记录，不增加命名族或native认证。actor渲染、引擎权限与缓冲提交时机仍由宿主提供或待恢复，见 [NPC_QA.md](NPC_QA.md)。

**EmoteWheel已接入有限源族**（`emote_wheel_screen.json`）：前阶段四槽轮盘 /预览的42通过 /1设备跳过与触控首败保留原身份；该阶段仅该行 E→A。现新增 `EmoteWheelScreen` 的透明框架、说明条、换装按钮行、关闭请求和方向焦点规则，视觉中心名与无障碍槽位名称独立，组件数143。新38次 Screen 合同均通过，连同未改旧43次批，共80通过 /1个明确设备条件跳过。原生空槽窗口参考促使修正中心留白，JPEG并非原始UI-pass；字体、像素栅格、引擎路由和整页严格比较仍未认证，见 [EMOTE_WHEEL_QA.md](EMOTE_WHEEL_QA.md)。206行范围状态不变，本轮只扩充该行组件映射，其他205行保持原字节。

**双栏文档已接入有限源族**（`how_to_play_screen.json` /`encyclopedia_screen.json`）：DocumentViewer与真实复用的DocumentHeading /DocumentParagraph提供分组导航、两独立DOM滚动视口与文章结构，公开示例各有实际宿主内容。此增量仅两named行E→A，其他204行逐字保留；`how_to_play_common.json`仍是D类共享依赖，不因其中继承screen root而另算完整页面。组件数146 /运行时值163是源码实现计数；本阶段客户端 /包 /原生像素结果尚不据此推断，内容、条件和引擎路由边界见 [DOCUMENT_VIEWER_QA.md](DOCUMENT_VIEWER_QA.md)。

人物渲染增量提供`createNpcEntity`＋`GuiLayer`的有限NPC源模型路径和60皮肤，原生显式相机fixture下五个完整人物裁剪255,200像素严格RGBA零差，见[GUI_ENTITY_QA.md](GUI_ENTITY_QA.md)。该人物渲染增量当时不改变206行范围状态或140组件数，不认证正常自动取景、UI绑定、完整NPC GUI或其他实体引擎。

**Classic权限已接入有限源族**：PlayerPermissions /PermissionLevelSelect /PermissionToggleRow /PermissionPlayerRow使组件数增至150 /运行时值167。正式批次63通过 /2桌面触控条件跳过，公开预览12项、实际React18 /19消费通过后，仅将 `permissions_screen.json` E→有限A，其他205行逐字保留。29→30表示范围映射，不是原生整页认证。当前安装版OreUI为另一profile，Classic实现不认证其字体、响应式布局或服务流程，见 [PLAYER_PERMISSIONS_QA.md](PLAYER_PERMISSIONS_QA.md)。

**OreUI权限是独立profile，未扩充Classic范围状态**：新增五组件使源码总数155 /172，基于安装版HBUI源的角色 /卡片 /说明与响应式分支，当前phase03 React18 /19实际包、完整104项同批101通过 /3设备跳过与公开run03的9项分别通过，selected hover源palette回归仍保持有限Web合同范围。固定ZIP的全部206行与此前Classic表逐字相同，`permissions_screen.json`的有限A只依据Classic已验范围，不代表现代OreUI或native整页已完成；现代资源 /字体与权限服务仍为宿主依赖，见 [ORE_PLAYER_PERMISSIONS_QA.md](ORE_PLAYER_PERMISSIONS_QA.md)。

## 文件与注册声明的边界

`_ui_defs.json` 列出202条路径：201条与archive大小写完全匹配，另有 `ui/persona_sdl.json` 仅唯一casefold匹配实际 `ui/persona_SDL.json`。这是大小写差异，不是缺失GUI；跨平台运行时如何处理未测试。实际文件中有5个未被exact列出：`_global_variables.json`、`_ui_defs.json`、`gamepad_layout_screen.json`、`persona_SDL.json`、`test_anims_screen.json`，不据此判定无用或必需新组件。

`anvil_screen.json` 等核心文件实际存在并已映射；不能以不完整ZIP目录样本推断缺源。JSON模板引用 /namespace继承也不等于ES import或已恢复引擎factory；无screen root的共享文件仍全部列入下表。

## 全部206文件

路径均相对 `resource_pack/ui/`，保留archive真实大小写。root列是声明数；状态代码见上表，部件列仅说明已有复用入口。

|实际文件|namespace|screen roots|状态|已有组件 /部件|
|---|---|---:|---|---|
|`_global_variables.json`|—|0|D|—|
|`_ui_defs.json`|—|0|D|—|
|`achievement_screen.json`|achievement|0|B|AchievementToast、Progress、PlayerCard|
|`add_external_server_screen.json`|add_external_server|3|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`adhoc_inprogess_screen.json`|adhoc_inprogress|1|G|—|
|`adhoc_screen.json`|adhoc|1|G|—|
|`anvil_screen.json`|anvil|1|A|Anvil|
|`anvil_screen_pocket.json`|anvil_pocket|0|F|—|
|`authentication_modals.json`|authentication_modals|1|G|—|
|`authentication_screen.json`|authentication|1|G|—|
|`auto_save_info_screen.json`|auto_save_info|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`beacon_screen.json`|beacon|1|A|Beacon|
|`beacon_screen_pocket.json`|beacon_pocket|0|F|—|
|`beta_feedback_qr.json`|beta_feedback_qr|1|G|—|
|`blast_furnace_screen.json`|blast_furnace|1|A|BlastFurnace|
|`book_screen.json`|book|1|A|BookReader、BookEditor、BookPage、BookPageTurnButton|
|`brewing_stand_screen.json`|brewing_stand|1|A|BrewingStand|
|`brewing_stand_screen_pocket.json`|brewing_stand_pocket|0|F|—|
|`bundle_purchase_warning_screen.json`|bundle_purchase_warning|1|G|—|
|`cartography_screen.json`|cartography|1|A|CartographyTable|
|`cartography_screen_pocket.json`|cartography_pocket|0|F|—|
|`chalkboard_screen.json`|chalkboard|1|E|—|
|`chat_screen.json`|chat|1|B|ChatPanel、ChatMessage|
|`chat_settings_menu_screen.json`|chat_settings|0|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`chest_screen.json`|chest|5|A|Chest、ShulkerBox、ContainerFrame|
|`choose_realm_screen.json`|choose_realm|1|G|—|
|`coin_purchase_screen.json`|coin_purchase|0|G|—|
|`command_block_screen.json`|command_block|1|A|CommandBlockEditor、CommandInput、CommandOutputPanel|
|`confirm_delete_account_screen.json`|confirm_delete_account|1|G|—|
|`content_log.json`|content_log|0|H|—|
|`content_log_history_screen.json`|content_log_history|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`crafter_screen_pocket.json`|crafter_pocket|0|F|—|
|`create_world_upsell_screen.json`|create_world_upsell|2|G|—|
|`credits_screen.json`|credits|1|E|—|
|`csb_purchase_error_screen.json`|csb_purchase_error|1|G|—|
|`csb_screen.json`|csb|2|G|—|
|`csb_sections/content_section.json`|csb_content|0|D|—|
|`csb_sections/csb_banner.json`|csb_banner|0|D|—|
|`csb_sections/csb_buy_now_screen.json`|csb_buy|0|D|—|
|`csb_sections/csb_common.json`|common_csb|0|D|—|
|`csb_sections/csb_purchase_amazondevicewarning_screen.json`|csb_purchase_amazondevicewarning|1|G|—|
|`csb_sections/csb_purchase_warning_screen.json`|csb_purchase_warning|1|G|—|
|`csb_sections/csb_subscription_panel.json`|csb_subscription_panel|0|D|—|
|`csb_sections/csb_upsell_dialog.json`|csb_upsell|1|G|—|
|`csb_sections/csb_welcome_screen.json`|csb_welcome|1|G|—|
|`csb_sections/faq_section.json`|csb_faq|0|D|—|
|`csb_sections/landing_section.json`|csb_landing|0|D|—|
|`custom_templates_screen.json`|custom_templates|1|H|—|
|`data_driven_container_screen.json`|data_driven_container|1|C|ContainerFrame、InventoryGrid、InventoryScreenFrame|
|`day_one_experience_intro_screen.json`|day_one_experience_intro|1|G|—|
|`day_one_experience_screen.json`|day_one_experience|1|G|—|
|`death_screen.json`|death|1|A|DeathScreen|
|`debug_screen.json`|debug_screen|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`dev_console_screen.json`|dev_console|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`disconnect_screen.json`|disconnect|3|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`display_logged_error_screen.json`|display_logged_error|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`edu_discovery_dialog.json`|discovery_dialog|0|G|—|
|`edu_featured.json`|edu_featured|0|G|—|
|`edu_pause_screen_pause_button.json`|edu_quit_button|0|G|—|
|`emote_wheel_screen.json`|persona_emote|1|A|EmoteWheelScreen、EmoteWheel、EmoteSlotPreview（源布局组合，原生像素待验）|
|`enchanting_screen.json`|enchanting|1|A|EnchantingTable、EnchantmentOption、EnchantingBook、EnchantingRunes|
|`enchanting_screen_pocket.json`|enchanting_pocket|0|F|—|
|`encyclopedia_screen.json`|encyclopedia|1|A|DocumentViewer、DocumentHeading、DocumentParagraph（有限宿主百科内容组合，原生像素待验）|
|`expanded_skin_pack_screen.json`|expanded_skin_pack|1|G|—|
|`feed_common.json`|feed_common|0|D|—|
|`file_upload_screen.json`|file_upload|1|B|LoadingScreen、Progress|
|`furnace_screen.json`|furnace|1|A|Furnace|
|`furnace_screen_pocket.json`|furnace_pocket|0|F|—|
|`game_tip_screen.json`|game_tip|0|H|—|
|`gamepad_disconnected.json`|gamepad_disconnected|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`gamepad_layout_screen.json`|gamepad_layout|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`gameplay_common.json`|gameplay|0|B|ItemTooltip、Tooltip|
|`gamma_calibration_screen.json`|gamma_calibration|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`global_pause_screen.json`|globalpause|1|H|—|
|`grindstone_screen.json`|grindstone|1|A|Grindstone|
|`grindstone_screen_pocket.json`|grindstone_pocket|0|F|—|
|`horse_screen.json`|horse|1|A|MountInventory|
|`horse_screen_pocket.json`|horse_pocket|0|F|—|
|`host_options_screen.json`|host_options|0|H|—|
|`how_to_play_common.json`|how_to_play_common|2|D|—|
|`how_to_play_screen.json`|how_to_play|1|A|DocumentViewer、DocumentHeading、DocumentParagraph（有限宿主玩法内容组合，原生像素待验）|
|`hud_crosshair_overlay.json`|hud_crosshair|1|B|Crosshair|
|`hud_screen.json`|hud|1|B|Hotbar、HealthBar、HungerBar、ArmorBar、AirBar、ExperienceBar、BossBar、Crosshair、ActionBar、TitleOverlay、TouchControls、HeldItemTooltip、PlayerList|
|`immersive_reader.json`|im_reader|1|E|—|
|`in_bed_screen.json`|bed|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`inventory_screen.json`|crafting|3|A|CraftingScreen、SurvivalInventoryScreen、PlayerInventoryScreen、CreativeInventory、RecipeBook|
|`inventory_screen_pocket.json`|crafting_pocket|3|F|—|
|`invite_screen.json`|invite|1|E|—|
|`jigsaw_editor_screen.json`|jigsaw_editor|1|A|JigsawEditor、JigsawPriorityFields|
|`late_join_pregame_screen.json`|late_join|1|G|—|
|`library_modal_screen.json`|library_modal|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`local_world_picker_screen.json`|local_world_picker|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`loom_screen.json`|loom|1|A|Loom|
|`loom_screen_pocket.json`|loom_pocket|0|F|—|
|`manifest_validation_screen.json`|manifest_validation|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`marketplace_sdl/sdl_content_navigation.json`|sdl_content_navigation|0|D|—|
|`marketplace_sdl/sdl_dropdowns.json`|sdl_dropdowns|0|D|—|
|`marketplace_sdl/sdl_image_row.json`|sdl_image_row|0|D|—|
|`marketplace_sdl/sdl_label.json`|sdl_label|0|D|—|
|`marketplace_sdl/sdl_text_row.json`|sdl_text_row|0|D|—|
|`mob_effect_screen.json`|mob_effect|1|B|StatusEffect|
|`non_xbl_user_management_screen.json`|non_xbl_user_management|1|G|—|
|`npc_interact_screen.json`|npc_interact|1|A|NpcPortrait、NpcSkinPicker、NpcActionEditor、NpcDialogue、NpcEditor|
|`online_safety_screen.json`|online_safety|2|G|—|
|`pack_settings_screen.json`|pack_settings|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`panorama_screen.json`|panorama|0|G|—|
|`patch_notes_screen.json`|patch_notes|2|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`pause_screen.json`|pause|1|B|PauseMenu|
|`pdp_screen.json`|pdp|1|G|—|
|`pdp_screenshots_section.json`|pdp_screenshots|0|G|—|
|`perf_turtle.json`|perf_turtle|0|G|—|
|`permissions_screen.json`|permissions|1|A|PlayerPermissions、PermissionLevelSelect、PermissionToggleRow、PermissionPlayerRow（有限Classic JSON组合；当前OreUI待实现）|
|`persona_SDL.json`|persona_sdl|0|G|—|
|`persona_cast_character_screen.json`|persona_cast_character_screen|0|G|—|
|`persona_common.json`|persona_common|0|D|—|
|`persona_popups.json`|persona_popups|0|G|—|
|`play_screen.json`|play|1|B|WorldList、ServerList、PlayerCard、Tabs|
|`playfab_sign_in_conflict_help_qr.json`|playfab_sign_in_conflict_help_qr|1|G|—|
|`pocket_containers.json`|pocket_containers|0|B|ContainerFrame|
|`popup_dialog.json`|popup_dialog|0|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`portfolio_screen.json`|portfolio|1|E|—|
|`progress_screen.json`|progress|15|B|LoadingScreen、Progress|
|`rating_prompt.json`|rating_prompt|1|G|—|
|`realmsPlus_sections/realmsPlus_purchase_warning_screen.json`|realmsPlus_purchase_warning|1|G|—|
|`realms_allowlist.json`|realms_allowlist|1|G|—|
|`realms_common.json`|realms_common|0|D|—|
|`realms_create.json`|realms_create|1|G|—|
|`realms_invite_link_settings_screen.json`|realms_invite_link_settings|0|G|—|
|`realms_pending_invitations.json`|realms_pending_invitations|1|G|—|
|`realms_settings_screen.json`|realms_settings|4|G|—|
|`realms_stories_transition_screen.json`|realms_stories_transition|1|G|—|
|`redstone_screen.json`|redstone|4|A|Hopper、Dispenser、Dropper、Crafter|
|`resource_packs_screen.json`|resource_packs|0|B|PackList、PackCard|
|`safe_zone_screen.json`|safe_zone|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`scoreboards.json`|scoreboard|0|B|Scoreboard|
|`screenshot_screen.json`|screenshot|1|E|—|
|`select_world_screen.json`|select_world|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`server_form.json`|server_form|1|A|ServerActionForm、ServerCustomForm|
|`settings_screen.json`|settings|15|B|SettingsPanel、SettingRow、NavigationList、KeybindingField|
|`settings_sections/controls_section.json`|controls_section|0|C|SettingsPanel、SettingRow、Switch、Slider、KeybindingField、Combobox|
|`settings_sections/general_section.json`|general_section|0|C|SettingsPanel、SettingRow、Switch、Slider、KeybindingField、Combobox|
|`settings_sections/realms_world_section.json`|realms_world_section|0|C|SettingsPanel、SettingRow、Switch、Slider、KeybindingField、Combobox|
|`settings_sections/settings_common.json`|settings_common|4|C|SettingsPanel、SettingRow、Switch、Slider、KeybindingField、Combobox|
|`settings_sections/social_section.json`|social_section|0|C|SettingsPanel、SettingRow、Switch、Slider、KeybindingField、Combobox|
|`settings_sections/world_section.json`|world_section|0|C|SettingsPanel、SettingRow、Switch、Slider、KeybindingField、Combobox|
|`sidebar_navigation.json`|sidebar_navigation|0|D|—|
|`sign_screen.json`|sign|1|A|SignEditor、SignTextSurface|
|`simple_inprogress_screen.json`|simple_inprogress|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`skin_pack_pdp.json`|skin_pack_pdp|0|G|—|
|`smithing_table_2_screen.json`|smithing_table_2|0|B|SmithingTable|
|`smithing_table_2_screen_pocket.json`|smithing_table_2_pocket|0|F|—|
|`smithing_table_screen.json`|smithing_table|1|A|SmithingTable|
|`smithing_table_screen_pocket.json`|smithing_table_pocket|0|F|—|
|`smoker_screen.json`|smoker|1|A|Smoker|
|`start_screen.json`|start|1|E|—|
|`stonecutter_screen.json`|stonecutter|1|A|Stonecutter|
|`stonecutter_screen_pocket.json`|stonecutter_pocket|0|F|—|
|`storage_management.json`|storage_management|0|E|—|
|`storage_management_popup.json`|storage_management_popup|0|H|—|
|`storage_migration_common.json`|storage_migration_common|0|D|—|
|`storage_migration_generic_screen.json`|storage_migration_generic|1|G|—|
|`store_common.json`|common_store|1|D|—|
|`store_data_driven_screen.json`|store_layout|11|G|—|
|`store_filter_menu_screen.json`|filter_menu|0|G|—|
|`store_inventory_screen.json`|store_inventory|1|G|—|
|`store_item_list_screen.json`|store_item_list|0|G|—|
|`store_progress_screen.json`|store_progress|1|G|—|
|`store_promo_timeline_screen.json`|promo_timeline|0|G|—|
|`store_sales_item_list_screen.json`|store_sale_item_list|0|G|—|
|`store_search_screen.json`|store_search|1|G|—|
|`store_sort_menu_screen.json`|sort_menu|0|G|—|
|`structure_editor_screen.json`|structure_editor|1|A|StructureEditor、XYZVectorInput|
|`submit_feedback_screen.json`|submit_feedback|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`tabbed_upsell_screen.json`|tabbed_upsell|1|G|—|
|`test_anims_screen.json`|test|1|G|—|
|`thanks_for_testing_screen.json`|thanks_for_testing|1|G|—|
|`third_party_store_screen.json`|third_party_store|1|G|—|
|`toast_screen.json`|toast_screen|1|B|Toast、AchievementToast|
|`token_faq_screen.json`|token_faq|2|G|—|
|`trade_2_screen.json`|trade2|1|A|TradingScreen、TradeOffer|
|`trade_2_screen_pocket.json`|trade2_pocket|0|F|—|
|`trade_screen.json`|trade|1|A|TradingScreen、TradeOffer|
|`trade_screen_pocket.json`|trade_pocket|1|F|—|
|`trial_upsell_screen.json`|trialUpsell|2|G|—|
|`ugc_viewer_screen.json`|ugc_viewer|1|E|—|
|`ui_art_assets_common.json`|common_art|0|D|—|
|`ui_common.json`|common|5|D|—|
|`ui_common_classic.json`|common-classic|0|D|—|
|`ui_edu_common.json`|edu_common|0|D|—|
|`ui_friendsbutton.json`|friendsbutton|0|D|—|
|`ui_iconbutton.json`|iconbutton|0|D|—|
|`ui_purchase_common.json`|purchase_common|0|D|—|
|`ui_template_buttons.json`|common_buttons|0|D|—|
|`ui_template_dialogs.json`|common_dialogs|0|D|—|
|`ui_template_tabs.json`|common_tabs|0|D|—|
|`ui_template_toggles.json`|common_toggles|0|D|—|
|`update_dimensions.json`|update_dimensions|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`update_version.json`|update_version|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`win10_trial_conversion_screen.json`|win10_trial_conversion|1|G|—|
|`world_conversion_complete_screen.json`|world_conversion_complete|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`world_recovery_screen.json`|world_recovery|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`world_templates_screen.json`|world_templates|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`xbl_console_qr_signin.json`|xbl_console_qr_signin|1|G|—|
|`xbl_console_signin.json`|xbl_console_signin|1|G|—|
|`xbl_console_signin_succeeded.json`|xbl_console_signin_succeeded|1|G|—|
|`xbl_immediate_signin.json`|xbl_immediate_signin|1|G|—|

## 证据与复核

完整逐文件字节SHA、定义 /继承 /模板引用与基础映射保留在 `.cache/classic-full-screen-coverage-02/SOURCE-INVENTORY.json`、`FILE-COVERAGE.json`、`COMPONENT-MAP.json` 及 `REPORT.md`；本页全量保留206行，增量将server_form、npc_interact_screen、emote_wheel_screen以及HowToPlay /Encyclopedia接入有限命名族范围。EmoteWheel的受测范围见 `EMOTE_WHEEL_QA.md` 与 `.cache/emote-wheel-tests-01/formal-02`，不增加原生像素认证。ServerForms依据 `.cache/server-forms-independent-qa/formal-04/FINAL.json` 与 `.cache/server-forms-root-close-01/INTEGRATION-PACKAGE-05.json`；NPC依据 `.cache/npc-independent-qa-01/formal-02/FINAL.json`、`.cache/npc-root-close-01/PACKAGE-01.json` 与 `.cache/npc-public-01/production-01/FINAL.json`，三者分别记录合同、实际包消费及公开预览。固定官方源入口：[ui目录](https://github.com/Mojang/bedrock-samples/tree/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/ui)。
