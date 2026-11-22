import {invoiceFeaturesEnabled,invoiceLockedResponse} from '@/lib/invoice-access';
import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { invoiceSchema,saveInvoice } from '@/lib/invoice-service';
export const runtime='nodejs';
export async function POST(request:Request){if(!invoiceFeaturesEnabled())return invoiceLockedResponse();if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const b=z.object({requestId:z.string().uuid(),input:invoiceSchema}).parse(await request.json());const invoice=await mutate(d=>saveInvoice(d,b.input,undefined,0,b.requestId));return Response.json({invoice},{status:201});}catch(e){return apiError(e);}}
