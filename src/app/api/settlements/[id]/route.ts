import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { partnerPaymentSchema,paySettlement,settlementAction,offsetSettlementCredit } from '@/lib/partner-service';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('credit'),revision:z.number().int().min(0),sourceId:z.string().uuid(),sourceRevision:z.number().int().min(0),amount:z.number().int().positive().max(100000000000)}),z.object({action:z.literal('payment'),revision:z.number().int().min(0),input:partnerPaymentSchema}),z.object({action:z.enum(['void','reverse']),revision:z.number().int().min(0),reason:z.string().trim().min(1).max(1000),paymentId:z.string().default('')})]);
export async function PATCH(r:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params,b=schema.parse(await r.json());const settlement=await mutate(d=>b.action==='credit'?offsetSettlementCredit(d,id,b.revision,b.sourceId,b.sourceRevision,b.amount):b.action==='payment'?paySettlement(d,id,b.revision,b.input):settlementAction(d,id,b.revision,b.action,b.reason,b.paymentId));return Response.json({settlement});}catch(e){return apiError(e);}}
