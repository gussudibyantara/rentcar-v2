import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { apiError } from '@/lib/api-utils';
import { customerSchema, saveCustomer } from '@/lib/office-service';
export const runtime='nodejs';
export async function POST(request:Request){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const body=z.object({requestId:z.string().uuid(),input:customerSchema}).parse(await request.json());const record=await mutate(data=>saveCustomer(data,body.input,undefined,0,body.requestId));return Response.json({record},{status:201});}catch(e){return apiError(e);}}
