import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { inspectionScheduleSchema } from '@/lib/fleet-schema';
import { scheduleInspection } from '@/lib/inspection-service';
import { apiError } from '@/lib/api-utils';
export const runtime='nodejs';
export async function POST(request:Request){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const body=z.object({requestId:z.string().uuid(),input:inspectionScheduleSchema}).parse(await request.json());const inspection=await mutate(data=>scheduleInspection(data,body.input,body.requestId));return Response.json({inspection},{status:201});}catch(error){return apiError(error);}}
