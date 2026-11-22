import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { reconcileBooking } from '@/lib/partner-service';
export const runtime='nodejs';
export async function POST(r:Request){if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const b=z.object({bookingId:z.string().min(1),agreementId:z.union([z.literal('owned'),z.string().uuid()]),revision:z.number().int().min(0),reason:z.string().trim().min(1).max(1000)}).parse(await r.json());const booking=await mutate(d=>reconcileBooking(d,b.bookingId,b.agreementId,b.revision,b.reason));return Response.json({booking});}catch(e){return apiError(e);}}
