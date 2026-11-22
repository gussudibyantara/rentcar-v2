import { resolveEmployee } from './employee-service';
import { todayISO } from './format';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { DashboardData, Maintenance, Unit } from './types';
import { maintenanceSchema, unitSchema } from './fleet-schema';
import { fail, revision, assertAssets, audit, sameRequest } from './api-utils';
import { isReserved, overlaps } from './rules';
import { allInspections, allMaintenance, maintenanceBlocks, unresolvedRepair } from './fleet-shared';
export type UnitInput = z.infer<typeof unitSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
const plateKey=(p:string)=>p.toUpperCase().replace(/\s+/g,'');
export function saveUnit(data:DashboardData,input:UnitInput,id?:string,expected=0,requestId?:string){
 const previous=id?data.units.find(u=>u.id===id):undefined;
 if(id&&!previous)fail('Kendaraan tidak ditemukan.',404);
 if(previous)revision(previous.revision,expected);
 if(input.category==='Motor'&&(!input.motorcycleType||!input.transmission))fail('Pilih jenis motor dan transmisi.',400);
 if(input.equipment&&new Set(input.equipment.extras.map(e=>e.id)).size!==input.equipment.extras.length)fail('ID perlengkapan tidak boleh duplikat.',400);
 if(previous&&previous.category!==input.category&&(data.bookings.some(b=>b.unitId===id)||allInspections(data).some(i=>i.unitId===id)||allMaintenance(data).some(m=>m.unitId===id)))fail('Kategori tidak dapat diganti setelah kendaraan memiliki riwayat. Buat unit baru untuk kategori berbeda.');

 if(input.ownership==='partner'){
  const partner=data.partners?.find(p=>p.id===input.partnerId);
  if(!partner||(partner.archivedAt&&previous?.partnerId!==partner.id))fail('Pilih rekanan aktif yang terdaftar.',400);
  input={...input,owner:partner.name};
 }else input={...input,partnerId:''};
 const ownerChanged=previous&&(input.ownership!==previous.ownership||(previous.partnerId?input.partnerId!==previous.partnerId:input.owner!==previous.owner));
 if(ownerChanged&&data.partnerAgreements?.some(a=>a.unitId===id&&a.end>=todayISO()))fail('Kepemilikan terhubung ke skema rekanan. Akhiri skema aktif melalui Rekanan sebelum mengganti pemilik.');
 const existing=requestId?data.units.find(u=>u.requestId===requestId):undefined;if(existing){sameRequest(existing,input);return existing;}
 if(data.units.some(u=>u.id!==id&&plateKey(u.plate)===plateKey(input.plate)))fail('Plat kendaraan sudah terdaftar.');
 assertAssets(data,[input.photoId],true);assertAssets(data,input.documents.map(d=>d.assetId));
 if(new Set(input.documents.map(d=>d.id)).size!==input.documents.length)fail('Dokumen kendaraan duplikat.',400);
 if(previous&&input.mileage<(previous.mileage||0))fail('Kilometer tidak boleh lebih kecil dari catatan terakhir.');
 if(previous&&input.operatingHours<(previous.operatingHours||0))fail('Jam operasi tidak boleh berkurang.');
 const reserved=data.bookings.filter(b=>b.unitId===id&&isReserved(b));
 if(previous&&input.condition!==previous.condition&&input.condition!=='ready'&&reserved.length)fail(`Masih ada booking aktif: ${reserved.map(b=>b.id).join(', ')}. Selesaikan atau ubah jadwalnya dahulu.`);
 if(input.condition==='ready'&&id&&unresolvedRepair(data,id))fail('Masih ada temuan yang memerlukan perbaikan. Selesaikan maintenance terkait dahulu.');
 if(previous?.archivedAt&&input.condition!=='inactive')fail('Pulihkan arsip kendaraan sebelum mengaktifkannya.');
 const unit:Unit={...previous,...input,id:id||`U${Math.max(0,...data.units.map(u=>Number(u.id.replace(/^U/,''))||0))+1}`,color:previous?.color||'#edf1f8',revision:(previous?.revision||0)+1,...(!id?{requestId}:{} )};
 if(previous)data.units[data.units.indexOf(previous)]=unit;else data.units.push(unit);
 audit(data,'unit',previous?'Kendaraan diperbarui':'Kendaraan ditambahkan',`${unit.name} · ${unit.plate}`);return unit;
}
export function archiveUnit(data:DashboardData,id:string,expected:number,restore=false){
 const u=data.units.find(u=>u.id===id);if(!u)fail('Kendaraan tidak ditemukan.',404);revision(u.revision,expected);
 if(!restore){if(data.bookings.some(b=>b.unitId===id&&isReserved(b))||allMaintenance(data).some(m=>m.unitId===id&&(m.status==='scheduled'||m.status==='in_progress')))fail('Kendaraan masih memiliki booking atau maintenance aktif.');u.archivedAt=new Date().toISOString();u.condition='inactive';}
 else{delete u.archivedAt;u.condition='inactive';}u.revision=(u.revision||0)+1;audit(data,'unit',restore?'Arsip kendaraan dipulihkan':'Kendaraan diarsipkan',u.plate);return u;
}
function validateMaintenance(data:DashboardData,input:MaintenanceInput,except?:string){
 const unit=data.units.find(u=>u.id===input.unitId);if(!unit||unit.archivedAt)fail('Kendaraan tidak ditemukan atau diarsipkan.',400);
 if(+new Date(input.end)<=+new Date(input.start))fail('Estimasi selesai harus setelah waktu mulai.',400);
 if(input.scheduleType==='mileage'&&input.dueMileage===undefined)fail('Isi kilometer jatuh tempo.',400);
 if(unit.category==='Motor'&&input.scheduleType==='hours')fail('Maintenance motor memakai tanggal atau kilometer.',400);
 if(input.scheduleType==='hours'&&input.dueHours===undefined)fail('Isi jam operasi jatuh tempo.',400);
 const conflicts=data.bookings.filter(b=>b.unitId===unit.id&&isReserved(b)&&overlaps(input.start,input.end,b.start,b.status==='running'&&+new Date(b.end)<Date.now()?'9999-12-31T23:59:59Z':b.end));
 if(conflicts.length)fail(`Jadwal berbenturan dengan booking ${conflicts.map(b=>b.id).join(', ')}. Ubah periode atau selesaikan rental dahulu.`);
 if(allMaintenance(data).some(m=>m.id!==except&&m.unitId===unit.id&&maintenanceBlocks(m,input.start,input.end)))fail('Jadwal berbenturan dengan maintenance lain.');
 assertAssets(data,input.attachments);
 if(input.inspectionId){const insp=allInspections(data).find(i=>i.id===input.inspectionId&&i.unitId===unit.id&&i.status==='completed');if(!insp)fail('Inspeksi terkait tidak ditemukan.',400);for(const id of input.damageIds){const damage=insp.damages.find(d=>d.id===id);if(!damage||damage.resolved)fail('Temuan terkait tidak valid atau sudah selesai.');if(damage.maintenanceId&&damage.maintenanceId!==except&&allMaintenance(data).some(m=>m.id===damage.maintenanceId&&m.status!=='cancelled'))fail('Temuan sudah ditangani maintenance lain.');}}
 return unit;
}
export function saveMaintenance(data:DashboardData,input:MaintenanceInput,id?:string,expected=0,requestId?:string){
 data.maintenance ||= [];const old=id?data.maintenance.find(m=>m.id===id):undefined;if(id&&!old)fail('Maintenance tidak ditemukan.',404);
 const existing=requestId?data.maintenance.find(m=>m.requestId===requestId):undefined;const previous=old||existing;input={...input,pic:resolveEmployee(data,input.picEmployeeId,input.pic,'maintenance',{id:previous?.picEmployeeId,name:previous?.pic})};if(existing){sameRequest(existing,input,['start','end']);return existing;}
 if(old){revision(old.revision,expected);if(old.status!=='scheduled')fail('Hanya maintenance terjadwal yang dapat diedit.');if(old.unitId!==input.unitId)fail('Unit pada pekerjaan yang sudah dibuat tidak dapat diganti.');}
 validateMaintenance(data,input,id);
 const m:Maintenance={...input,id:id||`MT-${randomUUID().slice(0,8).toUpperCase()}`,start:new Date(input.start).toISOString(),end:new Date(input.end).toISOString(),status:'scheduled',createdAt:old?.createdAt||new Date().toISOString(),revision:(old?.revision||0)+1,requestId:old?.requestId||requestId,history:[...(old?.history||[]),{at:new Date().toISOString(),action:old?'Diperbarui':'Dijadwalkan',note:input.notes}]};
 if(old){for(const i of allInspections(data))for(const d of i.damages)if(d.maintenanceId===old.id&&(!input.damageIds.includes(d.id)||i.id!==input.inspectionId)){delete d.maintenanceId;i.revision++;}data.maintenance[data.maintenance.indexOf(old)]=m;}else data.maintenance.push(m);
 if(input.inspectionId){const i=allInspections(data).find(i=>i.id===input.inspectionId)!;for(const d of i.damages)if(input.damageIds.includes(d.id))d.maintenanceId=m.id;i.revision++;}
 audit(data,'maintenance',old?'Maintenance diperbarui':'Maintenance dijadwalkan',`${m.title} · ${m.id}`);return m;
}
export function transitionMaintenance(data:DashboardData,id:string,expected:number,action:'start'|'cancel'|'complete',details:{reason?:string;actualCost?:number;mileage?:number;operatingHours?:number;returnCondition?:'ready'|'maintenance';resolveDamage?:boolean;nextDueDate?:string;nextDueMileage?:number;nextDueHours?:number}){
 const m=allMaintenance(data).find(m=>m.id===id);if(!m)fail('Maintenance tidak ditemukan.',404);revision(m.revision,expected);const unit=data.units.find(u=>u.id===m.unitId)!;
 if(action==='start'){
  if(m.status!=='scheduled')fail('Pekerjaan bukan berstatus Terjadwal.');
  if(+new Date(m.start)>Date.now())fail('Belum waktunya mulai. Ubah jadwal bila pekerjaan akan dimajukan.');
  if(+new Date(m.end)<=Date.now())fail('Perbarui estimasi selesai sebelum memulai pekerjaan yang terlambat.');
  if(data.bookings.some(b=>b.unitId===m.unitId&&b.status==='running'))fail('Kendaraan belum dikembalikan dari rental.');
  validateMaintenance(data,m,m.id);m.status='in_progress';m.startedAt=new Date().toISOString();
 }else if(action==='cancel'){
  if(m.status==='completed'||m.status==='cancelled')fail('Pekerjaan sudah ditutup.');if(!details.reason?.trim())fail('Alasan pembatalan wajib diisi.',400);
  if(m.status==='in_progress'){unit.condition='maintenance';unit.revision=(unit.revision||0)+1;}m.status='cancelled';
 }else{
  if(m.status!=='in_progress')fail('Mulai pekerjaan sebelum menyelesaikannya.');
  if(details.actualCost===undefined||!details.returnCondition)fail('Isi biaya aktual dan kondisi kendaraan setelah pekerjaan.',400);
  if(details.mileage!==undefined&&details.mileage<(unit.mileage||0))fail('Kilometer tidak boleh berkurang.');
  if(details.operatingHours!==undefined&&details.operatingHours<(unit.operatingHours||0))fail('Jam operasi tidak boleh berkurang.');
  const unresolved=allInspections(data).flatMap(i=>i.unitId===unit.id?i.damages.filter(d=>d.requiresRepair&&!d.resolved).map(d=>({inspection:i,damage:d})):[]);
  if(details.returnCondition==='ready'&&unresolved.some(({inspection,damage})=>!(details.resolveDamage&&inspection.id===m.inspectionId&&m.damageIds.includes(damage.id))))fail('Masih ada temuan perbaikan yang belum diselesaikan. Pilih kondisi Maintenance.');
  if(details.returnCondition==='ready'&&allMaintenance(data).some(other=>other.id!==m.id&&other.unitId===unit.id&&other.status==='in_progress'))fail('Masih ada pekerjaan maintenance berlangsung pada unit ini.');
  m.status='completed';m.completedAt=new Date().toISOString();m.actualCost=details.actualCost;
  m.nextDueDate=details.nextDueDate;m.nextDueMileage=details.nextDueMileage;m.nextDueHours=details.nextDueHours;
  if(details.mileage!==undefined)unit.mileage=details.mileage;if(details.operatingHours!==undefined)unit.operatingHours=details.operatingHours;
  if(details.resolveDamage&&m.inspectionId){const i=allInspections(data).find(i=>i.id===m.inspectionId)!;for(const d of i.damages)if(m.damageIds.includes(d.id))d.resolved=true;i.revision++;}
  unit.condition=details.returnCondition;unit.revision=(unit.revision||0)+1;
 }
 m.revision++;m.history.push({at:new Date().toISOString(),action:action==='start'?'Dimulai':action==='cancel'?'Dibatalkan':'Selesai',note:details.reason||''});audit(data,'maintenance',`Maintenance ${action==='start'?'dimulai':action==='cancel'?'dibatalkan':'selesai'}`,`${m.title} · ${unit.plate}`);return m;
}
