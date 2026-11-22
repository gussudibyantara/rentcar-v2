import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { unitSchema } from '@/lib/fleet-schema';
import { saveUnit } from '@/lib/fleet-service';
import { apiError } from '@/lib/api-utils';
export const runtime='nodejs';
export async function POST(request:Request){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const body=z.object({requestId:z.string().uuid(),input:unitSchema}).parse(await request.json());const unit=await mutate(data=>saveUnit(data,body.input,undefined,0,body.requestId));return Response.json({unit},{status:201});}catch(error){return apiError(error);}}
