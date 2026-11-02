import type {DisconnectButtonState, DisconnectScreenProps, DisconnectVariant} from '../src/disconnect-types';

function button(label: string, visible = true): DisconnectButtonState {return {label, visible, enabled: true};}

/** Plain host example data. These metrics/labels are explicit Web choices,
 * not measured native defaults or a server/store/account service provider. */
export function createDisconnectDemoProps(variant: DisconnectVariant = 'disconnect'): DisconnectScreenProps {
  const common = {
    contentRect: [0, 0, 320, 240] as const,
    layout: {size: [320, 240] as const, scale: 1, hiddenSlots: 'reserve' as const,
      rowAlignment: 'center' as const, uriButtonAnchor: 'center' as const,
      textAlignment: 'center' as const, textVerticalAlignment: 'center' as const,
      font: {family: 'var(--mc-font, monospace)', size: 10, lineHeight: 10}},
    background: {renderer: 'css' as const, sampling: 'point' as const,
      tileOrigin: [0, 0] as const, originRounding: 'floor' as const},
    disabled: false, menuCancelEnabled: true, modal: false,
  };
  if (variant === 'disconnect') return {...common,
    label: '连接已断开报告', title: '连接已断开', body: '与服务器的连接已断开。\n此示例仅记录宿主请求。',
    actions: {variant, ok: button('确定'), openAccount: button('打开账户帮助', false)}};
  if (variant === 'realms-disconnect') return {...common,
    label: 'Realms 连接已断开报告', title: 'Realms 连接已断开', body: '与此 Realm 的连接已断开。\n商店与返回操作由宿主处理。',
    actions: {variant, back: button('返回'), store: button('商店'), storeIgnored: false,
      openAccount: button('打开账户帮助', false)}};
  if (variant === 'realms-warning') return {...common,
    label: 'Realms 连接警告', title: 'Realms 连接提示', body: '继续加入此 Realm 前，请确认以下提示。\n继续与取消操作由宿主处理。',
    actions: {variant, continue: button('继续'), store: button('商店'), storeIgnored: false, cancel: button('取消')}};
  throw new TypeError('Unknown Disconnect demo variant.');
}
