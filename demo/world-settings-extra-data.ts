import type{WorldCloudSettingsSnapshot,WorldDebugSettingsSnapshot,WorldCloudSettingsImage}from'../src/world-settings-fields';
// Source schema SHA256 b331e96d042d5119275e47fbb696ab47d8672558d1af38b79be964c21f10d2a2; explicit host examples only.
const cloudBase={
  "bindings": {
    "#cloud_file_last_changed": "宿主时间示例",
    "#cloud_file_last_changed_enabled": false,
    "#cloud_file_name": "课堂世界",
    "#cloud_file_name_enabled": true,
    "#edu_cloud_upload": false,
    "#edu_cloud_upload_enabled": true
  },
  "conditions": {
    "$desktop_screen": true
  },
  "strings": {
    "menu.eduCloudStorage.caps": "云存储",
    "options.cloudFileNameTitle": "云文件名",
    "options.cloudFileLastChangedTitle": "上次更新",
    "options.cloudToggleCloudSave": "启用云保存",
    "options.cloudHelpText": "云存储帮助"
  },
  "metrics": {
    "world_section.edu_cloud_section/edu_cloud_label/text": {
      "height": 18,
      "textHeight": 10
    },
    "world_section.edu_cloud_section/edu_cloud_label": {
      "height": 18
    },
    "world_section.edu_cloud_section/cloud_file_name": {
      "height": 48,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 12
    },
    "world_section.edu_cloud_section/cloud_file_last_changed": {
      "height": 48,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 12
    },
    "world_section.edu_cloud_section/cloud_upload_toggle": {
      "height": 22,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 2
    },
    "world_section.edu_cloud_section/cloud_help_wrapper_panel/cloud_help_button": {
      "height": 20,
      "resolvedWidth": 124,
      "stateWidth": 114,
      "labelPanelSize": [
        112,
        10
      ],
      "labelSize": [
        108,
        10
      ]
    },
    "world_section.edu_cloud_section/cloud_help_wrapper_panel/padded_icon/icon": {},
    "world_section.edu_cloud_section/cloud_help_wrapper_panel/padded_icon": {
      "height": 20,
      "resolvedWidth": 20
    },
    "world_section.edu_cloud_section/cloud_help_wrapper_panel": {
      "height": 20
    }
  },
  "layoutPolicy": {
    "unresolvedPanelAnchor": "top-left",
    "unresolvedStackCrossAlignment": "start"
  }
} as const;
const debugBase={
  "bindings": {
    "#base_game_version_debug_text": "Host base-game-version example",
    "#debug_biome_override_bamboo_jungle": false,
    "#debug_biome_override_bamboo_jungle_hills": false,
    "#debug_biome_override_basalt_deltas": false,
    "#debug_biome_override_beach": false,
    "#debug_biome_override_birch_forest": false,
    "#debug_biome_override_birch_forest_hills": false,
    "#debug_biome_override_birch_forest_hills_mutated": false,
    "#debug_biome_override_birch_forest_mutated": false,
    "#debug_biome_override_cold_beach": false,
    "#debug_biome_override_cold_ocean": false,
    "#debug_biome_override_cold_taiga": false,
    "#debug_biome_override_cold_taiga_hills": false,
    "#debug_biome_override_cold_taiga_mutated": false,
    "#debug_biome_override_crimson_forest": false,
    "#debug_biome_override_deep_cold_ocean": false,
    "#debug_biome_override_deep_frozen_ocean": false,
    "#debug_biome_override_deep_lukewarm_ocean": false,
    "#debug_biome_override_deep_ocean": false,
    "#debug_biome_override_deep_warm_ocean": false,
    "#debug_biome_override_desert": false,
    "#debug_biome_override_desert_hills": false,
    "#debug_biome_override_desert_mutated": false,
    "#debug_biome_override_dropdown_dropdown_enabled": true,
    "#debug_biome_override_dropdown_toggle_label": "random_biome",
    "#debug_biome_override_extreme_hills": false,
    "#debug_biome_override_extreme_hills_edge": false,
    "#debug_biome_override_extreme_hills_mutated": false,
    "#debug_biome_override_extreme_hills_plus_trees": false,
    "#debug_biome_override_extreme_hills_plus_trees_mutated": false,
    "#debug_biome_override_flower_forest": false,
    "#debug_biome_override_forest": false,
    "#debug_biome_override_forest_hills": false,
    "#debug_biome_override_frozen_ocean": false,
    "#debug_biome_override_frozen_river": false,
    "#debug_biome_override_hell": false,
    "#debug_biome_override_ice_mountains": false,
    "#debug_biome_override_ice_plains": false,
    "#debug_biome_override_ice_plains_spikes": false,
    "#debug_biome_override_jungle": false,
    "#debug_biome_override_jungle_edge": false,
    "#debug_biome_override_jungle_edge_mutated": false,
    "#debug_biome_override_jungle_hills": false,
    "#debug_biome_override_jungle_mutated": false,
    "#debug_biome_override_lukewarm_ocean": false,
    "#debug_biome_override_mega_taiga": false,
    "#debug_biome_override_mega_taiga_hills": false,
    "#debug_biome_override_mesa": false,
    "#debug_biome_override_mesa_bryce": false,
    "#debug_biome_override_mesa_plateau": false,
    "#debug_biome_override_mesa_plateau_mutated": false,
    "#debug_biome_override_mesa_plateau_stone": false,
    "#debug_biome_override_mesa_plateau_stone_mutated": false,
    "#debug_biome_override_mushroom_island": false,
    "#debug_biome_override_mushroom_island_shore": false,
    "#debug_biome_override_ocean": false,
    "#debug_biome_override_plains": false,
    "#debug_biome_override_random_biome": true,
    "#debug_biome_override_redwood_taiga_hills_mutated": false,
    "#debug_biome_override_redwood_taiga_mutated": false,
    "#debug_biome_override_river": false,
    "#debug_biome_override_roofed_forest": false,
    "#debug_biome_override_roofed_forest_mutated": false,
    "#debug_biome_override_savanna": false,
    "#debug_biome_override_savanna_mutated": false,
    "#debug_biome_override_savanna_plateau": false,
    "#debug_biome_override_savanna_plateau_mutated": false,
    "#debug_biome_override_soulsand_valley": false,
    "#debug_biome_override_stone_beach": false,
    "#debug_biome_override_sunflower_plains": false,
    "#debug_biome_override_swampland": false,
    "#debug_biome_override_swampland_mutated": false,
    "#debug_biome_override_taiga": false,
    "#debug_biome_override_taiga_hills": false,
    "#debug_biome_override_taiga_mutated": false,
    "#debug_biome_override_warm_ocean": false,
    "#debug_biome_override_warped_forest": false,
    "#debug_spawn_biome_dropdown_enabled": true,
    "#debug_spawn_biome_dropdown_toggle_label": "random_biome",
    "#debug_spawn_dimension_dropdown_enabled": true,
    "#debug_spawn_dimension_dropdown_toggle_label": "Overworld",
    "#debug_spawn_in_bamboo_jungle": false,
    "#debug_spawn_in_bamboo_jungle_hills": false,
    "#debug_spawn_in_basalt_deltas": false,
    "#debug_spawn_in_beach": false,
    "#debug_spawn_in_birch_forest": false,
    "#debug_spawn_in_birch_forest_hills": false,
    "#debug_spawn_in_birch_forest_hills_mutated": false,
    "#debug_spawn_in_birch_forest_mutated": false,
    "#debug_spawn_in_cold_beach": false,
    "#debug_spawn_in_cold_ocean": false,
    "#debug_spawn_in_cold_taiga": false,
    "#debug_spawn_in_cold_taiga_hills": false,
    "#debug_spawn_in_cold_taiga_mutated": false,
    "#debug_spawn_in_crimson_forest": false,
    "#debug_spawn_in_deep_cold_ocean": false,
    "#debug_spawn_in_deep_frozen_ocean": false,
    "#debug_spawn_in_deep_lukewarm_ocean": false,
    "#debug_spawn_in_deep_ocean": false,
    "#debug_spawn_in_deep_warm_ocean": false,
    "#debug_spawn_in_desert": false,
    "#debug_spawn_in_desert_hills": false,
    "#debug_spawn_in_desert_mutated": false,
    "#debug_spawn_in_extreme_hills": false,
    "#debug_spawn_in_extreme_hills_edge": false,
    "#debug_spawn_in_extreme_hills_mutated": false,
    "#debug_spawn_in_extreme_hills_plus_trees": false,
    "#debug_spawn_in_extreme_hills_plus_trees_mutated": false,
    "#debug_spawn_in_flower_forest": false,
    "#debug_spawn_in_forest": false,
    "#debug_spawn_in_forest_hills": false,
    "#debug_spawn_in_frozen_ocean": false,
    "#debug_spawn_in_frozen_river": false,
    "#debug_spawn_in_hell": false,
    "#debug_spawn_in_ice_mountains": false,
    "#debug_spawn_in_ice_plains": false,
    "#debug_spawn_in_ice_plains_spikes": false,
    "#debug_spawn_in_jungle": false,
    "#debug_spawn_in_jungle_edge": false,
    "#debug_spawn_in_jungle_edge_mutated": false,
    "#debug_spawn_in_jungle_hills": false,
    "#debug_spawn_in_jungle_mutated": false,
    "#debug_spawn_in_lukewarm_ocean": false,
    "#debug_spawn_in_mega_taiga": false,
    "#debug_spawn_in_mega_taiga_hills": false,
    "#debug_spawn_in_mesa": false,
    "#debug_spawn_in_mesa_bryce": false,
    "#debug_spawn_in_mesa_plateau": false,
    "#debug_spawn_in_mesa_plateau_mutated": false,
    "#debug_spawn_in_mesa_plateau_stone": false,
    "#debug_spawn_in_mesa_plateau_stone_mutated": false,
    "#debug_spawn_in_mushroom_island": false,
    "#debug_spawn_in_mushroom_island_shore": false,
    "#debug_spawn_in_nether": false,
    "#debug_spawn_in_ocean": false,
    "#debug_spawn_in_overworld": true,
    "#debug_spawn_in_plains": false,
    "#debug_spawn_in_random_biome": true,
    "#debug_spawn_in_redwood_taiga_hills_mutated": false,
    "#debug_spawn_in_redwood_taiga_mutated": false,
    "#debug_spawn_in_river": false,
    "#debug_spawn_in_roofed_forest": false,
    "#debug_spawn_in_roofed_forest_mutated": false,
    "#debug_spawn_in_savanna": false,
    "#debug_spawn_in_savanna_mutated": false,
    "#debug_spawn_in_savanna_plateau": false,
    "#debug_spawn_in_savanna_plateau_mutated": false,
    "#debug_spawn_in_soulsand_valley": false,
    "#debug_spawn_in_stone_beach": false,
    "#debug_spawn_in_sunflower_plains": false,
    "#debug_spawn_in_swampland": false,
    "#debug_spawn_in_swampland_mutated": false,
    "#debug_spawn_in_taiga": false,
    "#debug_spawn_in_taiga_hills": false,
    "#debug_spawn_in_taiga_mutated": false,
    "#debug_spawn_in_warm_ocean": false,
    "#debug_spawn_in_warped_forest": false,
    "#flat_nether": false,
    "#flat_nether_enabled": true,
    "#game_version_override": "",
    "#game_version_override_enabled": true,
    "#game_version_override_toggle": false,
    "#game_version_override_toggle_enabled": true
  },
  "conditions": {
    "$desktop_screen": true
  },
  "strings": {},
  "metrics": {
    "world_section.debug_section/flat_nether_toggle": {
      "height": 22,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 2
    },
    "world_section.debug_section/game_version_override_toggle": {
      "height": 22,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 2
    },
    "world_section.debug_section/game_version_override_textbox": {
      "height": 48,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 12
    },
    "world_section.debug_section/spawn_dimension_dropdown": {
      "height": 48,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 12,
      "popupHeight": 120,
      "popupPlacement": "below",
      "popupLabel": "源选项"
    },
    "world_section.debug_section/spawn_biome_dropdown": {
      "height": 48,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 12,
      "popupHeight": 120,
      "popupPlacement": "below",
      "popupLabel": "源选项"
    },
    "world_section.debug_section/biome_override_dropdown": {
      "height": 48,
      "labelHeight": 10,
      "descriptionHeight": 0,
      "controlY": 12,
      "popupHeight": 120,
      "popupPlacement": "below",
      "popupLabel": "源选项"
    },
    "world_section.debug_section/base_game_version_debug_text": {
      "height": 18,
      "textHeight": 10
    }
  },
  "layoutPolicy": {
    "unresolvedPanelAnchor": "top-left",
    "unresolvedStackCrossAlignment": "start"
  }
} as const;
export const worldDebugDemoChoiceGroups=[
  {
    "faceBinding": "#debug_spawn_dimension_dropdown_toggle_label",
    "choices": [
      {
        "binding": "#debug_spawn_in_overworld",
        "label": "Overworld"
      },
      {
        "binding": "#debug_spawn_in_nether",
        "label": "Nether"
      }
    ]
  },
  {
    "faceBinding": "#debug_spawn_biome_dropdown_toggle_label",
    "choices": [
      {
        "binding": "#debug_spawn_in_random_biome",
        "label": "random_biome"
      },
      {
        "binding": "#debug_spawn_in_basalt_deltas",
        "label": "basalt_deltas"
      },
      {
        "binding": "#debug_spawn_in_soulsand_valley",
        "label": "soulsand_valley"
      },
      {
        "binding": "#debug_spawn_in_crimson_forest",
        "label": "crimson_forest"
      },
      {
        "binding": "#debug_spawn_in_warped_forest",
        "label": "warped_forest"
      },
      {
        "binding": "#debug_spawn_in_hell",
        "label": "hell"
      },
      {
        "binding": "#debug_spawn_in_desert",
        "label": "desert"
      },
      {
        "binding": "#debug_spawn_in_extreme_hills",
        "label": "extreme_hills"
      },
      {
        "binding": "#debug_spawn_in_forest",
        "label": "forest"
      },
      {
        "binding": "#debug_spawn_in_taiga",
        "label": "taiga"
      },
      {
        "binding": "#debug_spawn_in_swampland",
        "label": "swampland"
      },
      {
        "binding": "#debug_spawn_in_river",
        "label": "river"
      },
      {
        "binding": "#debug_spawn_in_frozen_river",
        "label": "frozen_river"
      },
      {
        "binding": "#debug_spawn_in_ice_plains",
        "label": "ice_plains"
      },
      {
        "binding": "#debug_spawn_in_ice_mountains",
        "label": "ice_mountains"
      },
      {
        "binding": "#debug_spawn_in_mushroom_island",
        "label": "mushroom_island"
      },
      {
        "binding": "#debug_spawn_in_mushroom_island_shore",
        "label": "mushroom_island_shore"
      },
      {
        "binding": "#debug_spawn_in_beach",
        "label": "beach"
      },
      {
        "binding": "#debug_spawn_in_desert_hills",
        "label": "desert_hills"
      },
      {
        "binding": "#debug_spawn_in_forest_hills",
        "label": "forest_hills"
      },
      {
        "binding": "#debug_spawn_in_taiga_hills",
        "label": "taiga_hills"
      },
      {
        "binding": "#debug_spawn_in_extreme_hills_edge",
        "label": "extreme_hills_edge"
      },
      {
        "binding": "#debug_spawn_in_jungle",
        "label": "jungle"
      },
      {
        "binding": "#debug_spawn_in_jungle_hills",
        "label": "jungle_hills"
      },
      {
        "binding": "#debug_spawn_in_jungle_edge",
        "label": "jungle_edge"
      },
      {
        "binding": "#debug_spawn_in_stone_beach",
        "label": "stone_beach"
      },
      {
        "binding": "#debug_spawn_in_cold_beach",
        "label": "cold_beach"
      },
      {
        "binding": "#debug_spawn_in_birch_forest",
        "label": "birch_forest"
      },
      {
        "binding": "#debug_spawn_in_birch_forest_hills",
        "label": "birch_forest_hills"
      },
      {
        "binding": "#debug_spawn_in_roofed_forest",
        "label": "roofed_forest"
      },
      {
        "binding": "#debug_spawn_in_cold_taiga",
        "label": "cold_taiga"
      },
      {
        "binding": "#debug_spawn_in_cold_taiga_hills",
        "label": "cold_taiga_hills"
      },
      {
        "binding": "#debug_spawn_in_mega_taiga",
        "label": "mega_taiga"
      },
      {
        "binding": "#debug_spawn_in_mega_taiga_hills",
        "label": "mega_taiga_hills"
      },
      {
        "binding": "#debug_spawn_in_extreme_hills_plus_trees",
        "label": "extreme_hills_plus_trees"
      },
      {
        "binding": "#debug_spawn_in_savanna",
        "label": "savanna"
      },
      {
        "binding": "#debug_spawn_in_savanna_plateau",
        "label": "savanna_plateau"
      },
      {
        "binding": "#debug_spawn_in_mesa",
        "label": "mesa"
      },
      {
        "binding": "#debug_spawn_in_mesa_plateau_stone",
        "label": "mesa_plateau_stone"
      },
      {
        "binding": "#debug_spawn_in_mesa_plateau",
        "label": "mesa_plateau"
      },
      {
        "binding": "#debug_spawn_in_ocean",
        "label": "ocean"
      },
      {
        "binding": "#debug_spawn_in_deep_ocean",
        "label": "deep_ocean"
      },
      {
        "binding": "#debug_spawn_in_warm_ocean",
        "label": "warm_ocean"
      },
      {
        "binding": "#debug_spawn_in_deep_warm_ocean",
        "label": "deep_warm_ocean"
      },
      {
        "binding": "#debug_spawn_in_lukewarm_ocean",
        "label": "lukewarm_ocean"
      },
      {
        "binding": "#debug_spawn_in_deep_lukewarm_ocean",
        "label": "deep_lukewarm_ocean"
      },
      {
        "binding": "#debug_spawn_in_cold_ocean",
        "label": "cold_ocean"
      },
      {
        "binding": "#debug_spawn_in_deep_cold_ocean",
        "label": "deep_cold_ocean"
      },
      {
        "binding": "#debug_spawn_in_frozen_ocean",
        "label": "frozen_ocean"
      },
      {
        "binding": "#debug_spawn_in_deep_frozen_ocean",
        "label": "deep_frozen_ocean"
      },
      {
        "binding": "#debug_spawn_in_bamboo_jungle",
        "label": "bamboo_jungle"
      },
      {
        "binding": "#debug_spawn_in_bamboo_jungle_hills",
        "label": "bamboo_jungle_hills"
      },
      {
        "binding": "#debug_spawn_in_sunflower_plains",
        "label": "sunflower_plains"
      },
      {
        "binding": "#debug_spawn_in_swampland_mutated",
        "label": "swampland_mutated"
      },
      {
        "binding": "#debug_spawn_in_ice_plains_spikes",
        "label": "ice_plains_spikes"
      },
      {
        "binding": "#debug_spawn_in_cold_taiga_mutated",
        "label": "cold_taiga_mutated"
      },
      {
        "binding": "#debug_spawn_in_savanna_mutated",
        "label": "savanna_mutated"
      },
      {
        "binding": "#debug_spawn_in_savanna_plateau_mutated",
        "label": "savanna_plateau_mutated"
      },
      {
        "binding": "#debug_spawn_in_roofed_forest_mutated",
        "label": "roofed_forest_mutated"
      },
      {
        "binding": "#debug_spawn_in_desert_mutated",
        "label": "desert_mutated"
      },
      {
        "binding": "#debug_spawn_in_flower_forest",
        "label": "flower_forest"
      },
      {
        "binding": "#debug_spawn_in_taiga_mutated",
        "label": "taiga_mutated"
      },
      {
        "binding": "#debug_spawn_in_jungle_mutated",
        "label": "jungle_mutated"
      },
      {
        "binding": "#debug_spawn_in_jungle_edge_mutated",
        "label": "jungle_edge_mutated"
      },
      {
        "binding": "#debug_spawn_in_mesa_bryce",
        "label": "mesa_bryce"
      },
      {
        "binding": "#debug_spawn_in_mesa_plateau_stone_mutated",
        "label": "mesa_plateau_stone_mutated"
      },
      {
        "binding": "#debug_spawn_in_mesa_plateau_mutated",
        "label": "mesa_plateau_mutated"
      },
      {
        "binding": "#debug_spawn_in_birch_forest_mutated",
        "label": "birch_forest_mutated"
      },
      {
        "binding": "#debug_spawn_in_birch_forest_hills_mutated",
        "label": "birch_forest_hills_mutated"
      },
      {
        "binding": "#debug_spawn_in_redwood_taiga_mutated",
        "label": "redwood_taiga_mutated"
      },
      {
        "binding": "#debug_spawn_in_extreme_hills_mutated",
        "label": "extreme_hills_mutated"
      },
      {
        "binding": "#debug_spawn_in_extreme_hills_plus_trees_mutated",
        "label": "extreme_hills_plus_trees_mutated"
      },
      {
        "binding": "#debug_spawn_in_redwood_taiga_hills_mutated",
        "label": "redwood_taiga_hills_mutated"
      },
      {
        "binding": "#debug_spawn_in_plains",
        "label": "plains"
      }
    ]
  },
  {
    "faceBinding": "#debug_biome_override_dropdown_toggle_label",
    "choices": [
      {
        "binding": "#debug_biome_override_random_biome",
        "label": "random_biome"
      },
      {
        "binding": "#debug_biome_override_basalt_deltas",
        "label": "basalt_deltas"
      },
      {
        "binding": "#debug_biome_override_soulsand_valley",
        "label": "soulsand_valley"
      },
      {
        "binding": "#debug_biome_override_crimson_forest",
        "label": "crimson_forest"
      },
      {
        "binding": "#debug_biome_override_warped_forest",
        "label": "warped_forest"
      },
      {
        "binding": "#debug_biome_override_hell",
        "label": "hell"
      },
      {
        "binding": "#debug_biome_override_desert",
        "label": "desert"
      },
      {
        "binding": "#debug_biome_override_extreme_hills",
        "label": "extreme_hills"
      },
      {
        "binding": "#debug_biome_override_forest",
        "label": "forest"
      },
      {
        "binding": "#debug_biome_override_taiga",
        "label": "taiga"
      },
      {
        "binding": "#debug_biome_override_swampland",
        "label": "swampland"
      },
      {
        "binding": "#debug_biome_override_river",
        "label": "river"
      },
      {
        "binding": "#debug_biome_override_frozen_river",
        "label": "frozen_river"
      },
      {
        "binding": "#debug_biome_override_ice_plains",
        "label": "ice_plains"
      },
      {
        "binding": "#debug_biome_override_ice_mountains",
        "label": "ice_mountains"
      },
      {
        "binding": "#debug_biome_override_mushroom_island",
        "label": "mushroom_island"
      },
      {
        "binding": "#debug_biome_override_mushroom_island_shore",
        "label": "mushroom_island_shore"
      },
      {
        "binding": "#debug_biome_override_beach",
        "label": "beach"
      },
      {
        "binding": "#debug_biome_override_desert_hills",
        "label": "desert_hills"
      },
      {
        "binding": "#debug_biome_override_forest_hills",
        "label": "forest_hills"
      },
      {
        "binding": "#debug_biome_override_taiga_hills",
        "label": "taiga_hills"
      },
      {
        "binding": "#debug_biome_override_extreme_hills_edge",
        "label": "extreme_hills_edge"
      },
      {
        "binding": "#debug_biome_override_jungle",
        "label": "jungle"
      },
      {
        "binding": "#debug_biome_override_jungle_hills",
        "label": "jungle_hills"
      },
      {
        "binding": "#debug_biome_override_jungle_edge",
        "label": "jungle_edge"
      },
      {
        "binding": "#debug_biome_override_stone_beach",
        "label": "stone_beach"
      },
      {
        "binding": "#debug_biome_override_cold_beach",
        "label": "cold_beach"
      },
      {
        "binding": "#debug_biome_override_birch_forest",
        "label": "birch_forest"
      },
      {
        "binding": "#debug_biome_override_birch_forest_hills",
        "label": "birch_forest_hills"
      },
      {
        "binding": "#debug_biome_override_roofed_forest",
        "label": "roofed_forest"
      },
      {
        "binding": "#debug_biome_override_cold_taiga",
        "label": "cold_taiga"
      },
      {
        "binding": "#debug_biome_override_cold_taiga_hills",
        "label": "cold_taiga_hills"
      },
      {
        "binding": "#debug_biome_override_mega_taiga",
        "label": "mega_taiga"
      },
      {
        "binding": "#debug_biome_override_mega_taiga_hills",
        "label": "mega_taiga_hills"
      },
      {
        "binding": "#debug_biome_override_extreme_hills_plus_trees",
        "label": "extreme_hills_plus_trees"
      },
      {
        "binding": "#debug_biome_override_savanna",
        "label": "savanna"
      },
      {
        "binding": "#debug_biome_override_savanna_plateau",
        "label": "savanna_plateau"
      },
      {
        "binding": "#debug_biome_override_mesa",
        "label": "mesa"
      },
      {
        "binding": "#debug_biome_override_mesa_plateau_stone",
        "label": "mesa_plateau_stone"
      },
      {
        "binding": "#debug_biome_override_mesa_plateau",
        "label": "mesa_plateau"
      },
      {
        "binding": "#debug_biome_override_ocean",
        "label": "ocean"
      },
      {
        "binding": "#debug_biome_override_deep_ocean",
        "label": "deep_ocean"
      },
      {
        "binding": "#debug_biome_override_warm_ocean",
        "label": "warm_ocean"
      },
      {
        "binding": "#debug_biome_override_deep_warm_ocean",
        "label": "deep_warm_ocean"
      },
      {
        "binding": "#debug_biome_override_lukewarm_ocean",
        "label": "lukewarm_ocean"
      },
      {
        "binding": "#debug_biome_override_deep_lukewarm_ocean",
        "label": "deep_lukewarm_ocean"
      },
      {
        "binding": "#debug_biome_override_cold_ocean",
        "label": "cold_ocean"
      },
      {
        "binding": "#debug_biome_override_deep_cold_ocean",
        "label": "deep_cold_ocean"
      },
      {
        "binding": "#debug_biome_override_frozen_ocean",
        "label": "frozen_ocean"
      },
      {
        "binding": "#debug_biome_override_deep_frozen_ocean",
        "label": "deep_frozen_ocean"
      },
      {
        "binding": "#debug_biome_override_bamboo_jungle",
        "label": "bamboo_jungle"
      },
      {
        "binding": "#debug_biome_override_bamboo_jungle_hills",
        "label": "bamboo_jungle_hills"
      },
      {
        "binding": "#debug_biome_override_sunflower_plains",
        "label": "sunflower_plains"
      },
      {
        "binding": "#debug_biome_override_swampland_mutated",
        "label": "swampland_mutated"
      },
      {
        "binding": "#debug_biome_override_ice_plains_spikes",
        "label": "ice_plains_spikes"
      },
      {
        "binding": "#debug_biome_override_cold_taiga_mutated",
        "label": "cold_taiga_mutated"
      },
      {
        "binding": "#debug_biome_override_savanna_mutated",
        "label": "savanna_mutated"
      },
      {
        "binding": "#debug_biome_override_savanna_plateau_mutated",
        "label": "savanna_plateau_mutated"
      },
      {
        "binding": "#debug_biome_override_roofed_forest_mutated",
        "label": "roofed_forest_mutated"
      },
      {
        "binding": "#debug_biome_override_desert_mutated",
        "label": "desert_mutated"
      },
      {
        "binding": "#debug_biome_override_flower_forest",
        "label": "flower_forest"
      },
      {
        "binding": "#debug_biome_override_taiga_mutated",
        "label": "taiga_mutated"
      },
      {
        "binding": "#debug_biome_override_jungle_mutated",
        "label": "jungle_mutated"
      },
      {
        "binding": "#debug_biome_override_jungle_edge_mutated",
        "label": "jungle_edge_mutated"
      },
      {
        "binding": "#debug_biome_override_mesa_bryce",
        "label": "mesa_bryce"
      },
      {
        "binding": "#debug_biome_override_mesa_plateau_stone_mutated",
        "label": "mesa_plateau_stone_mutated"
      },
      {
        "binding": "#debug_biome_override_mesa_plateau_mutated",
        "label": "mesa_plateau_mutated"
      },
      {
        "binding": "#debug_biome_override_birch_forest_mutated",
        "label": "birch_forest_mutated"
      },
      {
        "binding": "#debug_biome_override_birch_forest_hills_mutated",
        "label": "birch_forest_hills_mutated"
      },
      {
        "binding": "#debug_biome_override_redwood_taiga_mutated",
        "label": "redwood_taiga_mutated"
      },
      {
        "binding": "#debug_biome_override_extreme_hills_mutated",
        "label": "extreme_hills_mutated"
      },
      {
        "binding": "#debug_biome_override_extreme_hills_plus_trees_mutated",
        "label": "extreme_hills_plus_trees_mutated"
      },
      {
        "binding": "#debug_biome_override_redwood_taiga_hills_mutated",
        "label": "redwood_taiga_hills_mutated"
      },
      {
        "binding": "#debug_biome_override_plains",
        "label": "plains"
      }
    ]
  }
] as const;
export function createWorldSettingsExtraDemoData(image:WorldCloudSettingsImage):{cloud:WorldCloudSettingsSnapshot;debug:WorldDebugSettingsSnapshot}{return{cloud:{...cloudBase,images:{'textures/ui/icon_external_link':{...image}}},debug:debugBase};}
