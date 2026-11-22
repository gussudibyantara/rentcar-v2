import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { maintenanceSchema } from '@/lib/fleet-schema';
import { saveMaintenance, transitionMaintenance } from '@/lib/fleet-service';
import { apiError } from '@/lib/api-utils';
export const runtime='nodejs';
const amount=z.number().int().min(0).max(100000000000);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('update'),revision:z.number().int().min(0),input:maintenanceSchema}),
 z.object({action:z.literal('start'),revision:z.number().int().min(0)}),
 z.object({action:z.literal('cancel'),revision:z.number().int().min(0),reason:z.string().trim().min(1).max(500)}),
 z.object({action:z.literal('complete'),revision:z.number().int().min(0),actualCost:amount,mileage:amount.optional(),operatingHours:amount.optional(),returnCondition:z.enum(['ready','maintenance']),resolveDamage:z.boolean(),nextDueDate:z.union([z.literal(''),z.iso.date()]) ,nextDueMileage:amount.optional(),nextDueHours:amount.optional(),reason:z.string().max(1000)}),
]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params;const body=schema.parse(await request.json());const maintenance=await mutate(data=>body.action==='update'?saveMaintenance(data,body.input,id,body.revision):transitionMaintenance(data,id,body.revision,body.action,body.action==='start'?{}:body));return Response.json({maintenance});}catch(error){return apiError(error);}}
