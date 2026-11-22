import {localPreviewAllowed,nativeAuthEnabled} from './config';
import {fail} from '../api-utils';
/** Guard the storage boundary even when a caller bypasses the HTTP proxy. */
export async function assertWorkspaceAccess(){
 if(nativeAuthEnabled()){const {currentNativeUser}=await import('./native');if(!await currentNativeUser())fail('Silakan masuk terlebih dahulu.',401);return;}
 if(!localPreviewAllowed())fail('Autentikasi PostgreSQL belum tersedia.',503);
}

/** Resolve the tenant only from the server-verified account, never URL/body/header. */
export async function authorizedWorkspaceId(){const {currentNativeUser}=await import('./native');const user=await currentNativeUser();if(!user?.workspaceId)fail('Silakan masuk terlebih dahulu.',401);return user.workspaceId;}
