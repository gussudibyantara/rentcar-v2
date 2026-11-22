import {invoiceFeaturesEnabled,invoiceLockedResponse} from '@/lib/invoice-access';
import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { settlementSchema,createSettlement } from '@/lib/partner-service';
export const runtime='nodejs';
export async function POST(r:Request){if(!invoiceFeaturesEnabled())return invoiceLockedResponse();if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const b=z.object({requestId:z.string().uuid(),input:settlementSchema}).parse(await r.json());const settlement=await mutate(d=>createSettlement(d,b.input,b.requestId));return Response.json({settlement},{status:201});}catch(e){return apiError(e);}}
