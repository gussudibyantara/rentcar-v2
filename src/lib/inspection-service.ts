import { resolveEmployee } from './employee-service';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { DashboardData, Inspection } from './types';
import { inspectionScheduleSchema, inspectionWorkSchema } from './fleet-schema';
import { allInspections, allMaintenance, unresolvedRepair, checklistFor, photoViewsFor } from './fleet-shared';
import { assertAssets, audit, fail, revision, sameRequest } from './api-utils';
import {inspectionCategory,inspectionEquipment,equipmentShortages} from './vehicle-config';
import { available } from './rules';
export function scheduleInspection(data:DashboardData,input:z.infer<typeof inspectionScheduleSchema>,requestId:string){
 data.inspections ||= [];const old=data.inspections.find(i=>i.requestId===requestId);input={...input,inspector:resolveEmployee(data,input.inspectorEmployeeId,input.inspector,'inspection',{id:old?.inspectorEmployeeId,name:old?.inspector})};if(old){sameRequest(old,input,['scheduledAt']);return old;}
 const b=data.bookings.find(b=>b.id===input.bookingId);if(!b)fail('Booking tidak ditemukan.',404);
 if(input.type==='checkout'&&b.status!=='confirmed'||input.type==='checkin'&&b.status!=='running')fail('Inspeksi keluar memerlukan booking Dikonfirmasi; inspeksi kembali memerlukan rental Berjalan.');
 if(data.inspections.some(i=>i.bookingId===b.id&&i.type===input.type&&i.status!=='completed'&&i.status!=='cancelled'))fail('Sudah ada inspeksi aktif untuk booking dan jenis ini.');
 const unit=data.units.find(u=>u.id===b.unitId);if(!unit)fail('Kendaraan tidak ditemukan.',404);
 const i:Inspection={...input,id:`IN-${randomUUID().slice(0,8).toUpperCase()}`,unitId:b.unitId,vehicleCategory:unit.category,status:'scheduled',scheduledAt:new Date(input.scheduledAt).toISOString(),checklist:Object.fromEntries(checklistFor(unit.category).map(c=>[c.id,'unchecked'])),photos:[],damages:[],customerName:'',accepted:false,baselineMissingReason:'',createdAt:new Date().toISOString(),revision:0,requestId};
 data.inspections.push(i);audit(data,'inspection','Inspeksi dijadwalkan',`${i.id} · ${b.id}`);return i;
}
export function startInspection(data:DashboardData,id:string,expected:number){const i=allInspections(data).find(i=>i.id===id);if(!i)fail('Inspeksi tidak ditemukan.',404);revision(i.revision,expected);if(i.status!=='scheduled')fail('Inspeksi bukan berstatus Terjadwal.');const b=data.bookings.find(b=>b.id===i.bookingId)!;if(b.unitId!==i.unitId)fail('Kendaraan booking sudah berubah. Batalkan inspeksi ini dan jadwalkan ulang.');if(i.type==='checkout'&&b.status!=='confirmed'||i.type==='checkin'&&b.status!=='running')fail('Status booking sudah berubah. Periksa booking terlebih dahulu.');const unit=data.units.find(u=>u.id===i.unitId)!;i.vehicleCategory ||= unit.category;if(i.vehicleCategory==='Motor')i.equipment=inspectionEquipment({...i,equipment:undefined},unit,previousCheckout(data,i));i.status='in_progress';i.startedAt=new Date().toISOString();i.revision++;audit(data,'inspection','Inspeksi dimulai',`${i.id} · ${i.bookingId}`);return i;}
export function previousCheckout(data:DashboardData,i:Inspection){return allInspections(data).filter(p=>p.id!==i.id&&p.bookingId===i.bookingId&&p.unitId===i.unitId&&p.type==='checkout'&&p.status==='completed').sort((a,b)=>+new Date(b.completedAt!)-+new Date(a.completedAt!))[0];}
export function saveInspection(data:DashboardData,id:string,expected:number,work:z.infer<typeof inspectionWorkSchema>,complete:boolean){
 const original=allInspections(data).find(i=>i.id===id);if(!original)fail('Inspeksi tidak ditemukan.',404);revision(original.revision,expected);if(original.status!=='in_progress')fail('Mulai inspeksi sebelum mengisi hasilnya.');
 const unit=data.units.find(u=>u.id===original.unitId)!,booking=data.bookings.find(b=>b.id===original.bookingId)!;
 if(booking.unitId!==original.unitId)fail('Kendaraan booking sudah berubah.');
 const category=inspectionCategory(original,unit),items=checklistFor(category),views=photoViewsFor(category),expectedEquipment=inspectionEquipment(original,unit,previousCheckout(data,original));
 let equipment=expectedEquipment;
 if(category!=='Motor'&&work.equipment?.length)fail('Perlengkapan motor tidak berlaku untuk kategori ini.',400);
 if(work.equipment){
  if(work.equipment.length!==expectedEquipment.length||new Set(work.equipment.map(e=>e.id)).size!==work.equipment.length||work.equipment.some(e=>!expectedEquipment.some(x=>x.id===e.id)))fail('Daftar perlengkapan berubah atau tidak valid. Muat ulang inspeksi.',400);
  equipment=expectedEquipment.map(item=>({...item,quantity:work.equipment!.find(e=>e.id===item.id)!.quantity}));
  if(original.type==='checkout'&&equipment.some(item=>item.quantity>item.expected))fail('Jumlah perlengkapan yang diserahkan melebihi standar tersedia.',400);
 }
 if(work.damages.some(d=>d.side&&!views.some(v=>v.id===d.side)))fail('Sisi temuan tidak sesuai kategori kendaraan.',400);
 if(category==='Motor'&&work.damages.some(d=>!items.some(c=>c.id===d.area)))fail('Area temuan tidak sesuai checklist motor.',400);

 assertAssets(data,work.photos.map(p=>p.assetId),true);
 if(new Set(work.photos.map(p=>p.view)).size!==work.photos.length)fail('Sudut foto tidak boleh duplikat.',400);
 if(work.photos.some(p=>!views.some(v=>v.id===p.view)))fail('Sudut foto tidak valid.',400);
 if(new Set(work.damages.map(d=>d.id)).size!==work.damages.length)fail('ID temuan kerusakan duplikat.',400);
 for(const damage of work.damages){assertAssets(data,damage.photos||[],true);if(new Set(damage.photos||[]).size!==(damage.photos||[]).length)fail('Foto temuan tidak boleh duplikat.',400);}
 const updated:Inspection={...original,...work,equipment:category==='Motor'?equipment:original.equipment,damages:work.damages.map(d=>({...d,resolved:false})),revision:original.revision+1};
 if(complete){
  if(category==='Motor'&&expectedEquipment.length&&!work.equipment)fail('Catat perlengkapan yang diserahkan atau dikembalikan.',400);
  if(equipmentShortages(updated).length&&!work.notes.trim())fail('Isi catatan untuk perlengkapan yang belum kembali.',400);
  if(items.some(c=>!work.checklist[c.id]||work.checklist[c.id]==='unchecked'))fail('Selesaikan seluruh checklist sebelum menutup inspeksi.',400);
  if(work.mileage===undefined||work.fuel===undefined)fail('Isi kilometer dan level BBM.',400);
  const baseline=previousCheckout(data,original);
  if(work.mileage<Math.max(unit.mileage||0,baseline?.mileage||0))fail('Kilometer tidak boleh lebih kecil dari catatan terakhir.');
  if(!work.accepted||!work.customerName.trim())fail('Isi nama pelanggan dan persetujuan kondisi kendaraan.',400);
  if(original.type==='checkin'&&!baseline&&!work.baselineMissingReason.trim())fail('Pemeriksaan saat kendaraan keluar belum tercatat (baseline). Isi alasannya sebelum menyelesaikan inspeksi kembali.',400);
  if(items.some(c=>work.checklist[c.id]==='damaged'&&!work.damages.some(d=>d.area===c.id)))fail('Jelaskan setiap kerusakan checklist pada area yang sesuai di bagian Temuan.',400);
  if(original.type==='checkout'){
   if(booking.status!=='confirmed')fail('Booking bukan berstatus Dikonfirmasi.');
   if(+new Date(booking.start)>Date.now()||+new Date(booking.end)<=Date.now())fail('Serah terima keluar harus di dalam periode booking. Ubah jadwal jika diperlukan.');
   const needsRepair=updated.damages.some(d=>d.requiresRepair||d.severity==='major');
   if(!needsRepair&&!available(data,unit,new Date().toISOString(),booking.end,booking.id))fail('Kendaraan belum siap atau sedang diblokir maintenance.');
   if(needsRepair){unit.condition='maintenance';updated.damages=updated.damages.map(d=>({...d,requiresRepair:d.requiresRepair||d.severity==='major'}));}
   else{booking.status='running';booking.actualStart=new Date().toISOString();booking.revision=(booking.revision||0)+1;}
  }else{
   if(booking.status!=='running')fail('Rental bukan berstatus Berjalan.');
   booking.status='returned';booking.actualEnd=new Date().toISOString();booking.revision=(booking.revision||0)+1;
   unit.condition=updated.damages.some(d=>d.requiresRepair||d.severity==='major')||unresolvedRepair(data,unit.id)||allMaintenance(data).some(m=>m.unitId===unit.id&&m.status==='in_progress')?'maintenance':'ready';updated.damages=updated.damages.map(d=>({...d,requiresRepair:d.requiresRepair||d.severity==='major'}));
  }
  unit.mileage=work.mileage;unit.revision=(unit.revision||0)+1;
  updated.status='completed';updated.completedAt=new Date().toISOString();
 }
 data.inspections![data.inspections!.indexOf(original)]=updated;
 audit(data,'inspection',complete?'Inspeksi selesai':'Draft inspeksi disimpan',`${updated.id} · ${booking.id}`);return updated;
}
