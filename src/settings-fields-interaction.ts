/** Private DOM ownership guard shared by semantic requests and local source disclosure. */
export function settingsFieldAvailable(node:HTMLElement|null):boolean {
  if(!node?.isConnected||node.closest('[hidden],[inert]')||!node.getClientRects().length||node.ownerDocument.defaultView?.getComputedStyle(node).visibility==='hidden')return false;
  try{const doc=node.ownerDocument;return !doc.querySelector('dialog:modal')||!!doc.activeElement?.closest('dialog:modal')?.contains(node);}catch{return true;}
}
export function settingsFieldCanInteract(control:HTMLElement|null,root:HTMLElement|null,state:{readonly current:boolean;readonly disabled:boolean;readonly readOnly:boolean;readonly hidden:boolean;readonly inert:boolean}):boolean {
  return state.current&&!state.disabled&&!state.readOnly&&!state.hidden&&!state.inert&&!!control&&!!root&&control.ownerDocument===root.ownerDocument&&!control.matches(':disabled')&&settingsFieldAvailable(control)&&settingsFieldAvailable(root);
}
