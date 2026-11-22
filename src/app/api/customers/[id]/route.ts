import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { customerSchema, saveCustomer, customerAction } from '@/lib/office-service';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),revision:z.number().int().min(0),input:customerSchema}),z.object({action:z.enum(['block','unblock','archive','restore']),revision:z.number().int().min(0),reason:z.string().trim().max(1000).default(''),paidOn:z.string().default('')})]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params;const body=schema.parse(await request.json());const record=await mutate(data=>body.action==='update'?saveCustomer(data,body.input,id,body.revision):customerAction(data,id,body.revision,body.action,body.reason));return Response.json({record});}catch(e){return apiError(e);}}
