import {motorChecklist,motorPhotoViews} from './vehicle-config';
import type { DashboardData, Maintenance, Unit,VehicleCategory } from './types';
export const maintenanceTypes: Record<Maintenance['type'],string> = {routine:'Servis rutin',repair:'Perbaikan',inspection:'Pemeriksaan',replacement:'Penggantian',cleaning:'Pembersihan',other:'Lainnya'};
export const maintenanceStatuses: Record<Maintenance['status'],string> = {scheduled:'Terjadwal',in_progress:'Berlangsung',completed:'Selesai',cancelled:'Dibatalkan'};
export const conditions: Record<Unit['condition'],string> = {ready:'Siap',maintenance:'Maintenance',inactive:'Nonaktif'};
export const checklistItems = [
 {id:'body',label:'Bodi kendaraan',group:'Eksterior'}, {id:'bumper',label:'Bumper',group:'Eksterior'},
 {id:'glass',label:'Kaca dan spion',group:'Eksterior'}, {id:'lights',label:'Lampu dan sein',group:'Eksterior'},
 {id:'tires',label:'Ban dan velg',group:'Mekanis'}, {id:'brakes',label:'Rem',group:'Mekanis'},
 {id:'engine',label:'Mesin dan cairan',group:'Mekanis'}, {id:'horn',label:'Klakson',group:'Mekanis'},
 {id:'seats',label:'Jok dan sabuk',group:'Interior'}, {id:'cleanliness',label:'Kebersihan interior',group:'Interior'},
 {id:'tools',label:'Ban cadangan dan perkakas',group:'Kelengkapan'}, {id:'documents',label:'Dokumen dan kunci',group:'Kelengkapan'},
];
export const photoViews = [{id:'front',label:'Depan'},{id:'rear',label:'Belakang'},{id:'left',label:'Kiri'},{id:'right',label:'Kanan'},{id:'interior',label:'Interior'}];
export const checkLabels = {unchecked:'Belum diperiksa',good:'Baik',warning:'Perlu perhatian',damaged:'Rusak'};
export const allMaintenance = (data:DashboardData) => data.maintenance || [];
export const allInspections = (data:DashboardData) => data.inspections || [];
export function maintenanceBlocks(m:Maintenance,start:string,end:string) {
 if(m.status!=='scheduled'&&m.status!=='in_progress')return false;
 const until=m.status==='in_progress'&&+new Date(m.end)<Date.now()?Infinity:+new Date(m.end);
 return +new Date(m.startedAt||m.start)<+new Date(end)&&+new Date(start)<until;
}
export function blockedByMaintenance(data:DashboardData,unitId:string,start:string,end:string) {return allMaintenance(data).some(m=>m.unitId===unitId&&maintenanceBlocks(m,start,end));}
export function unresolvedRepair(data:DashboardData,unitId:string) {return allInspections(data).some(i=>i.unitId===unitId&&i.status==='completed'&&i.damages.some(d=>d.requiresRepair&&!d.resolved));}
export function maintenanceOverdue(m:Maintenance,unit?:Unit) {return m.status==='scheduled'&&(+new Date(m.start)<Date.now()||(m.scheduleType==='mileage'&&m.dueMileage!==undefined&&(unit?.mileage||0)>=m.dueMileage)||(m.scheduleType==='hours'&&m.dueHours!==undefined&&(unit?.operatingHours||0)>=m.dueHours));}
export function documentState(expiresOn:string) {if(!expiresOn)return 'none';const days=(+new Date(`${expiresOn}T23:59:59+08:00`)-Date.now())/86400000;return days<0?'expired':days<=30?'soon':'valid';}

/** Upgrade retired local/PostgreSQL values without changing historical snapshots. */
export function normalizeFleetConditions(data:DashboardData){for(const unit of data.units){if((unit.condition as string)==='preparation')unit.condition=unit.archivedAt?'inactive':unresolvedRepair(data,unit.id)||allMaintenance(data).some(m=>m.unitId===unit.id&&m.status==='in_progress')?'maintenance':'ready';}}

export const checklistFor=(category:VehicleCategory)=>category==='Motor'?motorChecklist:checklistItems;
export const photoViewsFor=(category:VehicleCategory)=>category==='Motor'?motorPhotoViews:photoViews;
