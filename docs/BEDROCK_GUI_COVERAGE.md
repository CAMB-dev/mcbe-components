# Bedrock Classic GUI覆盖清单

这是固定官方源文件与本库133个公开组件快照的**范围映射**，不是原生像素验收表。133组件包含基础控件、可复用零件及组合，不能读作133个完整游戏GUI；A类的24个文件也不代表24个完整原生流程已完成。

固定来源为官方 `v1.26.60.5-full`，commit `15701fa9c13923f12662984c32c124327e40e3d3`。实际 `resource_pack/ui` 有206个JSON文件、合计5,895,077字节；全部解析后发现198个顶层显式或继承的screen root，分布于128文件。root包含base /template /alias，不代表198个独立可访问界面，也不证明运行时注册、平台可用性或活动覆盖。

本快照将全部133组件逐项对应到当时真实barrel导出与TS /TSX模块；后续版本应重新审计。文件覆盖状态不用于计算Minecraft覆盖百分比或测试通过率。

## 八种状态

|代码|机器状态|文件数|含义|
|---|---|---:|---|
|A|`implemented_named_family_scoped`|24|已有命名族，范围限定：已有专门组合；不代表整文件、全部状态、引擎或native像素完成。|
|B|`partial_existing_parts`|16|已有部分零件：如AchievementToast不等于AchievementScreen，HUD部件不等于所有HUD工厂。|
|C|`generic_composition_candidate`|34|通用组合候选：现有部件可供宿主组合；未提供专门完整GUI，也不要求每个设置页增加wrapper。|
|D|`shared_dependency_not_screen_requirement`|32|共享依赖：模板、资源或基础模块，不按一文件一组件来计缺口。|
|E|`confirmed_missing_named_family`|15|缺少命名族：该源族确实存在，但133组件快照无对应专门公开组合；基础控件可能已有。|
|F|`pocket_not_certified`|16|Pocket未认证：Classic组件不能认证Pocket布局。|
|G|`optional_family_unmapped`|63|可选族未建立映射：教育、平台、账户、交易等来源仍保留；服务能力由宿主负责。|
|H|`unknown`|6|证据不足：保持未知，不强制归为已覆盖或必需新增。|

## 尚缺的15个命名族

以下表示源文件存在、该快照没有专门公开组合，不表示所有功能都须另建组件或由库接管外部服务。教育 /平台功能、通用宿主组合与Pocket仍应按产品范围单独决定。

|命名族|实际源文件|
|---|---|
|教育黑板 /Chalkboard|`chalkboard_screen.json`|
|片尾名单 /Credits|`credits_screen.json`|
|表情轮盘 /EmoteWheel|`emote_wheel_screen.json`|
|百科文档 /Encyclopedia|`encyclopedia_screen.json`|
|玩法文档 /HowToPlay|`how_to_play_screen.json`|
|教育沉浸式阅读器|`immersive_reader.json`|
|邀请 /人员浏览|`invite_screen.json`|
|NPC对话 /编辑|`npc_interact_screen.json`|
|玩家权限编辑|`permissions_screen.json`|
|教育作品集 /Portfolio|`portfolio_screen.json`|
|截图 /照片界面|`screenshot_screen.json`|
|ServerForms：LongForm /CustomForm|`server_form.json`|
|开始菜单 /StartMenu|`start_screen.json`|
|存储管理|`storage_management.json`|
|UGC查看器|`ugc_viewer_screen.json`|

**下一优先：ServerForms**（`server_form.json`）。源内有LongForm /CustomForm的225×200组合及字段工厂；已有ServerList是服务器列表，不是服务端动态表单。此次不据此推断MessageForm、后端协议或native parity。NPC对话、EmoteWheel及可复用HowToPlay /Encyclopedia文档查看器也有明确缺口。

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
|`emote_wheel_screen.json`|persona_emote|1|E|—|
|`enchanting_screen.json`|enchanting|1|A|EnchantingTable、EnchantmentOption、EnchantingBook、EnchantingRunes|
|`enchanting_screen_pocket.json`|enchanting_pocket|0|F|—|
|`encyclopedia_screen.json`|encyclopedia|1|E|—|
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
|`how_to_play_screen.json`|how_to_play|1|E|—|
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
|`npc_interact_screen.json`|npc_interact|1|E|—|
|`online_safety_screen.json`|online_safety|2|G|—|
|`pack_settings_screen.json`|pack_settings|1|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`panorama_screen.json`|panorama|0|G|—|
|`patch_notes_screen.json`|patch_notes|2|C|Dialog、Panel、SettingRow、TextField、Button、ScrollArea|
|`pause_screen.json`|pause|1|B|PauseMenu|
|`pdp_screen.json`|pdp|1|G|—|
|`pdp_screenshots_section.json`|pdp_screenshots|0|G|—|
|`perf_turtle.json`|perf_turtle|0|G|—|
|`permissions_screen.json`|permissions|1|E|—|
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
|`server_form.json`|server_form|1|E|—|
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

完整逐文件字节SHA、定义 /继承 /模板引用与映射依据保留在 `.cache/classic-full-screen-coverage-02/SOURCE-INVENTORY.json`、`FILE-COVERAGE.json`、`COMPONENT-MAP.json` 及 `REPORT.md`；本页逐行取自该冻结映射，没有省略无screen root、可选或unknown文件。固定官方源入口：[ui目录](https://github.com/Mojang/bedrock-samples/tree/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/ui)。
