import {nativeAuthEnabled,localPreviewAllowed} from './config';
import {fail} from '../api-utils';
import type {AccountIdentity} from '../account-types';
export async function currentAccountIdentity():Promise<AccountIdentity>{
 if(nativeAuthEnabled()){const user=await (await import('./native')).currentNativeUser();if(!user)fail('Silakan masuk terlebih dahulu.',401);return {id:user.id,name:user.name,email:user.email,provider:'native'};}
 if(localPreviewAllowed())return {id:'local-owner',name:'Azis Maliek',email:'',provider:'local'};
 fail('Autentikasi belum tersedia.',503);
}
