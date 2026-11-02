import type { ClassicSkinAsset } from './classic-skin';



/** Private complete originals for the selected Classic Play frame/nav profile.



 * Fixed Bedrock Samples v1.26.60.5 archive SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.



 * Existing whole PNG URLs are reused. The12Tab images and editIcon duplicate



 * byte-identical originals already embedded in existing CSS; no image is redrawn.



 * Rightmost tab skins are reusable source variants, not a claim that the default



 * Play Servers tab sets $is_right_most_tab. Raw source metadata stays unchanged. */



export const playScreenAssets = Object.freeze({



  'textures/ui/TabTopBack': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAAPUlEQVQokWNgQID/eDAG+H/kyBGcGCQPBCCCsGIQ7u7uhmvC0JCUlISBdXR0wBjmPLyKB0ADzPfE4kGoAQB3FDp3dfvZXgAAAABJRU5ErkJggg==", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopBackHover': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABdSURBVHgB1ZC5DcAgDABty9khTZbKAOkyRSbKACkzCSVjUPAJU4AAUXKVJd9JlhES1gMN0CMzi3y/Z8uPe4loJAeOh/MFXC5/9VWB0Qj7tcWIRnIJwSTTAfbeuQgO0gomT/Z70HEAAAAASUVORK5CYII=", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopBackLeftMost': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAAS0lEQVQoFWNgQID/eDAG+H/kyBGcGCQPBCCCsGIQ7u7uhmvC0JCUlISBdXR0wBjmPLyKB1gDEDNgw7AQQvc0A9EakAUIYQZSFIMwAH8RLGpvcku3AAAAAElFTkSuQmCC", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopBackLeftMostHover': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABuSURBVHgBtdAxCoAwDAXQNMQ7uHgpFzc3T6E38QQubo6eRHDxFOJQa2mEVkLt0DcV8j80UeBoAwTK4DdxuJtqKW/nXMJY+FH19P6AwuG6LZ/CdSgo28KWMBYOISRKLng77MP5vzA2s3dvkXYglxtEby5J6HXDHAAAAABJRU5ErkJggg==", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopBackRightMost': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAARUlEQVQoFWNgQID/eDAG+H/kyBGcGF0TXsUg3NPbh6IJRTIpKQkD6+jogDFME17FA6OBICBHAwNJGkLDwsEYrOH/f9IwAAwzz/HJCqL9AAAAAElFTkSuQmCC", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopBackRightMostHover': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABwSURBVHgBldCxEYAgDAXQhIszaONS9to5hdvYOYClk1jauAMFEs5YoEh4FXf5n8sF4eY8SEBP3iThcelS+TCXksmFWTvRswHFw21fXwV7IDRDFUomF44ZKFRcwL9zCt6fnbMFFf607smF84KSZpNPF05vNruD1bxcAAAAAElFTkSuQmCC", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopFront': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAABGdBTUEAALGPC/xhBQAAAExJREFUKM9jYECA/3gwBviPD0DlGSBMAopBoLu7G64JQ8OxY8cwcGhoKBjDnIdX8QBogPqeKA1gT8OCi5AGeLAiaWDApQFZDYoGYjAA9+dvw5b7X1QAAAAASUVORK5CYII=", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopFrontHover': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAB7SURBVHgBvZEhDoAwDEW7ZYQrYDAcCYPDcQost8DhMDgkJ0FiuMMErA0jy0hpMDzVpO8nTb+Ci8MBDMrhZ+PlZiw5n/Y+pCUZyVtzX2Di5bLOj4DdFGR1QiEtyTEaPvJDAN/VV5Mo7oOlPuhLOOAHii59lckNF1zbYdMnfLIxvndbbpsAAAAASUVORK5CYII=", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopFrontLeftMost': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAABGdBTUEAALGPC/xhBQAAAEFJREFUKM9jYECA/3gwBviPD0DlGSBMAopBoLu7G64JQ8OxY8cwcGhoKBjDnIdX8SDXgOFpfBqwBisuDTDFZGkAANxQbr5tWI6PAAAAAElFTkSuQmCC", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopFrontLeftMostHover': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABqSURBVHgBzZGxDYAwDARty+xAw1IMQMcUbEPHAJRMQknDDikgsXiEgkKg4ypL/ydZeqaDzUMJ2INbUW6HOtW3HJLkyoGq0/MDjcNpHm+CW5jKpjBJcuUYoY/8SFh7Z3u8ElAONz8tDK5L7y1iK2uwPWUBAAAAAElFTkSuQmCC", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopFrontRightMost': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAABKSURBVHjaYmBAgP94MAb4jw9A5RkgTAKK/////7+7uxuuCUPDsWPHMHBoaOj/0NBQuPPwKh4ADVDfk6yBgRwNDDTRAAAAAP//AwC7Y2TI0swtZAAAAABJRU5ErkJggg==", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/TabTopFrontRightMostHover': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAB0SURBVHgBvZEhDoAwDEXbZYQrYDAcCYPDcQost+AEGBySkyA5BgLWhhIyMgpmT23pf0nzi3CyOyAAOuRtJdwMZSjPc5GMFiby1l4bWH84L9ND2FaErE5YMlrYx8BPIghUV1+NnwVuiSRqoOhSVcD75+3awgHaZyyoOhZUFgAAAABJRU5ErkJggg==", width: 12, height: 11, metadata: {"nineslice_size":4,"base_size":[12,11]} },



  'textures/ui/numberBGBack': { url: new URL('./assets/play-screen/numberBGBack.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },



  'textures/ui/numberBGFront': { url: new URL('./assets/play-screen/numberBGFront.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },



  'textures/ui/worldsIcon': { url: new URL('./assets/progress/ui/worldsIcon.png', import.meta.url).href, width: 16, height: 17 },



  'textures/ui/Friend1': { url: new URL('./assets/gui-icons/friend1.png', import.meta.url).href, width: 10, height: 10 },



  'textures/ui/Friend2': { url: new URL('./assets/play-screen/Friend2.png', import.meta.url).href, width: 10, height: 10 },



  'textures/ui/servers': { url: new URL('./assets/progress/ui/servers.png', import.meta.url).href, width: 15, height: 15 },



  'textures/ui/XTab': { url: new URL('./assets/play-screen/XTab.png', import.meta.url).href, width: 10, height: 10, metadata: {"nineslice_size":4,"base_size":[10,10]} },



  'textures/ui/dialog_background_hollow_4': { url: new URL('./assets/jigsaw/dialog_background_hollow_4.png', import.meta.url).href, width: 18, height: 18, metadata: {"nineslice_size":8,"base_size":[18,18]} },



  'textures/ui/control': { url: new URL('./assets/external-server/control.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },



  'textures/ui/editIcon': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAQCAYAAAAS7Y8mAAAAWklEQVQ4y7XUwQoAIAgD0P3/Ty8IqpM1dQUevDxMLZCEKdaZuRvdOD5UfMp2Xd8FR0W2WhEddIbHH7CEZmEZdcGowhQ2oQzzkrfh1N4rvSu9VudfEcKpqb9iAFe+bMyRr3cEAAAAAElFTkSuQmCC", width: 22, height: 16 },



  'textures/ui/world_screenshot_focus_border': { url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, metadata: {"nineslice_size":1,"base_size":[5,5]} },



  'textures/ui/close_button_default_light': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABKSURBVDhPnchRCgAgCATR7n9pc6UPwSG2Fh7irIj4htGF0YXRhdGFMWm3v4zQaP0OGBuNesF4aP0OGJN2+8sILzC6MLowujB6Ym0pWqlzZ1JJHgAAAABJRU5ErkJggg==", width: 15, height: 15 },



  'textures/ui/close_button_hover_light': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAIAAAC0tAIdAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE7mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4wLWMwMDEgNzkuYzAyMDRiMiwgMjAyMy8wMi8wOS0wNjoyNjoxNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI0LjMgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyMy0wNC0xMlQxMjoxMzo0Mi0wNDowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjMtMDQtMTJUMTI6MjA6MzctMDQ6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjMtMDQtMTJUMTI6MjA6MzctMDQ6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAxY2RkNDI0LTFlODQtODI0NS1hMTY3LTAzODUzYzc2YWQ2ZiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowMWNkZDQyNC0xZTg0LTgyNDUtYTE2Ny0wMzg1M2M3NmFkNmYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMWNkZDQyNC0xZTg0LTgyNDUtYTE2Ny0wMzg1M2M3NmFkNmYiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjAxY2RkNDI0LTFlODQtODI0NS1hMTY3LTAzODUzYzc2YWQ2ZiIgc3RFdnQ6d2hlbj0iMjAyMy0wNC0xMlQxMjoxMzo0Mi0wNDowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI0LjMgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvnThzMAAABASURBVCiRY5wyZQoD0YCJeKWDWnV2djZWNnbVU6dOhSjKzs6eOnUqYZdANGAqxa4aohTTGdjdDTEVqwbGERGXAB5RGxeQovHWAAAAAElFTkSuQmCC", width: 15, height: 15 },



  'textures/ui/close_button_pressed_light': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAIAAAC0tAIdAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA1SURBVChTY1hHChguqt1c3aAsVDYEYDEboghTKRBgdwlWpUBAmdnIijA1YHcJLjA0Va9bBwCb6L/ZjiOfcgAAAABJRU5ErkJggg==", width: 15, height: 15 },



  'textures/ui/invite_base': { url: new URL('./assets/start-menu/invite_base.png', import.meta.url).href, width: 20, height: 20 },



  'textures/ui/icon_bell': { url: new URL('./assets/start-menu/icon_bell.png', import.meta.url).href, width: 16, height: 16 },



  'textures/ui/HowToPlayDivider': { url: new URL('./assets/document-viewer/HowToPlayDivider.png', import.meta.url).href, width: 3, height: 3, metadata: {"nineslice_size":1,"base_size":[3,3]} },

  'textures/ui/screen_background': { url: new URL('./assets/player-permissions/screen_background.png', import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":0,"base_size":[1,1]} },

  'textures/ui/arrow_left_white': { url: new URL('./assets/gui-icons/arrow-left-white.png', import.meta.url).href, width: 4, height: 7 },

  'textures/ui/arrow_right_white': { url: new URL('./assets/gui-icons/arrow-right-white.png', import.meta.url).href, width: 4, height: 7 },

  'textures/ui/Black': { url: new URL('./assets/emote-wheel/Black.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },

  'textures/ui/white_background': { url: new URL('./assets/play-screen/white_background.png', import.meta.url).href, width: 2, height: 2 },

  'textures/ui/button_borderless_dark': { url: new URL('./assets/player-permissions/button_borderless_dark.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/button_borderless_darkpressednohover': { url: new URL('./assets/player-permissions/button_borderless_darkpressednohover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/button_borderless_darkhover': { url: new URL('./assets/player-permissions/button_borderless_darkhover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/button_borderless_darkpressed': { url: new URL('./assets/player-permissions/button_borderless_darkpressed.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/disabledButtonNoBorder': { url: new URL('./assets/document-viewer/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },

  'textures/ui/default_indent': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAklEQVR4AewaftIAAAAxSURBVGOUlpL5z4AEXG3MGFgYgEBfQ5kBBgxMzRiYGLAAJgYsgMXVxozBwNSMARkAACqjBHzhCw3iAAAAAElFTkSuQmCC", width: 5, height: 5, metadata: {"nineslice_size":1,"base_size":[5,5]} },

  'textures/ui/divider3': { url: new URL('./assets/invite/divider3.png', import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":1,"base_size":[1,1]} },

  'textures/ui/Ping_Yellow_Dark': { url: new URL('./assets/play-screen/Ping_Yellow_Dark.png', import.meta.url).href, width: 7, height: 7 },

  'textures/ui/Ping_Red_Dark': { url: new URL('./assets/play-screen/Ping_Red_Dark.png', import.meta.url).href, width: 7, height: 7 },

  'textures/ui/mainbanners': { url: new URL('./assets/invite/mainbanners.png', import.meta.url).href, width: 3, height: 3, metadata: {"nineslice_size":1,"base_size":[3,3]} },

  'textures/ui/BannersLight': { url: new URL('./assets/play-screen/BannersLight.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/greyBorder': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUUlEQVQ4y2NgQID/JGAM8D80NJRojG4ISZqxGYIioaioiBdjM4RozeiGjBowPA0gKyEZGRlRlpxBBsTHxZKVocD6QAbExcSAMSlZOiUpCawHAGLRdkahhCjSAAAAAElFTkSuQmCC", width: 16, height: 16, metadata: {"nineslice_size":4,"base_size":[16,16]} },

  'textures/ui/infobulb': { url: new URL('./assets/gui-icons/infobulb.png', import.meta.url).href, width: 15, height: 19 },

  'textures/ui/DarkBannerNoBorder': { url: new URL('./assets/play-screen/DarkBannerNoBorder.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },

  'textures/ui/external_link': { url: new URL('./assets/gui-icons/external-link.png', import.meta.url).href, width: 20, height: 20 },

  'textures/ui/world_download': { url: new URL('./assets/play-screen/world_download.png', import.meta.url).href, width: 15, height: 16 },

  'textures/ui/import': { url: new URL('./assets/play-screen/import.png', import.meta.url).href, width: 16, height: 16 },

  'textures/ui/lock': { url: new URL('./assets/gui-icons/lock.png', import.meta.url).href, width: 8, height: 8 },

  'textures/ui/realmsIcon': { url: new URL('./assets/play-screen/realmsIcon.png', import.meta.url).href, width: 11, height: 14 },

  'textures/ui/realms_chevron_play': { url: new URL('./assets/play-screen/realms_chevron_play.png', import.meta.url).href, width: 23, height: 28 },

  'textures/ui/lan_icon': { url: new URL('./assets/gui-icons/lan-icon.png', import.meta.url).href, width: 14, height: 14 },

  'textures/ui/button_borderless_light': { url: new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/button_borderless_lighthover': { url: new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/button_borderless_lightpressed': { url: new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/button_borderless_lightpressednohover': { url: new URL('./assets/document-viewer/button_borderless_lightpressednohover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/focus_border_white': { url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, metadata: {"nineslice_size":1,"base_size":[5,5]} },

  'textures/ui/loading_bar': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAAAAICAYAAABpsU6/AAAABGdBTUEAALGPC/xhBQAAAPpJREFUeNrt20EOgjAQBVCa9P5XRo0rkYUSOmln3iybSPiPoS2ibX/W9lltU6/iwoULFy5cuPBK6dIB/p2TCxcTCxcuXLjwWtqlAy/fiK7nWJdsvly4mF/0C68ELl8bwNbenz++Gf5hfD+Mt4vHCR2/Mf+S4wH5p+6L4w20St8GXP8SLhf6P5XLQvP/kOOb/6Zb/0K9Zsp/dm6jXa58A+gJRX6Vpy9m608u+la/5O9f99fJZi/6PxldA8gvPxfe03tHn6c+5MIruUtfCKb6bx3kt2GW30Jyt0tWVy6xucxPC65bvSD8Xrzx5JdffguSDfN52bjUehAvnf8Ba86fI1AtGCgAAAAASUVORK5CYII=", width: 640, height: 8, metadata: {"base_size":[640,8]} },

  'textures/ui/online': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAABGdBTUEAALGPC/xhBQAAACtJREFUGFdj+P//PwwjA7AYXILhhgUcQwFYEkUCWQFlknjthCtAAkD+fwYAn2+O2CXQeQcAAAAASUVORK5CYII=", width: 7, height: 7 },

  'textures/ui/offline': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAABGdBTUEAALGPC/xhBQAAADNJREFUGFeljrENACAMw/L/mIdDQHIHGBksNfZSJTnYDuAmINhFT4DtPyLHHco8hIBuawFgf4eL+GaLUgAAAABJRU5ErkJggg==", width: 7, height: 7 },

  'textures/ui/trash_light': { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAARCAYAAAAG/yacAAAAVklEQVR42uySwQ7AIAhDKeH/f7lbzA5kK2i8eNm7lELAKIKkvfgkbpBNmAbdkCgKnUc8Cdg6jOYeJZ5OyVrFQ902+JvEN6LYmYxd7Giq5x6CEx1cAgwA4MwTK0DOJIcAAAAASUVORK5CYII=", width: 13, height: 17 },

  'textures/ui/White': { url: new URL('./assets/player-permissions/permissions_player_fade_overlay.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },

  'textures/ui/realmsContent': { url: new URL('./assets/play-screen/realmsContent.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'textures/ui/realmsContentHover': { url: new URL('./assets/play-screen/realmsContentHover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'textures/ui/realmsContentPressed': { url: new URL('./assets/play-screen/realmsContentPressed.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },

  'textures/ui/underline': { url: new URL('./assets/progress/ui/underline.png', import.meta.url).href, width: 1, height: 1 },
  'textures/ui/underline_focus': { url: new URL('./assets/start-menu/underline_focus.png', import.meta.url).href, width: 1, height: 1 },
  'textures/ui/invite_number_background': { url: new URL('./assets/start-menu/invite_number_background.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
} satisfies Readonly<Record<string, ClassicSkinAsset>>);
