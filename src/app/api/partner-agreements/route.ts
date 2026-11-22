import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { agreementSchema,saveAgreement } from '@/lib/partner-service';
export const runtime='nodejs';
export async function POST(r:Request){if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const b=z.object({requestId:z.string().uuid(),input:agreementSchema}).parse(await r.json());const agreement=await mutate(d=>saveAgreement(d,b.input,b.requestId));return Response.json({agreement},{status:201});}catch(e){return apiError(e);}}
