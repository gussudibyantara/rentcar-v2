import {invoiceFeaturesEnabled,invoiceLockedResponse} from '@/lib/invoice-access';
import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { invoiceSchema,invoicePaymentSchema,saveInvoice,issueInvoice,voidInvoice,addInvoicePayment,reverseInvoicePayment } from '@/lib/invoice-service';
export const runtime='nodejs';
const rev=z.number().int().min(0),schema=z.discriminatedUnion('action',[z.object({action:z.literal('update'),revision:rev,input:invoiceSchema}),z.object({action:z.literal('issue'),revision:rev}),z.object({action:z.literal('void'),revision:rev,reason:z.string().trim().min(1).max(1000)}),z.object({action:z.literal('payment'),revision:rev,input:invoicePaymentSchema}),z.object({action:z.literal('reverse'),revision:rev,paymentId:z.string().uuid(),reason:z.string().trim().min(1).max(1000)})]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!invoiceFeaturesEnabled())return invoiceLockedResponse();if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params,b=schema.parse(await request.json());const invoice=await mutate(d=>b.action==='update'?saveInvoice(d,b.input,id,b.revision):b.action==='issue'?issueInvoice(d,id,b.revision):b.action==='void'?voidInvoice(d,id,b.revision,b.reason):b.action==='payment'?addInvoicePayment(d,id,b.revision,b.input):reverseInvoicePayment(d,id,b.revision,b.paymentId,b.reason));return Response.json({invoice});}catch(e){return apiError(e);}}
