/** Notify other tabs after successful local workspace writes; never transmit business data. */
export const WORKSPACE_CHANGED='travelos:workspace-changed';
export const WORKSPACE_CHANGE_KEY='travelos:workspace-version';
export function notifyWorkspaceChanged(){
 if(typeof window==='undefined')return;
 window.dispatchEvent(new Event(WORKSPACE_CHANGED));
 try{window.localStorage.setItem(WORKSPACE_CHANGE_KEY,`${Date.now()}:${Math.random()}`);}catch{/* Focus refresh and periodic synchronization remain available. */}
}
