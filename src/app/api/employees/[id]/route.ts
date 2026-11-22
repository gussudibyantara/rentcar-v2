import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { employeeSchema,saveEmployee,employeeStatus } from '@/lib/employee-service';
import { apiError } from '@/lib/api-utils';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),revision:z.number().int().min(0),input:employeeSchema}),z.object({action:z.enum(['archive','restore']),revision:z.number().int().min(0)})]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params,body=schema.parse(await request.json());const employee=await mutate(data=>body.action==='update'?saveEmployee(data,body.input,id,body.revision):employeeStatus(data,id,body.revision,body.action==='restore'));return Response.json({employee});}catch(error){return apiError(error);}}
