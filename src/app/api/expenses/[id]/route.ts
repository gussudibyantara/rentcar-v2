import { employeeIdSchema } from '@/lib/employee-service';
import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { expenseSchema, saveExpense, expenseAction } from '@/lib/office-service';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),revision:z.number().int().min(0),input:expenseSchema}),z.object({action:z.enum(['pay','void']),handledByEmployeeId:employeeIdSchema,revision:z.number().int().min(0),reason:z.string().trim().max(1000).default(''),paidOn:z.string().default('')})]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params;const body=schema.parse(await request.json());const record=await mutate(data=>body.action==='update'?saveExpense(data,body.input,id,body.revision):expenseAction(data,id,body.revision,body.action,body.reason,body.paidOn,body.handledByEmployeeId));return Response.json({record});}catch(e){return apiError(e);}}
