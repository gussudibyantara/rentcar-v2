import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { partnerSchema,savePartner,archivePartner } from '@/lib/partner-service';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),revision:z.number().int().min(0),input:partnerSchema}),z.object({action:z.enum(['archive','restore']),revision:z.number().int().min(0)})]);
export async function PATCH(r:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params,b=schema.parse(await r.json());const partner=await mutate(d=>b.action==='update'?savePartner(d,b.input,id,b.revision):archivePartner(d,id,b.revision,b.action==='restore'));return Response.json({partner});}catch(e){return apiError(e);}}
