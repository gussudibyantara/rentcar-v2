import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DashboardData, Notice } from './types';
export class FleetError extends Error {constructor(message:string,public status=409){super(message);}}
export function fail(message:string,status=409):never{throw new FleetError(message,status);}
export function apiError(error:unknown){if(error instanceof FleetError)return Response.json({error:error.message},{status:error.status});if(error instanceof z.ZodError)return Response.json({error:error.issues[0]?.message||'Periksa data formulir.'},{status:400});if(error instanceof SyntaxError)return Response.json({error:'Format permintaan tidak valid.'},{status:400});return Response.json({error:'Data gagal disimpan. Coba lagi.'},{status:500});}
export function revision(actual:number|undefined,expected:number){if((actual||0)!==expected)fail('Data sudah diperbarui. Muat ulang sebelum menyimpan perubahan.');}
export function audit(data:DashboardData,kind:Notice['kind'],title:string,description:string){const at=new Date().toISOString();data.activities.unshift({id:randomUUID(),kind,title,description,at});data.notifications.unshift({id:randomUUID(),kind,title,description,read:false});}
export function assertAssets(data:DashboardData,ids:string[],imageOnly=false){for(const id of ids.filter(Boolean)){const asset=data.assets?.find(a=>a.id===id);if(!asset||imageOnly&&!asset.mime.startsWith('image/'))fail('Lampiran belum diunggah atau tidak valid.',400);}}
export function sameRequest(existing:object,input:object,dateFields:string[]=[]){const record=existing as Record<string,unknown>;for(const [key,value]of Object.entries(input)){const expected=dateFields.includes(key)&&typeof value==='string'?new Date(value).toISOString():value;if(JSON.stringify(record[key])!==JSON.stringify(expected))fail('Permintaan ini sudah tersimpan dengan data berbeda. Tutup formulir dan muat ulang.');}}
