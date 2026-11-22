import {z} from 'zod';
import {readDashboard,mutate} from '@/lib/store';
import {currentAccountIdentity} from '@/lib/auth/identity';
import {accountView,profileSchema,settingsSchema,saveProfile,saveSettings,changeBilling} from '@/lib/account-service';
import {apiError} from '@/lib/api-utils';
import {originAllowed} from '@/lib/request';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{const identity=await currentAccountIdentity();return Response.json(accountView(await readDashboard(),identity),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return apiError(error);}}
const schema=z.discriminatedUnion('section',[
 z.object({section:z.literal('profile'),revision:z.number().int().nonnegative(),input:profileSchema}).strict(),
 z.object({section:z.literal('settings'),revision:z.number().int().nonnegative(),input:settingsSchema}).strict(),
 z.object({section:z.literal('billing'),input:z.unknown()}).strict(),
]);
export async function PATCH(request:Request){
 if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});
 try{const identity=await currentAccountIdentity();const input=schema.parse(await request.json());const view=await mutate(data=>{if(input.section==='profile')saveProfile(data,identity,input.input,input.revision);else if(input.section==='settings')saveSettings(data,input.input,input.revision);else changeBilling(data,input.input);return accountView(data,identity);});return Response.json(view,{headers:{'Cache-Control':'private, no-store'}});}catch(error){return apiError(error);}
}
