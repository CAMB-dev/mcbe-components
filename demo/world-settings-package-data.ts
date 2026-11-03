import type {SettingsFieldsProps} from '../src/settings-fields-model';
import type {WorldGameSettingsProps,WorldMultiplayerSettingsProps} from '../src/world-settings-fields';
import type {WorldSettingsNavigationProps,WorldSettingsNavigationImage} from '../src/world-settings-navigation';

/** Complete, finite source qualification snapshots. No game services, inferred
 * defaults, fonts, images or runtime imports. The caller must resolve White;
 * its exact-case source literal is absent. Null providers stay visibly empty. */
export interface WorldSettingsPackageImages {
 readonly white:WorldSettingsNavigationImage;
 readonly thumbnail:WorldSettingsNavigationImage|null;
 readonly pack:WorldSettingsNavigationImage|null;
}
export function createWorldSettingsPackageData(images:WorldSettingsPackageImages):{
 game:WorldGameSettingsProps;multiplayer:WorldMultiplayerSettingsProps;navigation:WorldSettingsNavigationProps;generic:SettingsFieldsProps;
}{
 const game:WorldGameSettingsProps={
  "width": 320,
  "scale": 1,
  "inputMode": "mouse",
  "hiddenSlots": "reserve",
  "typography": {
    "label": {
      "family": "Host exact font",
      "size": 10,
      "lineHeight": 10
    },
    "description": {
      "family": "Host exact font",
      "size": 10,
      "lineHeight": 10
    },
    "control": {
      "family": "Host exact font",
      "size": 10,
      "lineHeight": 10
    }
  },
  "snapshot": {
    "bindings": {
      "#achievement_warning_text": "Host #achievement_warning_text",
      "#achievment_warning_visible": true,
      "#allow_cheats": true,
      "#allow_cheats_enabled": true,
      "#always_day": true,
      "#always_day_enabled": true,
      "#bonus_chest": true,
      "#bonus_chest_enabled": true,
      "#command_blocks_enabled": true,
      "#command_blocks_enabled_on": true,
      "#daylight_cycle": true,
      "#daylight_cycle_enabled": true,
      "#education_toggle": true,
      "#education_toggle_enabled": true,
      "#entities_drop_loot": true,
      "#entities_drop_loot_enabled": true,
      "#experimental_toggle_count": 2,
      "#fire_spreads": true,
      "#fire_spreads_enabled": true,
      "#hardcore_warning_text": "Host #hardcore_warning_text",
      "#hardcore_warning_visible": true,
      "#immediaterespawn": true,
      "#immediaterespawn_enabled": true,
      "#is_hardcore": true,
      "#is_hardcore_enabled": true,
      "#is_world_template_locked": true,
      "#keep_inventory": true,
      "#keep_inventory_enabled": true,
      "#minimum_template_enabled": true,
      "#minimum_template_version": "Host #minimum_template_version",
      "#mob_griefing": true,
      "#mob_griefing_enabled": true,
      "#mob_loot": true,
      "#mob_loot_enabled": true,
      "#mob_spawn": true,
      "#mob_spawn_enabled": true,
      "#natural_regeneration": true,
      "#natural_regeneration_enabled": true,
      "#permission_level_radio_member": true,
      "#permission_level_radio_operator": true,
      "#permission_level_radio_visitor": true,
      "#player_game_mode_dropdown_enabled": true,
      "#player_game_mode_dropdown_toggle_label": "Host #player_game_mode_dropdown_toggle_label",
      "#player_game_mode_dropdown_visible": true,
      "#player_game_mode_radio_adventure": true,
      "#player_game_mode_radio_creative": true,
      "#player_game_mode_radio_default": true,
      "#player_game_mode_radio_spectator": true,
      "#player_game_mode_radio_survival": true,
      "#player_has_world_template_option_unlock_permissions": true,
      "#player_permissions_dropdown_enabled": true,
      "#player_permissions_dropdown_toggle_label": "Host #player_permissions_dropdown_toggle_label",
      "#player_sleep": true,
      "#player_sleep_enabled": true,
      "#player_sleep_percentage": 4,
      "#player_sleep_percentage_enabled": true,
      "#player_sleep_percentage_slider_label": "Host #player_sleep_percentage_slider_label",
      "#player_sleep_percentage_steps": 4,
      "#player_sleep_percentage_text_value": "Host #player_sleep_percentage_text_value",
      "#player_waypoints": true,
      "#player_waypoints_enabled": true,
      "#player_waypoints_everyone": true,
      "#player_waypoints_off": true,
      "#pvp": true,
      "#pvp_enabled": true,
      "#random_tick_speed": "Host #random_tick_speed",
      "#random_tick_speed_enabled": true,
      "#recipes_unlock": true,
      "#recipes_unlock_enabled": true,
      "#respawn_blocks_explode": true,
      "#respawn_blocks_explode_enabled": true,
      "#respawn_radius": "Host #respawn_radius",
      "#respawn_radius_enabled": true,
      "#server_sim_distance": 4,
      "#server_sim_distance_enabled": true,
      "#server_sim_distance_slider_label": "Host #server_sim_distance_slider_label",
      "#server_sim_distance_steps": 4,
      "#server_sim_distance_text_value": "Host #server_sim_distance_text_value",
      "#show_convert_to_infinite_button": true,
      "#show_coordinates": true,
      "#show_coordinates_enabled": true,
      "#show_days_played": true,
      "#show_days_played_enabled": true,
      "#show_new_edit_world_opt_in": true,
      "#show_permissions_dropdown": true,
      "#start_with_map": true,
      "#start_with_map_enabled": true,
      "#tile_drops": true,
      "#tile_drops_enabled": true,
      "#tnt_explodes": true,
      "#tnt_explodes_enabled": true,
      "#weather_cycle": true,
      "#weather_cycle_enabled": true,
      "#world_difficulty_dropdown_enabled": true,
      "#world_difficulty_dropdown_toggle_label": "Host #world_difficulty_dropdown_toggle_label",
      "#world_difficulty_radio_easy": true,
      "#world_difficulty_radio_hard": true,
      "#world_difficulty_radio_normal": true,
      "#world_difficulty_radio_peaceful": true,
      "#world_game_mode_dropdown_enabled": true,
      "#world_game_mode_dropdown_toggle_label": "Host #world_game_mode_dropdown_toggle_label",
      "#world_game_mode_radio_adventure": true,
      "#world_game_mode_radio_creative": true,
      "#world_game_mode_radio_survival": true,
      "#world_name": "Host #world_name",
      "#world_name_enabled": true,
      "#world_seed": "Host #world_seed",
      "#world_seed_enabled": true,
      "#world_template_options_lock_warning_text": "Host #world_template_options_lock_warning_text",
      "#world_type_dropdown_enabled": true,
      "#world_type_dropdown_toggle_label": "Host #world_type_dropdown_toggle_label",
      "#world_type_radio_flat": true,
      "#world_type_radio_infinite": true,
      "#world_type_radio_old": true
    },
    "conditions": {
      "$desktop_screen": false,
      "$education_edition": false,
      "$is_editor_mode_enabled": false,
      "$is_publish": false,
      "$is_world_create": false,
      "($education_edition or $is_seeds_enabled)": false,
      "($education_edition or not $is_seeds_enabled)": false,
      "($is_pregame or $is_editor_mode_enabled)": false,
      "($is_publish and $education_edition)": false,
      "($is_world_create or $trial)": false,
      "($pocket_edition or $education_ios or not $file_picking_supported)": false,
      "(($pocket_edition or $export_disabled or not $file_picking_supported) and not $education_edition)": false,
      "(not $education_edition or not $file_picking_supported)": false,
      "(not $education_edition)": false,
      "(not $is_editor_mode_enabled)": false,
      "(not $is_pregame or not $is_world_edit or not $education_edition)": false,
      "(not $is_pregame or not $is_world_edit)": false,
      "(not $is_world_create)": false,
      "(not $is_world_edit or $is_mp_client or $trial or not $is_pregame or $export_disabled or $is_editor_mode_enabled)": false,
      "(not $is_world_edit or $is_mp_client or $trial or not $is_pregame or $export_template_disabled or $education_edition or $is_publish)": false,
      "(not $is_world_edit or $is_mp_client or $trial or not $is_pregame or $export_template_disabled or $is_editor_mode_enabled)": false,
      "(not $is_world_edit or $is_mp_client or $trial or not $is_pregame)": false,
      "(not $is_world_edit or $is_mp_client or not $trial or not $is_pregame)": false,
      "(not $trial)": false
    },
    "strings": {
      "accessibility.settings.chooseSeed": "Host accessibility.settings.chooseSeed",
      "createWorldScreen.action.editLocal": "Host createWorldScreen.action.editLocal",
      "createWorldScreen.alwaysDay": "Host createWorldScreen.alwaysDay",
      "createWorldScreen.bonusChest": "Host createWorldScreen.bonusChest",
      "createWorldScreen.cheatSettings": "Host createWorldScreen.cheatSettings",
      "createWorldScreen.clearPlayerData.button": "Host createWorldScreen.clearPlayerData.button",
      "createWorldScreen.commandblocksenabled": "Host createWorldScreen.commandblocksenabled",
      "createWorldScreen.daylightcycle": "Host createWorldScreen.daylightcycle",
      "createWorldScreen.defaultName": "Host createWorldScreen.defaultName",
      "createWorldScreen.deleteWorld": "Host createWorldScreen.deleteWorld",
      "createWorldScreen.editor.deleteProject": "Host createWorldScreen.editor.deleteProject",
      "createWorldScreen.editor.projectOptionsLabel": "Host createWorldScreen.editor.projectOptionsLabel",
      "createWorldScreen.educationtoggle": "Host createWorldScreen.educationtoggle",
      "createWorldScreen.entitiesdroploot": "Host createWorldScreen.entitiesdroploot",
      "createWorldScreen.experimentalgameplay": "Host createWorldScreen.experimentalgameplay",
      "createWorldScreen.experimentalgameplayinfo": "Host createWorldScreen.experimentalgameplayinfo",
      "createWorldScreen.fireSpreads": "Host createWorldScreen.fireSpreads",
      "createWorldScreen.gameMode.adventure": "Host createWorldScreen.gameMode.adventure",
      "createWorldScreen.gameMode.creative": "Host createWorldScreen.gameMode.creative",
      "createWorldScreen.gameMode.default": "Host createWorldScreen.gameMode.default",
      "createWorldScreen.gameMode.personal": "Host createWorldScreen.gameMode.personal",
      "createWorldScreen.gameMode.serverDefault": "Host createWorldScreen.gameMode.serverDefault",
      "createWorldScreen.gameMode.spectator": "Host createWorldScreen.gameMode.spectator",
      "createWorldScreen.gameMode.survival": "Host createWorldScreen.gameMode.survival",
      "createWorldScreen.header.general.exportSettings": "Host createWorldScreen.header.general.exportSettings",
      "createWorldScreen.header.general.exportSettings.description": "Host createWorldScreen.header.general.exportSettings.description",
      "createWorldScreen.header.general.project": "Host createWorldScreen.header.general.project",
      "createWorldScreen.immediaterespawn": "Host createWorldScreen.immediaterespawn",
      "createWorldScreen.isHardcore": "Host createWorldScreen.isHardcore",
      "createWorldScreen.keepInventory": "Host createWorldScreen.keepInventory",
      "createWorldScreen.levelSeed": "Host createWorldScreen.levelSeed",
      "createWorldScreen.mobLoot": "Host createWorldScreen.mobLoot",
      "createWorldScreen.mobSpawn": "Host createWorldScreen.mobSpawn",
      "createWorldScreen.mobgriefing": "Host createWorldScreen.mobgriefing",
      "createWorldScreen.naturalregeneration": "Host createWorldScreen.naturalregeneration",
      "createWorldScreen.playerSleep": "Host createWorldScreen.playerSleep",
      "createWorldScreen.playerSleepPercentageDescription": "Host createWorldScreen.playerSleepPercentageDescription",
      "createWorldScreen.playerWaypoints": "Host createWorldScreen.playerWaypoints",
      "createWorldScreen.playerWaypointsEveryone": "Host createWorldScreen.playerWaypointsEveryone",
      "createWorldScreen.playerWaypointsEveryone.description": "Host createWorldScreen.playerWaypointsEveryone.description",
      "createWorldScreen.playerWaypointsOff": "Host createWorldScreen.playerWaypointsOff",
      "createWorldScreen.playerWaypointsOff.description": "Host createWorldScreen.playerWaypointsOff.description",
      "createWorldScreen.pvp": "Host createWorldScreen.pvp",
      "createWorldScreen.randomtickspeed": "Host createWorldScreen.randomtickspeed",
      "createWorldScreen.randomtickspeed.reset": "Host createWorldScreen.randomtickspeed.reset",
      "createWorldScreen.recipesUnlock": "Host createWorldScreen.recipesUnlock",
      "createWorldScreen.respawnRadius": "Host createWorldScreen.respawnRadius",
      "createWorldScreen.respawnblocksexplode": "Host createWorldScreen.respawnblocksexplode",
      "createWorldScreen.showCoordinates": "Host createWorldScreen.showCoordinates",
      "createWorldScreen.showDaysPlayed": "Host createWorldScreen.showDaysPlayed",
      "createWorldScreen.startWithMap": "Host createWorldScreen.startWithMap",
      "createWorldScreen.tileDrops": "Host createWorldScreen.tileDrops",
      "createWorldScreen.tntexplodes": "Host createWorldScreen.tntexplodes",
      "createWorldScreen.weathercycle": "Host createWorldScreen.weathercycle",
      "createWorldScreen.worldManagement": "Host createWorldScreen.worldManagement",
      "createWorldScreen.worldOptions": "Host createWorldScreen.worldOptions",
      "createWorldScreen.worldPreferences": "Host createWorldScreen.worldPreferences",
      "createWorldScreen.worldSettings": "Host createWorldScreen.worldSettings",
      "createWorldScreen.worldType": "Host createWorldScreen.worldType",
      "generator.flat": "Host generator.flat",
      "generator.infinite": "Host generator.infinite",
      "generator.old": "Host generator.old",
      "gui.copyWorld": "Host gui.copyWorld",
      "gui.deleteWorldLong": "Host gui.deleteWorldLong",
      "gui.editor.copyProject": "Host gui.editor.copyProject",
      "gui.editor.exportProject": "Host gui.editor.exportProject",
      "gui.editor.exportWorldDisabledHint": "Host gui.editor.exportWorldDisabledHint",
      "gui.exportTemplate": "Host gui.exportTemplate",
      "gui.exportWorldLong": "Host gui.exportWorldLong",
      "gui.templateIconPickerButton": "Host gui.templateIconPickerButton",
      "gui.templateLocPickerButton": "Host gui.templateLocPickerButton",
      "gui.templateMinVersion": "Host gui.templateMinVersion",
      "options.difficulty": "Host options.difficulty",
      "options.difficulty.easy": "Host options.difficulty.easy",
      "options.difficulty.hard": "Host options.difficulty.hard",
      "options.difficulty.normal": "Host options.difficulty.normal",
      "options.difficulty.peaceful": "Host options.difficulty.peaceful",
      "options.newUiEditWorld.info": "Host options.newUiEditWorld.info",
      "options.newUiEditWorld.initiate": "Host options.newUiEditWorld.initiate",
      "options.newUiEditWorld.title": "Host options.newUiEditWorld.title",
      "options.unlockTemplateWorldOptions.initiate": "Host options.unlockTemplateWorldOptions.initiate",
      "permissions.description.members": "Host permissions.description.members",
      "permissions.description.operators": "Host permissions.description.operators",
      "permissions.description.visitors": "Host permissions.description.visitors",
      "permissions.level.custom": "Host permissions.level.custom",
      "permissions.level.member": "Host permissions.level.member",
      "permissions.level.operator": "Host permissions.level.operator",
      "permissions.level.visitor": "Host permissions.level.visitor",
      "permissions.title.settings": "Host permissions.title.settings",
      "permissions.title.settings.edu": "Host permissions.title.settings.edu",
      "selectWorld.cheats": "Host selectWorld.cheats",
      "selectWorld.editor.enterName": "Host selectWorld.editor.enterName",
      "selectWorld.enterName": "Host selectWorld.enterName"
    },
    "metrics": {
      "world_section.game_section/new_edit_world_opt_in_panel/panel_title/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/new_edit_world_opt_in_panel/panel_title": {
        "height": 180
      },
      "world_section.game_section/new_edit_world_opt_in_panel/panel_text/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/new_edit_world_opt_in_panel/panel_text": {
        "height": 180
      },
      "world_section.game_section/new_edit_world_opt_in_panel/opt_in_button": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/new_edit_world_opt_in_panel": {
        "height": 180
      },
      "world_section.game_section/new_edit_world_opt_in_divider/section_divider": {},
      "world_section.game_section/new_edit_world_opt_in_divider": {
        "height": 180
      },
      "world_section.game_section/unlock_template_options_panel/option_info_label": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "textHeight": 10,
        "panelHeight": 100
      },
      "world_section.game_section/unlock_template_options_panel/unlock_template_options_button": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/unlock_template_options_panel": {
        "height": 180
      },
      "world_section.game_section/option_info_label": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "textHeight": 10,
        "panelHeight": 100
      },
      "world_section.game_section/hardcore_info_label": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "textHeight": 10,
        "panelHeight": 100
      },
      "world_section.game_section/world_settings_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/world_settings_label": {
        "height": 180
      },
      "world_section.game_section/option_text_edit_0": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/project_section_divider_1": {},
      "world_section.game_section/project_header_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/project_header_label": {
        "height": 180
      },
      "world_section.game_section/project_section_divider_2": {},
      "world_section.game_section/project_spacer": {},
      "world_section.game_section/option_text_edit_1": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/export_settings_section_divider_1": {},
      "world_section.game_section/export_settings_header_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/export_settings_header_label": {
        "height": 180
      },
      "world_section.game_section/export_settings_header_description/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/export_settings_header_description": {
        "height": 180
      },
      "world_section.game_section/export_settings_section_divider_2": {},
      "world_section.game_section/export_settings_spacer": {},
      "world_section.game_section/option_dropdown_0": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label"
      },
      "world_section.game_section/option_dropdown_1": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label"
      },
      "world_section.game_section/is_hardcore_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/option_dropdown_2": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label"
      },
      "world_section.game_section/world_preferences_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/world_preferences_label": {
        "height": 180
      },
      "world_section.game_section/starting_map_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/bonus_chest_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/option_dropdown_permissions": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label",
        "choiceHeights": {
          "visitor": 38,
          "member": 38,
          "operator": 38
        },
        "descriptionHeights": {
          "visitor": 20,
          "member": 20,
          "operator": 20
        },
        "faceIcon": null
      },
      "world_section.game_section/option_dropdown_3": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label"
      },
      "world_section.game_section/level_seed_selector_edu": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/level_seed_selector": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "labelMaxHeight": 10
      },
      "world_section.game_section/level_seed_selector_trial": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "labelMaxHeight": 10
      },
      "world_section.game_section/server_sim_distance_slider": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "web": {
          "value": 4,
          "min": 0,
          "max": 8,
          "step": 1,
          "markers": []
        }
      },
      "world_section.game_section/world_options_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/world_options_label": {
        "height": 180
      },
      "world_section.game_section/pvp_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/show_coordinates_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/player_waypoints_selector": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "visuals": [
          {
            "height": 14,
            "y": 1.5,
            "labelHeight": 10
          },
          {
            "height": 14,
            "y": 1.5,
            "labelHeight": 10
          }
        ],
        "descriptionHeights": [
          10,
          10
        ],
        "labelShadow": {
          "offset": [
            1,
            1
          ],
          "color": "#000"
        }
      },
      "world_section.game_section/player_waypoints_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/show_days_played_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/fire_spreads_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/recipes_unlock_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/tnt_explodes_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/respawn_blocks_explode_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/mob_loot_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/natural_regeneration_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/tile_drops_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/player_sleep_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/player_sleep_percentage_slider": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "web": {
          "value": 4,
          "min": 0,
          "max": 8,
          "step": 1,
          "markers": []
        }
      },
      "world_section.game_section/immediate_respawn_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/respawn_radius": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/experimental_toggles_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/experimental_toggles_label": {
        "height": 180
      },
      "world_section.game_section/experimental_toggles_label_info/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/experimental_toggles_label_info": {
        "height": 180
      },
      "world_section.game_section/experimental_toggles": {
        "height": 180
      },
      "world_section.game_section/world_cheats_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/world_cheats_label": {
        "height": 180
      },
      "world_section.game_section/allow_cheats_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/education_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/always_day_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/daylight_cycle_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/keep_inventory_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/mob_spawn_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/mob_griefing_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/entities_drop_loot_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/weather_cycle_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/command_blocks_enabled_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/random_tick_speed": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "labelMaxHeight": 10
      },
      "world_section.game_section/world_management_label/text": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/world_management_label": {
        "height": 180
      },
      "world_section.game_section/convert_to_infinite_panel/convert_to_infinite_button": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/convert_to_infinite_panel": {
        "height": 180
      },
      "world_section.game_section/delete_button": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/normal/export": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/normal/padding": {},
      "world_section.game_section/button_panel/normal/delete": {
        "resolvedWidth": 110,
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/normal": {},
      "world_section.game_section/button_panel/editor/content/export_as_project": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/editor/content/padding": {},
      "world_section.game_section/button_panel/editor/content/export_as_world_buttons/export_as_world": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/editor/content/export_as_world_buttons/padding": {},
      "world_section.game_section/button_panel/editor/content/export_as_world_buttons/export_as_template": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/editor/content/export_as_world_buttons": {},
      "world_section.game_section/button_panel/editor/content/export_world_disabled_hint": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.game_section/button_panel/editor/content/padding_2": {},
      "world_section.game_section/button_panel/editor/content/project_manipulations_buttons/copy_project": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/editor/content/project_manipulations_buttons/padding": {},
      "world_section.game_section/button_panel/editor/content/project_manipulations_buttons/delete_project": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/button_panel/editor/content/project_manipulations_buttons": {},
      "world_section.game_section/button_panel/editor/content": {
        "height": 180
      },
      "world_section.game_section/button_panel/editor": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "panelHeight": 100
      },
      "world_section.game_section/button_panel": {
        "height": 180
      },
      "world_section.game_section/export_template_panel/padding": {},
      "world_section.game_section/export_template_panel/template_version": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.game_section/export_template_panel/template_buttons/template_image_picker_button": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/export_template_panel/template_buttons/padding": {},
      "world_section.game_section/export_template_panel/template_buttons/template_localization_picker_button": {
        "resolvedWidth": 110,
        "labelMaxHeight": 10
      },
      "world_section.game_section/export_template_panel/template_buttons": {},
      "world_section.game_section/export_template_panel/export_template": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/export_template_panel": {
        "height": 180
      },
      "world_section.game_section/clear_player_data_panel/padding": {},
      "world_section.game_section/clear_player_data_panel/clear_player_data_button": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/clear_player_data_panel": {
        "height": 180
      },
      "world_section.game_section/copy_world_panel/copy_world": {
        "labelMaxHeight": 10
      },
      "world_section.game_section/copy_world_panel": {
        "height": 180
      }
    },
    "layoutPolicy": {
      "unresolvedPanelAnchor": "top-left",
      "unresolvedStackCrossAlignment": "start"
    },
    "experiments": [
      {
        "id": "host-experiment-0",
        "index": 0,
        "#experimental_toggle_value": false,
        "#experimental_toggle_enabled": true,
        "#show_experimental_toggle": true,
        "#experimental_toggle_text": "Host experiment 0",
        "metrics": {
          "height": 34,
          "labelHeight": 10,
          "descriptionHeight": 0,
          "controlY": 12
        }
      },
      {
        "id": "host-experiment-1",
        "index": 1,
        "#experimental_toggle_value": true,
        "#experimental_toggle_enabled": true,
        "#show_experimental_toggle": true,
        "#experimental_toggle_text": "Host experiment 1",
        "metrics": {
          "height": 34,
          "labelHeight": 10,
          "descriptionHeight": 0,
          "controlY": 12
        }
      }
    ]
  }
};
 const multiplayer:WorldMultiplayerSettingsProps={
  "width": 320,
  "scale": 1,
  "inputMode": "mouse",
  "hiddenSlots": "reserve",
  "typography": {
    "label": {
      "family": "Host exact font",
      "size": 10,
      "lineHeight": 10
    },
    "description": {
      "family": "Host exact font",
      "size": 10,
      "lineHeight": 10
    },
    "control": {
      "family": "Host exact font",
      "size": 10,
      "lineHeight": 10
    }
  },
  "snapshot": {
    "bindings": {
      "#can_be_server_enabled": true,
      "#can_be_server_visible": true,
      "#can_be_xbl_enabled": true,
      "#general_multiplayer_warning_label_visible": true,
      "#general_multiplayer_warning_text": "Host #general_multiplayer_warning_text",
      "#multiplayer_game": true,
      "#multiplayer_game_enabled": true,
      "#open_uri_button_visible": true,
      "#platform_broadcast_dropdown_enabled": true,
      "#platform_broadcast_dropdown_toggle_label": "Host #platform_broadcast_dropdown_toggle_label",
      "#platform_broadcast_friends_of_friends": true,
      "#platform_broadcast_friends_only": true,
      "#platform_broadcast_invite_only": true,
      "#platform_multiplayer_warning_label_visible": true,
      "#platform_multiplayer_warning_text": "Host #platform_multiplayer_warning_text",
      "#platform_settings_dropdown_visible": true,
      "#server_visibility_enabled": true,
      "#server_visible": true,
      "#xbl_broadcast_dropdown_toggle_label": "Host #xbl_broadcast_dropdown_toggle_label",
      "#xbl_broadcast_friends_of_friends": true,
      "#xbl_broadcast_friends_only": true,
      "#xbl_broadcast_invite_only": true,
      "#xbl_multiplayer_warning_label_visible": true,
      "#xbl_multiplayer_warning_text": "Host #xbl_multiplayer_warning_text",
      "#xbl_show_broadcast_dropdown": true
    },
    "conditions": {
      "$desktop_screen": false,
      "($nx_os or $is_ps4)": false,
      "(not $is_xboxlive_enabled)": false,
      "(not $nx_os and not $is_ps4)": false
    },
    "strings": {
      "options.multiplayergame": "Host options.multiplayergame",
      "options.servervisible": "Host options.servervisible",
      "options.thirdPartyConsoleVisible": "Host options.thirdPartyConsoleVisible",
      "options.xboxliveBroadcast.friendsOfFriends": "Host options.xboxliveBroadcast.friendsOfFriends",
      "options.xboxliveBroadcast.friendsOnly": "Host options.xboxliveBroadcast.friendsOnly",
      "options.xboxliveBroadcast.inviteOnly": "Host options.xboxliveBroadcast.inviteOnly",
      "options.xboxliveBroadcastSettings": "Host options.xboxliveBroadcastSettings",
      "options.xboxliveBroadcastSettingsForCrossplatform": "Host options.xboxliveBroadcastSettingsForCrossplatform",
      "permissions.open.account.help.button": "Host permissions.open.account.help.button"
    },
    "metrics": {
      "world_section.multiplayer_section/multiplayer_game_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.multiplayer_section/platform_settings_dropdown": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label"
      },
      "world_section.multiplayer_section/xbl_settings_dropdown": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12,
        "popupHeight": 120,
        "popupPlacement": "below",
        "popupLabel": "Host popup accessibility label"
      },
      "world_section.multiplayer_section/server_visible_toggle": {
        "height": 180,
        "labelHeight": 10,
        "descriptionHeight": 0,
        "controlY": 12
      },
      "world_section.multiplayer_section/general_multiplayer_warning_label": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.multiplayer_section/open_uri_button": {
        "labelMaxHeight": 10
      },
      "world_section.multiplayer_section/platform_multiplayer_warning_label": {
        "height": 180,
        "textHeight": 10
      },
      "world_section.multiplayer_section/xbl_multiplayer_warning_label": {
        "height": 180,
        "textHeight": 10
      }
    },
    "layoutPolicy": {
      "unresolvedPanelAnchor": "top-left",
      "unresolvedStackCrossAlignment": "start"
    }
  }
};
 const navigation:WorldSettingsNavigationProps={
  "label": "World settings navigation",
  "width": 130,
  "scale": 1,
  "font": {
    "family": "monospace",
    "size": 10,
    "lineHeight": 10
  },
  "mode": "create",
  "value": "game_button",
  "sourceDefaultIndex": 99,
  "toggleOnHover": false,
  "hoverPolicy": "activation-only",
  "hiddenSlots": "reserve",
  "snapshot": {
    "context": {
      "worldSectionIncluded": true,
      "packsSectionsIncluded": true,
      "spatialPatternFixEnabled": false,
      "pregame": true,
      "educationEdition": false,
      "nxOs": false,
      "publish": true,
      "editorModeEnabled": false,
      "cloudEnabled": false,
      "cloudGeneralToggleEnabled": false,
      "multiplayerClient": false
    },
    "buttons": {
      "server_settings_button": {
        "label": "Server",
        "panelTitle": "Server settings",
        "sourceIndex": 2,
        "enabled": true
      },
      "game_button": {
        "label": "Game",
        "panelTitle": "Game settings",
        "sourceIndex": 4,
        "enabled": true
      },
      "classroom_button": {
        "label": "Classroom",
        "panelTitle": "Classroom settings",
        "sourceIndex": 5,
        "enabled": true
      },
      "switch_game_button": {
        "label": "Game",
        "panelTitle": "Game settings",
        "sourceIndex": 4,
        "enabled": true
      },
      "multiplayer_button": {
        "label": "Multiplayer",
        "panelTitle": "Multiplayer settings",
        "sourceIndex": 9,
        "enabled": true
      },
      "edu_cloud_button": {
        "label": "Cloud",
        "panelTitle": "Cloud",
        "sourceIndex": 12,
        "enabled": true
      },
      "debug_button": {
        "label": "Debug",
        "panelTitle": "Debug",
        "sourceIndex": 15,
        "enabled": true
      },
      "level_texture_pack_button": {
        "label": "Resources",
        "panelTitle": "Resource packs",
        "sourceIndex": 20,
        "enabled": true
      },
      "addon_button": {
        "label": "Behavior",
        "panelTitle": "Behavior packs",
        "sourceIndex": 21,
        "enabled": true
      }
    },
    "groups": {
      "server": {
        "label": "Server",
        "height": 18
      },
      "world": {
        "label": "World",
        "height": 18
      },
      "addons": {
        "label": "Add-ons",
        "height": 18
      }
    },
    "thumbnail": {
      "textureName": "",
      "fileSystem": "host-resolved",
      "image": null,
      "alt": "Explicit host image",
      "webFit": "contain"
    },
    "server": {
      "visible": false,
      "iconName": "",
      "outlineName": "",
      "fileSystem": "host-resolved",
      "icon": null,
      "outline": null,
      "loadingFrame": 0
    },
    "cloud": {
      "outline": null,
      "color": null
    },
    "packs": {
      "level": {
        "path": "",
        "zip": "",
        "fileSystem": "host-resolved",
        "image": null
      },
      "addon": {
        "path": "",
        "zip": "",
        "fileSystem": "host-resolved",
        "image": null
      },
      "border": null
    },
    "launch": {
      "primary": {
        "label": "Create",
        "enabled": true,
        "labelMaxHeight": 20
      },
      "realms": {
        "label": "Create on Realms",
        "enabled": true,
        "labelMaxHeight": 25,
        "visible": true
      },
      "play": {
        "label": "Play",
        "enabled": true,
        "labelMaxHeight": 20
      },
      "host": {
        "label": "Host",
        "enabled": true,
        "labelMaxHeight": 20
      }
    }
  }
};
 const snapshot={...navigation.snapshot,
  thumbnail:{...navigation.snapshot.thumbnail,textureName:images.thumbnail?'explicit-host-thumbnail':'',image:images.thumbnail},
  packs:{...navigation.snapshot.packs,
   border:{...images.white,resolution:'host-resolved' as const},
   level:{...navigation.snapshot.packs.level,path:images.pack?'explicit-host-pack':'',image:images.pack},
   addon:{...navigation.snapshot.packs.addon,path:images.pack?'explicit-host-pack':'',image:images.pack}}};
 const generic:SettingsFieldsProps={width:300,scale:1,typography:game.typography,hiddenSlots:'reserve',rows:[
  {kind:'panel',id:'legacy-panel',sourceControl:'settings_common.panel',ignored:false,visible:true,enabled:true,height:30,rows:[{kind:'label',id:'legacy-positioned-label',sourceControl:'settings_common.label',ignored:false,visible:true,enabled:true,height:10,width:80,offset:[5,7],profile:'plain',text:'Positioned source label',textHeight:10}]},
  {kind:'permissions',id:'raw-permission',sourceControl:'world_section.permissions',ignored:false,visible:true,enabled:true,height:48,binding:'#permissions',value:null,checked:{visitor:true,member:true,operator:false},faceLabel:'Independent raw flags',faceIcon:null,
   option:{mode:'two-line',label:'Permissions',showLabel:true,labelHeight:10,description:null,descriptionHeight:0,labelAlignment:'left',controlY:14},
   labels:{label:'Permissions',visitor:'Visitor',member:'Member',operator:'Operator',custom:'Custom',visitorDescription:'Visit',memberDescription:'Build',operatorDescription:'Manage'},choiceBindings:{visitor:'#visitor',member:'#member',operator:'#operator'},
   popup:{scrolling:true,height:120,placement:'below',label:'Permissions',inputMode:'mouse',highlightOffset:[0,0],highlightExtraSize:[0,0]},choiceHeights:{visitor:40,member:40,operator:40},descriptionHeights:{visitor:18,member:18,operator:18}},
  {kind:'action',id:'source-uri-intent',sourceControl:'world_section.open_uri_button',ignored:false,visible:true,enabled:true,height:30,label:'Account help',target:'button.menu_open_uri',uri:'https://aka.ms/MCMultiplayerHelp',tone:'light',labelMaxHeight:10}
 ]};
 return {game,multiplayer,navigation:{...navigation,snapshot},generic};
}
