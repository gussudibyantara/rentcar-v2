import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { endAgreement } from '@/lib/partner-service';
export const runtime='nodejs';
export async function PATCH(r:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(r))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params,b=z.object({end:z.iso.date(),expectedEnd:z.iso.date(),reason:z.string().trim().min(1).max(1000)}).parse(await r.json());const agreement=await mutate(d=>endAgreement(d,id,b.end,b.expectedEnd,b.reason));return Response.json({agreement});}catch(e){return apiError(e);}}
