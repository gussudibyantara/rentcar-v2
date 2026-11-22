import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { unitSchema } from '@/lib/fleet-schema';
import { archiveUnit, saveUnit } from '@/lib/fleet-service';
import { apiError } from '@/lib/api-utils';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),revision:z.number().int().min(0),input:unitSchema}),z.object({action:z.enum(['archive','restore']),revision:z.number().int().min(0)})]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params;const body=schema.parse(await request.json());const unit=await mutate(data=>body.action==='update'?saveUnit(data,body.input,id,body.revision):archiveUnit(data,id,body.revision,body.action==='restore'));return Response.json({unit});}catch(error){return apiError(error);}}
