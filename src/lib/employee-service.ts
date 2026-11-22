import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DashboardData,Employee,EmployeeRole } from './types';
import { fail,revision,sameRequest,audit } from './api-utils';
export const employeeIdSchema=z.union([z.literal(''),z.string().uuid()]).optional();
export const employeeSchema=z.object({name:z.string().trim().min(2,'Nama karyawan minimal 2 karakter.').max(100),phone:z.string().trim().max(30).refine(v=>!v||/^\+?[\d ()-]{7,30}$/.test(v),'Nomor telepon tidak valid.'),email:z.union([z.literal(''),z.email().max(254)]),position:z.string().trim().max(100),branch:z.string().trim().max(100).default(''),roles:z.array(z.enum(['booking','delivery','inspection','maintenance','payment'])).min(1,'Pilih minimal satu jenis tugas.').max(5).refine(a=>new Set(a).size===a.length,'Jenis tugas duplikat.'),notes:z.string().trim().max(2000)});
export function saveEmployee(data:DashboardData,input:z.infer<typeof employeeSchema>,id?:string,expected=0,requestId?:string){
 data.employees||=[];const retry=requestId?data.employees.find(e=>e.requestId===requestId):undefined;if(retry){sameRequest(retry,input);return retry;}
 const old=id?data.employees.find(e=>e.id===id):undefined;if(id&&!old)fail('Karyawan tidak ditemukan.',404);if(old)revision(old.revision,expected);
 const e:Employee={...old,...input,id:id||randomUUID(),revision:(old?.revision||0)+1,createdAt:old?.createdAt||new Date().toISOString(),requestId:old?.requestId||requestId};
 if(old)Object.assign(old,e);else data.employees.push(e);
 audit(data,'employee',old?'Karyawan diperbarui':'Karyawan ditambahkan',e.name);return old||e;
}
export function employeeStatus(data:DashboardData,id:string,expected:number,restore:boolean){const e=data.employees?.find(e=>e.id===id);if(!e)fail('Karyawan tidak ditemukan.',404);revision(e.revision,expected);if(restore){delete e.archivedAt;}else {e.archivedAt=new Date().toISOString();}e.revision++;audit(data,'employee',restore?'Karyawan diaktifkan':'Karyawan dinonaktifkan',e.name);return e;}
/** Retain names on existing records. Only new/reassigned staff must be active and eligible. */
export function resolveEmployee(data:DashboardData,id:string|undefined,name:string|undefined,role:EmployeeRole,previous?:{id?:string;name?:string},required=true){
 if(id&&id===previous?.id)return previous.name||data.employees?.find(e=>e.id===id)?.name||'';
 if(!id){
  if(!previous?.id&&previous?.name&&name===previous.name)return previous.name;
  if(!required&&!name)return '';
  // Older imported service data can retain its free-text snapshot until assigned explicitly.
  if(data.employees===undefined)return name||'';
  fail(`Pilih karyawan aktif untuk ${role==='payment'?'pembayaran':role==='inspection'?'inspeksi':role==='maintenance'?'maintenance':role==='delivery'?'pengantaran / pengembalian':'PIC booking'}.`,400);
 }
 const employee=data.employees?.find(e=>e.id===id&&!e.archivedAt&&e.roles.includes(role));if(!employee)fail('Karyawan tidak aktif, tidak ditemukan, atau tidak memiliki jenis tugas yang sesuai.',400);return employee.name;
}
export function bookingStaff<T extends {pic:string;picEmployeeId?:string;deliveryEmployeeId?:string;deliveryBy?:string;returnEmployeeId?:string;returnBy?:string}>(data:DashboardData,input:T,previous?:{pic?:string;picEmployeeId?:string;deliveryEmployeeId?:string;deliveryBy?:string;returnEmployeeId?:string;returnBy?:string}){
 const result={...input,pic:resolveEmployee(data,input.picEmployeeId,input.pic,'booking',{id:previous?.picEmployeeId,name:previous?.pic})};
 if(input.deliveryEmployeeId!==undefined||input.deliveryBy!==undefined)result.deliveryBy=resolveEmployee(data,input.deliveryEmployeeId,input.deliveryBy,'delivery',{id:previous?.deliveryEmployeeId,name:previous?.deliveryBy},false);
 if(input.returnEmployeeId!==undefined||input.returnBy!==undefined)result.returnBy=resolveEmployee(data,input.returnEmployeeId,input.returnBy,'delivery',{id:previous?.returnEmployeeId,name:previous?.returnBy},false);
 return result;
}
