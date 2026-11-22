import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { originAllowed } from '@/lib/request';
import { uploadDirectory, mutate } from '@/lib/store';
import { apiError, fail } from '@/lib/api-utils';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!originAllowed(request))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403});
 try{if(Number(request.headers.get('content-length')||0)>9*1024*1024)fail('Ukuran unggahan maksimal 8 MB per file.',413);const form=await request.formData(),file=form.get('file');if(!(file instanceof File)||file.size===0)fail('Pilih file untuk diunggah.',400);if(file.size>8*1024*1024)fail('Ukuran file maksimal 8 MB.',413);
 const buffer=Buffer.from(await file.arrayBuffer());const mime=file.type;
 const valid=mime==='image/jpeg'&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255||mime==='image/png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||mime==='image/webp'&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP'||mime==='application/pdf'&&buffer.subarray(0,5).toString()==='%PDF-';
 if(!valid)fail('Gunakan file JPG, PNG, WebP atau PDF yang valid.',400);
 const asset={id:randomUUID(),name:file.name.slice(0,180),mime,size:file.size,createdAt:new Date().toISOString()};
 await mutate(async data=>{const folder=await uploadDirectory();await mkdir(folder,{recursive:true});await writeFile(path.join(folder,asset.id),buffer,{flag:'wx'});data.assets ||= [];data.assets.push(asset);});
 return Response.json({asset},{status:201});
 }catch(error){return apiError(error);}
}
