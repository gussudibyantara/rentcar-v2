import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { maintenanceSchema } from '@/lib/fleet-schema';
import { saveMaintenance } from '@/lib/fleet-service';
import { apiError } from '@/lib/api-utils';
export const runtime='nodejs';
export async function POST(request:Request){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const body=z.object({requestId:z.string().uuid(),input:maintenanceSchema}).parse(await request.json());const maintenance=await mutate(data=>saveMaintenance(data,body.input,undefined,0,body.requestId));return Response.json({maintenance},{status:201});}catch(error){return apiError(error);}}
