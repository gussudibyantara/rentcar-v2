import type { DashboardData, Notice } from './types';
import { documentState, maintenanceOverdue } from './fleet-shared';
export function syncFleetReminders(data:DashboardData){
 const reminders:Notice[]=[];
 for(const u of data.units.filter(u=>!u.archivedAt))for(const d of u.documents||[]){const state=documentState(d.expiresOn);if(state==='expired'||state==='soon')reminders.push({id:`DOC:${u.id}:${d.id}:${d.expiresOn}`,unitId:u.id,title:`${d.type} ${u.plate} ${state==='expired'?'kedaluwarsa':'segera berakhir'}`,description:`Masa berlaku ${d.expiresOn}. Periksa dokumen kendaraan.`,kind:'unit',read:false});}
 for(const m of data.maintenance||[]){const unit=data.units.find(u=>u.id===m.unitId);if(maintenanceOverdue(m,unit))reminders.push({id:`MT-DUE:${m.id}:${m.start}`,maintenanceId:m.id,title:`Maintenance perlu perhatian: ${m.title}`,description:`${unit?.plate} · tanggal atau batas penggunaan terlampaui.`,kind:'maintenance',read:false});if(m.status==='completed'&&unit){const dateDue=m.nextDueDate&&(+new Date(`${m.nextDueDate}T23:59:59+08:00`)-Date.now())/86400000<=7,kmDue=m.nextDueMileage!==undefined&&(unit.mileage||0)>=m.nextDueMileage,hourDue=m.nextDueHours!==undefined&&(unit.operatingHours||0)>=m.nextDueHours;if(dateDue||kmDue||hourDue)reminders.push({id:`MT-NEXT:${m.id}:${m.nextDueDate||m.nextDueMileage||m.nextDueHours}`,maintenanceId:m.id,title:`Pengingat servis berikutnya: ${unit.plate}`,description:'Batas servis berikutnya sudah dekat atau terlampaui. Jadwalkan pekerjaan baru.',kind:'maintenance',read:false});}}
 const live=new Set(reminders.map(n=>n.id));data.notifications=data.notifications.filter(n=>!(/^(DOC:|MT-DUE:|MT-NEXT:)/.test(n.id))||live.has(n.id));
 for(const n of reminders)if(!data.notifications.some(old=>old.id===n.id))data.notifications.push(n);
}
