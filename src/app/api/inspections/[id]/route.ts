import { z } from 'zod';
import { originAllowed } from '@/lib/request';
import { mutate } from '@/lib/store';
import { inspectionWorkSchema } from '@/lib/fleet-schema';
import { saveInspection, startInspection } from '@/lib/inspection-service';
import { apiError, audit, fail, revision } from '@/lib/api-utils';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.enum(['save','complete']),revision:z.number().int().min(0),input:inspectionWorkSchema}),z.object({action:z.literal('start'),revision:z.number().int().min(0)}),z.object({action:z.literal('cancel'),revision:z.number().int().min(0),reason:z.string().trim().min(1).max(500)})]);
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});try{const {id}=await ctx.params;const body=schema.parse(await request.json());const inspection=await mutate(data=>{if(body.action==='start')return startInspection(data,id,body.revision);if(body.action==='cancel'){const i=data.inspections?.find(i=>i.id===id);if(!i)fail('Inspeksi tidak ditemukan.',404);revision(i.revision,body.revision);if(i.status==='completed'||i.status==='cancelled')fail('Inspeksi sudah ditutup.');i.status='cancelled';i.notes+=`\nPembatalan: ${body.reason}`;i.revision++;audit(data,'inspection','Inspeksi dibatalkan',i.id);return i;}return saveInspection(data,id,body.revision,body.input,body.action==='complete');});return Response.json({inspection});}catch(error){return apiError(error);}}
