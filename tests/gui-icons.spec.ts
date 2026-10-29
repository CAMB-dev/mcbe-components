import{test,expect}from'@playwright/test';
import{createElement}from'react';
import{renderToStaticMarkup}from'react-dom/server';
import{readFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{inflateRawSync}from'node:zlib';
import{PNG}from'pngjs';
import{GuiIcon,guiIconNames,PixelIcon}from'../src';
import type{GuiIconName,GuiIconProps}from'../src';

// Independent immutable full-release ZIP entries, pinned before productioncopy.
// Pixel expected images are read from this ZIP, never generatedmanifest/assets.
const ARCHIVE_SHA='d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf';
const ARCHIVE_URL='https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip';
const SOURCE_ICONS=[
  ["arrow-left-white", "resource_pack/textures/ui/arrow_left_white.png", "46818c2bdd7f1c7df5f3e416c7bb76b51d8b89a9269dd90d0da098ab0ce27ac0", 4, 7],
  ["arrow-right-white", "resource_pack/textures/ui/arrow_right_white.png", "fc340778bfd5c3c0492d3cee644854da747432ce4e0f739344485779034293f4", 4, 7],
  ["arrow-down-small", "resource_pack/textures/ui/arrow_down_small.png", "549c3c1b00cc6167e98769e49a879fc47d23a8b7d933b17568d788999d62d3d8", 11, 9],
  ["chevron-left", "resource_pack/textures/ui/chevron_left.png", "6347595f4a317c028fc9160d3d1a7f5cb12ead3af205ce34453381705eac264b", 4, 7],
  ["chevron-right", "resource_pack/textures/ui/chevron_right.png", "732a483709001177452adce7907faeef09655b4787ba90e5e3af397f972ddb68", 4, 7],
  ["chevron-white-down", "resource_pack/textures/ui/chevron_white_down.png", "44535c4efb28008a1fff518e34c040652bd1e6edafcf5e47e89b1e8fa82c6bdd", 11, 11],
  ["chevron-white-up", "resource_pack/textures/ui/chevron_white_up.png", "fa26a7386c203db3a98543e3f817b18809f9d2c829e74382321bdd3fc44ec41a", 11, 11],
  ["chevron-grey-left", "resource_pack/textures/ui/chevron_grey_left.png", "104c8f6633ff69f725ac3b9a65f08a14786bb4cec8b328deb5bf07ab767a68b3", 11, 11],
  ["chevron-grey-right", "resource_pack/textures/ui/chevron_grey_right.png", "3ddb67e15d79bf48ff00e7fc6d189895982dcfda109e8c4b5ab5385983f66efc", 11, 11],
  ["dropdown-chevron", "resource_pack/textures/ui/dropdown_chevron.png", "f661ee43ad1096cd996fdbaf33f96453f583e759da6af4bdbc5d9a843ca22ebe", 11, 11],
  ["dropdown-chevron-up", "resource_pack/textures/ui/dropdown_chevron_up.png", "f4fae1fdd3702d011142e8e8514b8561de93f30af890022253fbae1d264db95c", 11, 11],
  ["up-arrow", "resource_pack/textures/ui/up_arrow.png", "22ae6f6ffa12425448df5851df46bf875634058540d4b941f3eb7e1f60dfc374", 12, 12],
  ["down-arrow", "resource_pack/textures/ui/down_arrow.png", "9b1fac2d525c31eaec23b1ad4167b054010a4254a63d88eccebadb9d4f5c10cb", 12, 12],
  ["sidebar-menu-threebars", "resource_pack/textures/ui/sidebar_icons/menu_threebars.png", "23395074d52141a1e35a17e489d6df1fc4f26106f2df1dda0101949f364f2219", 7, 7],
  ["external-link", "resource_pack/textures/ui/external_link.png", "b6f904b36e90409d0d80200dd0c068d78b29283791e0e8dcda0807f4c3a9fb28", 20, 20],
  ["search", "resource_pack/textures/ui/magnifyingGlass.png", "f7981e0ddec7fa63165ce4ecc7530800be9083232325fc580688cc10e6e29e49", 16, 16],
  ["search-small", "resource_pack/textures/ui/magnifying_glass.png", "f3aebd4ae834bf0b7e08c517a1bb9d166cb3a7bac60cec37659cefb7e1627b29", 7, 7],
  ["plus", "resource_pack/textures/ui/plus.png", "965fa4c152e09cdd8d61ead15b5eb2ecefd9e1c78cd49a9b652b84b78bf55f9f", 11, 11],
  ["minus", "resource_pack/textures/ui/minus.png", "0284676ac3f7d0a653c68c9a3f9547fdde4ad4c3c1356b3c60e939bea2ec8052", 11, 3],
  ["thin-plus", "resource_pack/textures/ui/ThinPlus.png", "bf4a5c47bd2c13aadb618d3b263c172e383a65dd1ca747daa283b0b58d8c6be4", 7, 7],
  ["dark-plus", "resource_pack/textures/ui/dark_plus.png", "832871dd9336f8c9daa0d6cc291e1f0bbe607227b71ebd6d6859c53259d72551", 8, 8],
  ["copy", "resource_pack/textures/ui/copy.png", "dd7b3dcc8c3ab7cc70c755bc25232014ebac3d54ab0bd393ab193b857e09059d", 12, 12],
  ["paste", "resource_pack/textures/ui/paste.png", "84073c88b30c7a5ac3f644476d05fd704a9695d5f6b91d128fa3232e72ad0280", 12, 12],
  ["undo-arrow", "resource_pack/textures/ui/undoArrow.png", "41eff2b295f28ccb2f7fb3cb163f03fc95a02439ec87173c3fa29bccacce3653", 14, 14],
  ["refresh", "resource_pack/textures/ui/refresh.png", "cbc84d89170257d5fec5aa55bee2df9a53d907e6a15a8d84dfeb3d6246bf10ff", 18, 14],
  ["trash", "resource_pack/textures/ui/trash.png", "43a57e20e6e1e045ffdc008ae1982004a610482d31a76811cb44d6f3e608e376", 13, 17],
  ["pencil-edit-icon", "resource_pack/textures/ui/pencil_edit_icon.png", "065d8e65346e7d70571c7d8e078087c3adf67ac61b4deaea8d1951fd55361f32", 18, 16],
  ["store-filter-icon", "resource_pack/textures/ui/store_filter_icon.png", "583b4ff8cf67351d4104998fb5bb55c0c515fc0c4e6c80e81e283ab3e9631444", 17, 17],
  ["store-sort-icon", "resource_pack/textures/ui/store_sort_icon.png", "91464df568339c22bf9796a3d169f2d12d18dd709d472ff0b9f1fb3c005d6022", 21, 17],
  ["store-home-icon", "resource_pack/textures/ui/store_home_icon.png", "41a284a9a0410d01bdc6a895d6d9ec37e5d3b5045eef15ea79af772818e149be", 13, 11],
  ["icon-expand", "resource_pack/textures/ui/icon_expand.png", "3c8e35bf06bad1fe793485b25bd2752497662076029ac5d818ee46451ec701c2", 12, 12],
  ["elipses", "resource_pack/textures/ui/elipses.png", "152fcff37ccf659e77c25b619d12c8763655680acd14429a00b3856e2f6e2b7b", 14, 4],
  ["checkmark-white", "resource_pack/textures/ui/checkmark_white.png", "acc252077de1a336a634190adffe47333cf4cca0586983879a6e0777a4f7766a", 8, 6],
  ["close-x-button", "resource_pack/textures/ui/close_X_button.png", "90c419d3f7caaf146d566d80e0aa4d340dde485c33fc4490fb440810f3165286", 15, 15],
  ["accessibility-glyph", "resource_pack/textures/ui/accessibility_glyph.png", "88613ece26cb7031314b578dc4ba014631adf69c7131bcf86650bcef2b421440", 13, 20],
  ["accessibility-glyph-color", "resource_pack/textures/ui/accessibility_glyph_color.png", "7f42a3421dd98f74578a0f4fac2643f80d4a649aeb3a7f6a322b38f3360a90ee", 13, 20],
  ["controller-glyph", "resource_pack/textures/ui/controller_glyph.png", "00abbfb7d92fa35635979bfbabad0b3276e72e86e4d0640f1717d7a4a63fe931", 21, 14],
  ["controller-glyph-color", "resource_pack/textures/ui/controller_glyph_color.png", "3c165bb7cbbe3af4ca7416faecc3dbab507bc71ca45de99730ca0866f02eb2b2", 21, 14],
  ["keyboard-and-mouse-glyph", "resource_pack/textures/ui/keyboard_and_mouse_glyph.png", "3d88dc398fae9ca8351a0ad991f35c0eb09d82d4a8d0ca14ff4fcb32a8b002f5", 19, 9],
  ["keyboard-and-mouse-glyph-color", "resource_pack/textures/ui/keyboard_and_mouse_glyph_color.png", "598a212f26ab914145c2d4a9ea65ec73caa646bc3487ccc27f917ab398194573", 19, 9],
  ["touch-glyph", "resource_pack/textures/ui/touch_glyph.png", "57d7732720d003af5ddf88b14db9a245f0df4df74928766e785e53fa5e960d2f", 20, 14],
  ["touch-glyph-color", "resource_pack/textures/ui/touch_glyph_color.png", "dda58b0ded99285e200961e8e3b052624a26c5cef516c6f3ce50146e885c32a2", 20, 14],
  ["video-glyph", "resource_pack/textures/ui/video_glyph.png", "b809bb2077779d827cee749c8ba319b5718b47d6789f137e3e82e36ce630df24", 15, 12],
  ["video-glyph-color", "resource_pack/textures/ui/video_glyph_color.png", "b2058914e60274db17e69e14d86efdf1efb79ac8aad654ee98fffdc20968e83d", 15, 12],
  ["sound-glyph", "resource_pack/textures/ui/sound_glyph.png", "06b1efed5ceb3082c7b6421841a52d75a18f4e267bfca88eaf8ba033cf8244de", 16, 12],
  ["sound-glyph-color", "resource_pack/textures/ui/sound_glyph_color.png", "7244b867481bfd397377aa508f3d59945adf7fd392b2d667b21fcbe61bc1f920", 16, 12],
  ["language-glyph", "resource_pack/textures/ui/language_glyph.png", "2c8f0bb563b61383d8710ed6d2d82b04670b8407f20f61d4b8e726bbdf6c8748", 25, 13],
  ["language-glyph-color", "resource_pack/textures/ui/language_glyph_color.png", "d91876a071b85ff2b900fcedbba0813a5ce08e7e58aab33218b15b54bcf367f1", 25, 13],
  ["vr-glyph", "resource_pack/textures/ui/vr_glyph.png", "57de92b580e020c97a0ca254b6d14eafdd7aaadc25ce3a59cc71351a631a9d59", 19, 11],
  ["vr-glyph-color", "resource_pack/textures/ui/vr_glyph_color.png", "2da7375ddaa446a8f7f06e2e00d1232a8710d1ebbf75a9738b995ec6fd44733f", 19, 11],
  ["advanced-glyph", "resource_pack/textures/ui/advanced_glyph.png", "724a731eb559f203b3705180354f2c83e7e4ac551e6a0e6fd54150410ae137f2", 16, 16],
  ["advanced-glyph-color", "resource_pack/textures/ui/advanced_glyph_color.png", "9dff4b1b49cc8314513c072e9727cabd2d10945075d32c5fd5eda11c72841106", 16, 16],
  ["world-glyph", "resource_pack/textures/ui/world_glyph.png", "8ba421f999c07ea2827783d93305587fe80cd0472ebb9113d0a36d86b230f3d9", 16, 17],
  ["world-glyph-color", "resource_pack/textures/ui/world_glyph_color.png", "ec499c020115a976cfe434c525132f08fa41aa523ecf2191b59e9e2bbaeb5ae0", 16, 17],
  ["multiplayer-glyph", "resource_pack/textures/ui/multiplayer_glyph.png", "da14f4600757df01ee448e6d13e870d3e6b250ec68f1a09b2dc2e93f19534c16", 22, 12],
  ["multiplayer-glyph-color", "resource_pack/textures/ui/multiplayer_glyph_color.png", "d9e0c1c36d0fb6512be303c1960b0b4c2d203e776165242b4d97d5320f8bd129", 22, 12],
  ["broadcast-glyph", "resource_pack/textures/ui/broadcast_glyph.png", "63d93dadfb62e044df7a50ed3495b539bba66344c30c6fc72386589c7d82724c", 18, 19],
  ["broadcast-glyph-color", "resource_pack/textures/ui/broadcast_glyph_color.png", "812dd95f02378defd2648e865aaba3aaef2f34b947c199d3bb9f72b9f9278e14", 18, 19],
  ["storage-icon", "resource_pack/textures/ui/storageIcon.png", "a71a4b499e2c0a7770140a1c65085cb2ad860cc09d1feb720826673cbb649ed0", 17, 16],
  ["storage-icon-color", "resource_pack/textures/ui/storageIconColor.png", "210a8d60b4325d0c9d21dc3b37b7f84d81482750b3441ed64cb6b3c7a03dcdfe", 17, 16],
  ["automation-glyph", "resource_pack/textures/ui/automation_glyph.png", "4bf3cdf8e5ed96056ca3c21c6b1464a1064085c3ddb12ca43ac41de4033ebfb7", 14, 14],
  ["automation-glyph-color", "resource_pack/textures/ui/automation_glyph_color.png", "4afe76c0f3abad6b9037ee2879d903e41aefd716b2d86b4a440b49dd65540ed4", 14, 14],
  ["settings-glyph-2x", "resource_pack/textures/ui/settings_glyph_2x.png", "01a1e3345604e22e098f579e74653dd3670540e63b21f4d66c728f6f4d45b5cb", 45, 45],
  ["settings-glyph-color-2x", "resource_pack/textures/ui/settings_glyph_color_2x.png", "6227d4a776209a3c496903c18ee8b2fc60e958e0a8637d0b4e614e5cc42a58cc", 45, 45],
  ["gear", "resource_pack/textures/ui/gear.png", "e67c88fe5e446091b02696357c486e41b666fe6efef909da7573a048215ddff4", 14, 14],
  ["mute-on", "resource_pack/textures/ui/mute_on.png", "ebb0a4afe52cf2443886959a88a157c64fb3b5dc531b621675fb58ffe9dd73a1", 14, 14],
  ["mute-off", "resource_pack/textures/ui/mute_off.png", "909782386f817e90a8a116a6ceaf4699d54ca77e9bf6f38b2950b0db1e1b3bed", 14, 14],
  ["error-glyph", "resource_pack/textures/ui/ErrorGlyph.png", "1b274eea56592b90fcb3ce90f112d2cea9d4f1a31536fd7eeb8a432c740e1c1e", 13, 20],
  ["error-glyph-small", "resource_pack/textures/ui/ErrorGlyph_small.png", "6f0a79d4b4f3ad421ac33eb17c54f81457e9a66114449ff30d05def0ca5237ec", 9, 12],
  ["error-glyph-small-hover", "resource_pack/textures/ui/ErrorGlyph_small_hover.png", "5c866c2f36dc335354469418921d23b5283771421af6e34509f8a977a672d06c", 9, 12],
  ["warning-glyph", "resource_pack/textures/ui/WarningGlyph.png", "e5c481628adec8b4e60aff01b26b330dc2433a87e5534454d17a77c5e404afba", 13, 20],
  ["warning-glyph-small", "resource_pack/textures/ui/WarningGlyph_small.png", "477199384177cc336e3072e885c3eba8077f556803f0598fb4df41729d79f471", 9, 12],
  ["warning-glyph-small-hover", "resource_pack/textures/ui/WarningGlyph_small_hover.png", "d8f2bf1da8e18c5f86eadcb3be2d0b955aacda3897cb92249235526dac25afad", 9, 12],
  ["update-glyph", "resource_pack/textures/ui/UpdateGlyph.png", "74cc87e0d1d258db4592cacdc908d6bdc74f95429c914bfddccc4abca1059a52", 13, 20],
  ["update-glyph-small", "resource_pack/textures/ui/UpdateGlyph_small.png", "7e291e65bf873cd8769b9286af2faa4e9208b22f6cacd6c15b4c5a7d3a1ce636", 9, 12],
  ["infobulb", "resource_pack/textures/ui/infobulb.png", "01338044c8434b2cb37e35517e212c54b5de8fb7eb5776c49f32d4f4219d928c", 15, 19],
  ["infobulb-darkborder-small", "resource_pack/textures/ui/infobulb_darkborder_small.png", "920da766fb16e6bab139535b86c1b7812833cf64ec1a6f20cef1d21c38ee8900", 7, 9],
  ["feedback", "resource_pack/textures/ui/Feedback.png", "62470352282f5d58dce2432324c5e54b2bacde6350c6472a3375266b68021e53", 32, 32],
  ["bang-icon", "resource_pack/textures/ui/bang_icon.png", "896a5d6dbbb7af590b2d4328dc7d5294a13c31ed6c56a38e502272c6281dd43c", 2, 8],
  ["timer", "resource_pack/textures/ui/timer.png", "e0e576e2e3b34ec51d9ffb82db9db638e372d7b7db8a726c756117083a067802", 11, 11],
  ["clock", "resource_pack/textures/ui/clock.png", "dd9cddd1a6fa6ce99b7e0cdd5bb51acfaf95fe35f7a541c9eb8fa3c82ca0a72d", 11, 11],
  ["achievements", "resource_pack/textures/ui/achievements.png", "9258092b1ea5febac5135b2d13406e23ed90703b4a489a775a60febbb2cabdc9", 11, 15],
  ["achievements-pause-menu-icon", "resource_pack/textures/ui/achievements_pause_menu_icon.png", "4cc57fbff07bc84b8256d25d047abd92c9b26213948a934b8094a24a2f91c7cd", 32, 32],
  ["achievement-locked-icon", "resource_pack/textures/ui/achievement_locked_icon.png", "8dded105aff18b4af80a15a599cc8c0b276b58a73dab54048591d4a5b2642acc", 7, 7],
  ["lock", "resource_pack/textures/ui/lock.png", "fa54afb188ed482b1f6cd63c3bf433f767c67f8c5094df92a11ab838776c2322", 8, 8],
  ["unlock", "resource_pack/textures/ui/unLock.png", "a8e75eabdaf57c2b37d0da9cc37214bd3459e92a0635beceb0e5e751f77c994a", 10, 8],
  ["icon-lock", "resource_pack/textures/ui/icon_lock.png", "0a71ca466d851368d77c933f218ad38ad9296d4065147bd44fb77b1bc5a3cb72", 9, 11],
  ["icon-unlocked", "resource_pack/textures/ui/icon_unlocked.png", "28672967fa1825d652bf077025a37e619269f622b4384eb4b2e6c2933c7ce5ea", 12, 11],
  ["friends-icon", "resource_pack/textures/ui/FriendsIcon.png", "8d9a1026570cd726ea9c75292e96234d0a410085b7a8e75dbb91a37a5ece4961", 15, 15],
  ["navigation-friends-icon", "resource_pack/textures/ui/friendsbutton/navbar-friends-icon.png", "70fbbf73056176cc77ca0ff135719cf339304259e84bfeee16970202ea6f69e2", 24, 24],
  ["friend-glyph", "resource_pack/textures/ui/friend_glyph.png", "d4faaba00238a0cc50a7ff5cc1cb243518b54ffd684e4fa3ec54d536cdaed741", 10, 10],
  ["friend1", "resource_pack/textures/ui/Friend1.png", "e7d161f733e1b6cd27a92540c125ee77ac6e7af86cbfee7ec7c0536bed9ab032", 10, 10],
  ["friends-diversity", "resource_pack/textures/ui/FriendsDiversity.png", "92491bdfef5a2834419a4373fcd1984d76a315a0701d6dbac7172e4bb2545e60", 14, 14],
  ["invite", "resource_pack/textures/ui/invite.png", "ab51360c3a04720ace682a4b64a839d16d2b3e9c9f91ee35c8f0c275c411b7d8", 10, 9],
  ["user-icon-small", "resource_pack/textures/ui/user_icon_small.png", "d5b4187085f57bcc25385222e8e4159e8c772145dbe095d9147a75e25c76a5f3", 9, 9],
  ["user-icon-white", "resource_pack/textures/ui/user_icon_white.png", "ddcbc37a43aa1cd7566e6172d040b8acdb4dfa20ba409382f8963a3a2bf81ddf", 9, 9],
  ["profile-glyph", "resource_pack/textures/ui/profile_glyph.png", "64cdfa352d442f43677bea289ca077357fed9462720877d2a8db6f20ccbd97dd", 11, 12],
  ["profile-glyph-color", "resource_pack/textures/ui/profile_glyph_color.png", "0c20ada8d1005a6af1416ca68e19e04a92583ec31c3ec9c9014145669f892090", 11, 12],
  ["social-default-icon", "resource_pack/textures/ui/socialbuttonicon/social-default-icon.png", "4efc8b80ef31324aa67bb2cdf45e392800a96187b52648c51a3a432b1b955f3a", 12, 12],
  ["social-hover-icon", "resource_pack/textures/ui/socialbuttonicon/social-hover-icon.png", "02c32fb9ecd464399a4141c76dd692841aeebc2462848a4f22029127c06acdfb", 12, 12],
  ["chat-keyboard", "resource_pack/textures/ui/chat_keyboard.png", "6997491e179dec824c80b8f8e0197cd26e663835e2ca53d529fc433ed59189be", 9, 7],
  ["chat-keyboard-hover", "resource_pack/textures/ui/chat_keyboard_hover.png", "5cb198df748d078daf0eb118f2a4e97ce587d47bd6f2d0a0d26a08cde2400c51", 9, 7],
  ["chat-send", "resource_pack/textures/ui/chat_send.png", "d958896be5f3c1fd5281711d65fbfaec9102a1a4280e05a1b0e1893810279ea8", 21, 18],
  ["comment", "resource_pack/textures/ui/comment.png", "d0e60a3973dc1e8b5493ceee236975409e41da3f49180b5aac36aad7cfa388b3", 11, 9],
  ["icon-mail", "resource_pack/textures/ui/icon_mail.png", "4fbad75859fb93bcc3516619f103f368cc3fffc25d373051363519cc6bb359ed", 16, 16],
  ["envelope", "resource_pack/textures/ui/Envelope.png", "a51f592ab73859923dbc6c8d0a64ac672d07f2d1aa4dc40656fb22c0c2e9a3d0", 24, 24],
  ["gift-glyph", "resource_pack/textures/ui/gift_glyph.png", "d21f0273e54e97d5155fe05c42b2fbd2a6b502a5d0744351dc42e782e980f116", 9, 9],
  ["player-online-icon", "resource_pack/textures/ui/player_online_icon.png", "e92fb9bd1559160a46e40073282dcebea9508d06a6c00a4dcb224316c3bcbceb", 7, 7],
  ["player-offline-icon", "resource_pack/textures/ui/player_offline_icon.png", "489c27548d177518573bc6e2ca2439fb5e9e970e201a66361139edb1c2e1e523", 7, 7],
  ["lan-icon", "resource_pack/textures/ui/lan_icon.png", "093a08fa77753b88d6cd225815e0b49df72b46b7523393188137f56579df3cc2", 14, 14],
  ["share-glyph-generic", "resource_pack/textures/ui/share_glyph_generic.png", "bab6e2cba37ecd59c7fa25557744c9d2f6cf1d8da145ff5576012b8b1b3275d6", 9, 9],
  ["glyph-inventory", "resource_pack/textures/ui/glyph_inventory.png", "ddcbc37a43aa1cd7566e6172d040b8acdb4dfa20ba409382f8963a3a2bf81ddf", 9, 9],
  ["inventory-icon", "resource_pack/textures/ui/inventory_icon.png", "57e0a1a340ad5ebb74b82c001c1a22131b08d0ba70913d18899ab13934b82d3c", 19, 13],
  ["creative-icon", "resource_pack/textures/ui/creative_icon.png", "878ee16ad7cff76c628848a1b8585de9d02d774fc3422b89093721561b776660", 19, 13],
  ["recipe-book-icon", "resource_pack/textures/ui/recipe_book_icon.png", "603c7c9006080f8d9911853239c2ab50337802cad2ec9b19202e305798f103bc", 19, 13],
  ["recipe-book-expand-icon", "resource_pack/textures/ui/recipe_book_expand_icon.png", "2660820c417ed4633ad584963286aacc85cfcc581a930f262aa79cae7f30bbd7", 7, 7],
  ["recipe-book-collapse-icon", "resource_pack/textures/ui/recipe_book_collapse_icon.png", "4d71c9ea45ffa8aeb0de3f9c889878e1da122cd46c735ec00882b864f721cc22", 7, 7],
  ["icon-crafting", "resource_pack/textures/ui/icon_crafting.png", "353aa171730d550c9050046f26cfdbc1600ed5667700616e1b1ae86f7347d436", 16, 16],
  ["anvil-icon", "resource_pack/textures/ui/anvil_icon.png", "5858dfc62fe01b7629dbea9a1b71bb7523c196e1418e2a075ff3fc8ec6e624a3", 15, 15],
  ["smithing-icon", "resource_pack/textures/ui/smithing_icon.png", "25f2a66d7d0ab4f792c066eb35c9f8a41846b05a974ee4d524b4f87d96d554d1", 30, 30],
  ["trade-icon", "resource_pack/textures/ui/trade_icon.png", "4ebb9189163ca421b9974dd40212732843de20394954c6176b8d82181f6f8f16", 18, 17],
  ["category-icon-blocks", "resource_pack/textures/ui/category_icon_blocks.png", "d149c316fcbd2e1e8075cb17ebda39a20b4b84f16ef6a3fa8cfcfee832e870ba", 16, 17],
  ["category-icon-items", "resource_pack/textures/ui/category_icon_items.png", "f0cadcd8eea2abd57bf50b8243e78cbe53ba6f0773657331f480dfd42040b183", 16, 12],
  ["category-icon-food", "resource_pack/textures/ui/category_icon_food.png", "9b6c63924add3d68934470f095b04ad1027b7870f5abe13e059dadd576776572", 13, 14],
  ["icon-recipe-construction", "resource_pack/textures/ui/icon_recipe_construction.png", "621c27048e015fa79ff04936cbc8b02d0c71fdeb3a8ed0d50b33d791b5bb5796", 17, 17],
  ["icon-recipe-equipment", "resource_pack/textures/ui/icon_recipe_equipment.png", "da02526305b5f254e47da59b015f91e82278b3cdb4c0f500f78d7a7252ff6550", 17, 17],
  ["icon-recipe-item", "resource_pack/textures/ui/icon_recipe_item.png", "482f9199200fabcd51d8afbadfee4d039f051626164bf9d5f72fed6caac58bce", 17, 17],
  ["icon-recipe-nature", "resource_pack/textures/ui/icon_recipe_nature.png", "0f334a123b498ecec76b4512c4fcf269ee3e79169e79a338db43b5f6a9f6fca9", 17, 17],
  ["glyph-resource-pack", "resource_pack/textures/ui/glyph_resource_pack.png", "d7c87156df4c3773fc3a495619c153ad39570b8081c8fe720a9daff8ecb7ce34", 12, 12],
  ["glyph-audio-pack", "resource_pack/textures/ui/glyph_audio_pack.png", "2549ca029f572d189808b5d1fb64654ae997961029159b197bc4c2b09b23a4d8", 12, 12],
  ["glyph-skin-pack", "resource_pack/textures/ui/glyph_skin_pack.png", "e74623e9174086251fd4915d855b13a8fd4d638932c7a5960c79ab81d4b58036", 12, 12],
  ["glyph-world-template", "resource_pack/textures/ui/glyph_world_template.png", "f0478db11a9787581e7b56c7a1ce9fdcb4396dbf9b4eabfa767d398f3e393a69", 12, 12],
  ["glyph-addon-pack", "resource_pack/textures/ui/glyph_addon_pack.png", "0548734e8d89ed6102ce19fb94ef3c6ca9fbf1940897e8ef620725b84a75891d", 12, 12],
  ["empty-armor-slot-helmet", "resource_pack/textures/ui/empty_armor_slot_helmet.png", "04d5309ebb0762f761a3b4f21b98fcec69a459c2ed271f767476a5659533246b", 16, 16],
  ["empty-armor-slot-chestplate", "resource_pack/textures/ui/empty_armor_slot_chestplate.png", "d2b322c720f4335ff8812533d17c11564fade0515497ec55f5a9989d2b9a80c3", 16, 16],
  ["empty-armor-slot-leggings", "resource_pack/textures/ui/empty_armor_slot_leggings.png", "68b70a8129c33104584dd0cbf308caa9fcb1c17bdf7147ea6be6f392ea34293f", 16, 16],
  ["empty-armor-slot-boots", "resource_pack/textures/ui/empty_armor_slot_boots.png", "9bc0c3ee67f2a4983583716127d236cffa7ecaaab3926fd68d9740d024b34cff", 16, 16],
  ["gamepad-icon-button", "resource_pack/textures/ui/gamepad_icon_button.png", "bd14d48fc13421b3fa180d4eea8ec8336826bfb5a463a04d23d5a6973b2b3165", 15, 13],
  ["gamepad-icon-dpad", "resource_pack/textures/ui/gamepad_icon_dpad.png", "364336f2e71cb5aa3ff63eb7df75699ab8daa1a004bb176d61937f1495e1634a", 21, 21],
  ["gamepad-icon-thumbstick", "resource_pack/textures/ui/gamepad_icon_thumbstick.png", "d986cde6666e682fa2b6fb3d3a1be22def100bdeaf8e6180bb066574257debf9", 12, 9],
  ["gamepad-icon-left-bumper", "resource_pack/textures/ui/gamepad_icon_left_bumper.png", "901e32da1fd128c354f6e4eccb9022993284f309e71f9093fca9dceb1f072094", 27, 13],
  ["gamepad-icon-right-bumper", "resource_pack/textures/ui/gamepad_icon_right_bumper.png", "019f7f109268b4e8020449b73f9e27d5c06659cadba9982a6244af955d7e324a", 27, 13],
  ["gamepad-icon-left-trigger", "resource_pack/textures/ui/gamepad_icon_left_trigger.png", "845c0d7a1a4933ec6e2f724e4e8ddf7447f500e1e06edd3d3e4a91e64b09eafe", 13, 27],
  ["gamepad-icon-right-trigger", "resource_pack/textures/ui/gamepad_icon_right_trigger.png", "118a681a1a60fee3ca7cfbefb33a9121faed3647eb3ba907d8e56210dcb557ce", 13, 27],
  ["generic-face-button-up", "resource_pack/textures/ui/generic_face_button_up.png", "ce0a390bd5aad2c711149fa148d10d746ab168fa816e1decbc589adc5d4bc4a3", 26, 26],
  ["generic-face-button-down", "resource_pack/textures/ui/generic_face_button_down.png", "2a3494b2e7c6391bbd31d3e2b0203dadc00160f12cd2762bcf2555c77ffcfd47", 26, 26],
  ["generic-face-button-left", "resource_pack/textures/ui/generic_face_button_left.png", "1278e29e79cf6c17655e0be07806e64b1973903ef8be230a76a42f211ead37fe", 26, 26],
  ["generic-face-button-right", "resource_pack/textures/ui/generic_face_button_right.png", "56244365873f636aa25c2ed880617d4e1edfcdfa24094388cf3399b4d87df0d8", 26, 26],
  ["generic-start-button", "resource_pack/textures/ui/generic_start_button.png", "c629016c85a3d02e17b4dc5ea8ff06984205153e0731d3398b5d3bdc3e4f8e3b", 26, 26],
  ["generic-select-button", "resource_pack/textures/ui/generic_select_button.png", "100054d07c4a896ad32b4114dff6e37cc9554161e958a03eee270e03750ad279", 26, 26],
]as const;
const ordered=[...SOURCE_ICONS].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data:Uint8Array){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]!^(c>>>8);return(c^0xffffffff)>>>0;}
interface ZipEntry { method:number; flags:number; crc:number; packed:number; size:number; offset:number }
interface OriginalIcon { name:string; entry:string; bytes:Buffer; png:PNG; sha256:string; rgbaSha256:string; crc32:string }
let archivePromise:Promise<Map<string,OriginalIcon>>|undefined;
async function originals():Promise<Map<string,OriginalIcon>>{
  return archivePromise??= (async()=>{
    let archive:Buffer;
    try{archive=await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip',import.meta.url));}
    catch{throw new Error('GuiIcon original public ZIP missing: run npm run pretest to fetch '+ARCHIVE_URL+' with SHA256 '+ARCHIVE_SHA);}
    expect(sha(archive),'immutable officialfullZIP').toBe(ARCHIVE_SHA);
    let end=-1;for(let p=archive.length-22;p>=Math.max(0,archive.length-65557);p--)if(archive.readUInt32LE(p)===0x06054b50&&p+22+archive.readUInt16LE(p+20)===archive.length){end=p;break;}
    if(end<0)throw Error('Missing ZIP end record');
    const count=archive.readUInt16LE(end+10);let pos=archive.readUInt32LE(end+16);
    if(count===65535||pos===0xffffffff)throw Error('This pinned original ZIP should not require ZIP64.');
    const entries=new Map<string,ZipEntry>();
    for(let i=0;i<count;i++){
      if(archive.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid original ZIP central record');
      const n=archive.readUInt16LE(pos+28),extra=archive.readUInt16LE(pos+30),comment=archive.readUInt16LE(pos+32),name=archive.subarray(pos+46,pos+46+n).toString('utf8');
      entries.set(name,{flags:archive.readUInt16LE(pos+8),method:archive.readUInt16LE(pos+10),crc:archive.readUInt32LE(pos+16),packed:archive.readUInt32LE(pos+20),size:archive.readUInt32LE(pos+24),offset:archive.readUInt32LE(pos+42)});
      pos+=46+n+extra+comment;
    }
    const out=new Map<string,OriginalIcon>();
    for(const[name,entry,pinned,width,height]of SOURCE_ICONS){
      const z=entries.get(entry);if(!z)throw Error('Original ZIP entry absent: '+entry);
      if(z.flags&1||archive.readUInt32LE(z.offset)!==0x04034b50)throw Error('Unsupported original ZIP local record: '+entry);
      const start=z.offset+30+archive.readUInt16LE(z.offset+26)+archive.readUInt16LE(z.offset+28),packed=archive.subarray(start,start+z.packed);
      const bytes=z.method===0?Buffer.from(packed):z.method===8?inflateRawSync(packed):(()=>{throw Error('Unsupported ZIP compression');})();
      expect(bytes.length,entry+' declaredbytes').toBe(z.size);expect(crc32(bytes),entry+' originalCRC32').toBe(z.crc);
      expect(sha(bytes),entry+' fulloriginalPNG SHA').toBe(pinned);const png=PNG.sync.read(bytes);
      expect([png.width,png.height],entry+' naturaldimensions').toEqual([width,height]);
      out.set(name,{name,entry,bytes,png,sha256:pinned,rgbaSha256:sha(png.data),crc32:z.crc.toString(16).padStart(8,'0')});
    }
    return out;
  })();
}
const fixture='/demo/gui-icons-fixture.html';
async function ready(page:import('@playwright/test').Page,scale=1,theme='dark'){
  await page.goto(fixture+`?scale=${scale}&theme=${theme}`);
  await expect(page.locator('[data-icon-cell]')).toHaveCount(150);
  await expect.poll(()=>page.locator('[data-icon-atlas] img').evaluateAll(nodes=>nodes.every(node=>{const img=node as HTMLImageElement;return img.complete&&img.naturalWidth>0;}))).toBe(true);
}

test('public canonical names are immutable, typed, server-safe and preserve PixelIcon',()=>{
  const valid:GuiIconName='arrow-left-white';const props:GuiIconProps={name:valid,scale:2,label:'Go back'};
  expect([...guiIconNames]).toEqual(ordered.map(v=>v[0]));expect(new Set(guiIconNames).size).toBe(150);expect(Object.isFrozen(guiIconNames)).toBe(true);
  const html=renderToStaticMarkup(createElement(GuiIcon,props));expect(html).toContain('role="img"');expect(html).toContain('aria-label="Go back"');expect(html).toContain('width:8px');expect(html).toContain('height:14px');expect(html).toContain('alt=""');
  const decorative=renderToStaticMarkup(createElement(GuiIcon,{name:valid}));expect(decorative).toContain('aria-hidden="true"');
  const old=renderToStaticMarkup(createElement(PixelIcon,{name:'heart',size:24}));expect(old).toContain('<svg');expect(old).toContain('width="24"');expect(old).toContain('viewBox="0 0 16 16"');
});

test('unknown and prototype names and invalid or unsafe scale never render a substitute',()=>{
  for(const name of['missing-original','__proto__','constructor','toString','',null,1])expect(()=>renderToStaticMarkup(createElement(GuiIcon,{name:name as GuiIconName}))).toThrow(RangeError);
  for(const scale of[0,-1,.5,1.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,Number.MAX_SAFE_INTEGER])expect(()=>renderToStaticMarkup(createElement(GuiIcon,{name:'arrow-left-white',scale}))).toThrow(RangeError);
});

test('all150 runtime images retain originalZIP PNG bytes, completeRGBA and transparent margins',async({page},testInfo)=>{
  const source=await originals();await ready(page);
  const runtime=await page.locator('[data-icon-cell]').evaluateAll(nodes=>Promise.all(nodes.map(async node=>{
    const image=node.querySelector('img')!;const response=await fetch(image.currentSrc||image.src);
    return{name:(node as HTMLElement).dataset.iconName!,bytes:[...new Uint8Array(await response.arrayBuffer())],natural:[image.naturalWidth,image.naturalHeight]};
  })));
  for(const row of runtime){const expected=source.get(row.name)!;const actualBytes=Buffer.from(row.bytes),actual=PNG.sync.read(actualBytes);
    expect(sha(actualBytes),row.name+' unmodifiedfullPNG').toBe(expected.sha256);expect(row.natural,row.name).toEqual([expected.png.width,expected.png.height]);
    expect(actual.data.equals(expected.png.data),row.name+' everyRGBA byte, including alpha0RGB/margins').toBe(true);
  }
  await testInfo.attach('originalZIP-icon-provenance',{body:Buffer.from(JSON.stringify({archiveURL:ARCHIVE_URL,archiveSha256:ARCHIVE_SHA,entries:[...source.values()].map(({name,entry,sha256,rgbaSha256,crc32,png})=>({name,entry,sha256,rgbaSha256,crc32,size:[png.width,png.height]}))},null,2)),contentType:'application/json'});
});

test('decorative and named semantics expose one image, preserve explicitARIA and spanref events',async({page})=>{
  await ready(page);const scope=page.locator('#semantics');
  await expect(scope.locator('[data-case="decorative"]')).toHaveAttribute('aria-hidden','true');await expect(scope.locator('[data-case="decorative"]').getByRole('img')).toHaveCount(0);
  await expect(scope.getByRole('img',{name:'Health symbol',exact:true})).toHaveCount(1);
  await expect(scope.getByRole('img',{name:'Actual label',exact:true})).toHaveCount(1);await expect(scope.getByRole('img',{name:'Fallback label',exact:true})).toHaveCount(0);
  await expect(scope.getByRole('img',{name:'External label',exact:true})).toHaveCount(1);await expect(scope.getByRole('img',{name:'Hidden label',exact:true})).toHaveCount(0);
  await expect(scope.locator('[data-case="explicit-role"]')).toHaveAttribute('role','presentation');
  for(const image of await scope.locator('.mc-gui-icon__image').all()){await expect(image).toHaveAttribute('alt','');await expect(image).toHaveAttribute('aria-hidden','true');}
  const ref=scope.getByRole('img',{name:'Reference icon',exact:true});await ref.focus();await expect(ref).toBeFocused();await ref.click();
  const details=await page.evaluate(()=>({tag:window.guiIconFixture.ref?.tagName,id:window.guiIconFixture.ref?.id,marker:window.guiIconFixture.ref?.dataset.marker,clicks:window.guiIconFixture.clicks,focus:window.guiIconFixture.focus}));
  expect(details.tag).toBe('SPAN');expect(details.id).toBe('gui-icon-ref');expect(details.marker).toBe('retained');expect(details.clicks).toBe(1);expect(details.focus).toBeGreaterThan(0);await expect(ref).toHaveClass(/custom-gui-icon/);
  await expect(scope.getByRole('button',{name:'Save',exact:true})).toHaveCount(1);await expect(scope.locator('svg.mc-icon')).toHaveAttribute('width','24');
});

test('non-square source dimensions remain natural atscale3 with no clipping or recoloring defaults',async({page})=>{
  const source=await originals();await ready(page,3);
  const boxes=await page.locator('[data-icon-cell]').evaluateAll(nodes=>nodes.map(node=>{const outer=node.querySelector('.mc-gui-icon')!,image=node.querySelector('img')!,r=outer.getBoundingClientRect(),i=image.getBoundingClientRect(),s=getComputedStyle(image);return{name:(node as HTMLElement).dataset.iconName!,outer:[r.width,r.height],image:[i.width,i.height],filter:s.filter,opacity:s.opacity,rendering:s.imageRendering,fit:s.objectFit};}));
  let nonSquare=0,margins=0;for(const row of boxes){const p=source.get(row.name)!.png;expect(row.outer,row.name).toEqual([p.width*3,p.height*3]);expect(row.image,row.name+' inneraspect').toEqual(row.outer);expect([row.filter,row.opacity,row.rendering,row.fit],row.name).toEqual(['none','1','pixelated','contain']);if(p.width!==p.height)nonSquare++;if(p.data.some((v,i)=>i%4===3&&v===0))margins++;}
  expect(nonSquare).toBeGreaterThan(10);expect(margins).toBeGreaterThan(10);
});

for(const scale of[1,2,3])for(const theme of['dark','light'])test(`all150 originalZIP icons atinteger${scale} on${theme} preserve everycompositedRGBA pixel`,async({page},testInfo)=>{
  test.setTimeout(120000);const source=await originals();await ready(page,scale,theme);
  const actualBytes=await page.locator('[data-icon-atlas]').screenshot(),actual=PNG.sync.read(actualBytes);
  const expectedPage=await page.context().newPage();let expectedBytes:Buffer;
  try{
    await expectedPage.setContent('<!doctype html><html><head><style>html,body{margin:0;padding:0}</style></head><body><div id="control"></div></body></html>');
    await expectedPage.evaluate(({entries,scale,background})=>{const control=document.getElementById('control')!;Object.assign(control.style,{display:'grid',gridTemplateColumns:'repeat(7,160px)',width:'1120px',background});for(const entry of entries){const cell=document.createElement('div');Object.assign(cell.style,{position:'relative',width:'160px',height:'160px'});const image=document.createElement('img');image.src=entry.url;Object.assign(image.style,{position:'absolute',left:'8px',top:'8px',display:'block',width:entry.width*scale+'px',height:entry.height*scale+'px',imageRendering:'pixelated'});cell.append(image);control.append(cell);}}, {entries:ordered.map(([name])=>{const icon=source.get(name)!;return{url:'data:image/png;base64,'+icon.bytes.toString('base64'),width:icon.png.width,height:icon.png.height};}),scale,background:theme==='dark'?'#28292a':'#c6c6c6'});
    await expectedPage.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));expectedBytes=await expectedPage.locator('#control').screenshot();
  }finally{await expectedPage.close();}
  const expected=PNG.sync.read(expectedBytes);expect([actual.width,actual.height]).toEqual([1120,3520]);expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
  let changed=0,max=0;const first:{x:number;y:number;name:string|undefined;actual:number[];expected:number[]}[]=[];
  for(let i=0;i<actual.data.length;i+=4){let different=false;for(let k=0;k<4;k++){const delta=Math.abs(actual.data[i+k]!-expected.data[i+k]!);different ||=delta!==0;max=Math.max(max,delta);}if(different){changed++;if(first.length<8){const x=i/4%actual.width,y=Math.floor(i/4/actual.width);first.push({x,y,name:ordered[Math.floor(y/160)*7+Math.floor(x/160)]?.[0],actual:[...actual.data.subarray(i,i+4)],expected:[...expected.data.subarray(i,i+4)]});}}}
  await testInfo.attach(`gui-icons-scale${scale}-${theme}-pixel-proof`,{body:Buffer.from(JSON.stringify({scope:'OriginalZIPsource PNGs in independentlyfixedintegernearest control, completeatlas allRGBA. Chromium alpha compositing consistency, not nativeGUIcontext certification.',archiveSha256:ARCHIVE_SHA,icons:150,scale,theme,pixels:actual.width*actual.height,changedRgbaPixels:changed,maxChannelError:max,actualRgbaSha256:sha(actual.data),expectedRgbaSha256:sha(expected.data),first},null,2)),contentType:'application/json'});
  if(changed){await testInfo.attach('GuiIcon actual completeatlas',{body:actualBytes,contentType:'image/png'});await testInfo.attach('OriginalZIP independent control completeatlas',{body:expectedBytes,contentType:'image/png'});}
  expect(changed,JSON.stringify(first)).toBe(0);expect(max).toBe(0);
});
