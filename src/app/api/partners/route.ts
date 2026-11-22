import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { partnerSchema,savePartner } from '@/lib/partner-service';
export const runtime='nodejs';
export async function POST(r:Request){if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const b=z.object({requestId:z.string().uuid(),input:partnerSchema}).parse(await r.json());const partner=await mutate(d=>savePartner(d,b.input,undefined,0,b.requestId));return Response.json({partner},{status:201});}catch(e){return apiError(e);}}
