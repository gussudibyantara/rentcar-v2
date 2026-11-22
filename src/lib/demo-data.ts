/** Explicit, local-only demo import. Never used automatically on application startup. */
import {randomUUID} from 'node:crypto';
import type {DashboardData} from './types';
import {saveEmployee,employeeSchema} from './employee-service';
import {savePartner,partnerSchema,saveAgreement,agreementSchema,createSettlement,settlementSchema,paySettlement,partnerPaymentSchema} from './partner-service';
import {saveCustomer,customerSchema,saveExpense,expenseSchema} from './office-service';
import {saveUnit,saveMaintenance} from './fleet-service';
import {unitSchema,maintenanceSchema,inspectionScheduleSchema} from './fleet-schema';
import {createBooking} from './booking-service';
import {scheduleInspection,startInspection} from './inspection-service';
import {saveInvoice,invoiceSchema,issueInvoice} from './invoice-service';
import {days,todayISO} from './format';
import {addDays,addMonths} from './calendar';

export const DEMO_MARKER='travelos-demo-ten-v1';
export const demoCollections=['employees','partners','units','customers','bookings','partnerAgreements','maintenance','inspections','expenses','invoices','settlements','notifications','activities'] as const;
export function addDemoData(existing:DashboardData):{data:DashboardData;added:boolean}{
 if(existing.activities.some(a=>a.id===DEMO_MARKER))return {data:structuredClone(existing),added:false};
 const d=structuredClone(existing),oldNotifications=structuredClone(d.notifications),oldActivities=structuredClone(d.activities);
 d.employees||=[];d.expenses||=[];d.partners||=[];d.partnerAgreements||=[];d.settlements||=[];d.invoices||=[];d.maintenance||=[];d.inspections||=[];d.assets||=[];
 const today=todayISO(),now=new Date().toISOString(),lastMonth=addMonths(today.slice(0,7)+'-01',-1),contractEnd=addMonths(today.slice(0,7)+'-01',12);
 const at=(offset:number,hour=9)=>new Date(`${addDays(today,offset)}T${String(hour).padStart(2,'0')}:00:00+08:00`).toISOString();
 const models=['Toyota Avanza','Toyota Innova Reborn','Toyota Hiace','Mitsubishi Xpander','Honda Brio','Toyota Fortuner','Suzuki XL7','Toyota Rush','Honda HR-V','Daihatsu Terios'];
 for(let n=0;n<10;n++){
  const number=String(n+1).padStart(2,'0'),note='Demo — data fiktif untuk mencoba aplikasi; bukan transaksi atau identitas nyata.';
  const employee=saveEmployee(d,employeeSchema.parse({name:`Demo Petugas ${number}`,phone:'',email:`staff${number}@example.invalid`,position:'Operasional demo',branch:'',roles:['booking','delivery','inspection','maintenance','payment'],notes:note}),undefined,0,randomUUID());
  const partner=savePartner(d,partnerSchema.parse({name:`Demo Rekanan ${number}`,phone:'',email:`partner${number}@example.invalid`,address:'Alamat simulasi — tidak untuk pengiriman',bank:'Tidak ada rekening nyata; seluruh pembayaran hanya simulasi.',notes:note}),undefined,0,randomUUID());
  const unit=saveUnit(d,unitSchema.parse({name:`Demo ${models[n]}`,plate:`DEMO ${number} UNIT`,brand:models[n].split(' ')[0],model:models[n].split(' ').slice(1).join(' '),year:2024,category:n===2?'Minibus':'Mobil',branch:'',owner:partner.name,ownership:'partner',partnerId:partner.id,rate:300000+n*50000,weeklyRate:0,monthlyRate:0,deposit:0,mileage:10000+n*1000,operatingHours:0,condition:'ready',notes:note,photoId:'',documents:[]}),undefined,0,randomUUID());
  saveAgreement(d,agreementSchema.parse({partnerId:partner.id,unitId:unit.id,type:'monthly',rate:600000+n*50000,shareAfterCosts:false,start:lastMonth,end:contractEnd,notes:note+' Contoh biaya bulanan tetap, termasuk saat kendaraan tidak disewa.'}),randomUUID());
  const customer=saveCustomer(d,customerSchema.parse({name:`Demo ${n%3===0?'Rental Mitra':'Pelanggan'} ${number}`,type:n%3===0?'Business':'Individual',email:`customer${number}@example.invalid`,phone:'',address:'Alamat pelanggan fiktif',identityNumber:'',licenseNumber:'',licenseExpiry:'',companyNumber:'',contactPerson:'',billingContact:'',notes:note,attachments:[]}),undefined,0,randomUUID());
  const start=at(n<3?-1:n-2),end=at(n<3?2:n+1,17),total=days(start,end)*unit.rate;
  const mode=(['after_return','dp','full','unpaid'] as const)[n%4],received=mode==='dp'||mode==='full';
  const booking=createBooking(d,{requestId:randomUUID(),customerId:customer.id,unitId:unit.id,start,end,pic:employee.name,picEmployeeId:employee.id,deliveryEmployeeId:employee.id,deliveryBy:employee.name,returnEmployeeId:employee.id,returnBy:employee.name,notes:note,paymentSetup:{customerKind:n%3===0?'rental_partner':'consumer',mode,amount:mode==='full'?total:mode==='dp'?Math.round(total/2):0,reference:received?`DEMO-PAY-${number}`:'',...(received?{method:'transfer' as const,date:today,receivedByEmployeeId:employee.id,receivedBy:employee.name}:{})}});
  // Synthetic imported running state; no completed inspection or evidence is fabricated.
  if(n<3){booking.status='running';booking.actualStart=start;booking.revision=(booking.revision||0)+1;booking.notes+=' Status berjalan adalah skenario demo impor; foto/checklist belum diisi.';}
  const inspection=scheduleInspection(d,inspectionScheduleSchema.parse({bookingId:booking.id,type:n<3?'checkin':'checkout',scheduledAt:n<3?end:start,inspector:employee.name,inspectorEmployeeId:employee.id,notes:note}),randomUUID());
  if(n===0)startInspection(d,inspection.id,inspection.revision);
  saveMaintenance(d,maintenanceSchema.parse({unitId:unit.id,title:`Demo servis rutin ${number}`,type:'routine',start:at(35+n),end:at(35+n,17),provider:`Demo Bengkel ${number}`,pic:employee.name,picEmployeeId:employee.id,scheduleType:'date',estimatedCost:150000+n*25000,notes:note,attachments:[],damageIds:[]}),undefined,0,randomUUID());
  const invoice=saveInvoice(d,invoiceSchema.parse({bookingId:booking.id,issueDate:today,dueDate:addDays(today,n<3?0:7),company:{name:'Demo Rental Fiktif',address:'Alamat perusahaan simulasi',phone:'',email:'billing@example.invalid',logoId:'',paymentInstructions:'SIMULASI — jangan melakukan transfer uang.'},lines:[],discount:0,taxRate:0,notes:note,terms:'Dokumen demo, bukan tagihan nyata.'}),undefined,0,randomUUID());
  if(n<7)issueInvoice(d,invoice.id,invoice.revision);
  const settlement=createSettlement(d,settlementSchema.parse({partnerId:partner.id,month:lastMonth.slice(0,7),companyName:'Demo Rental Fiktif',companyAddress:'Alamat perusahaan simulasi',notes:note+' Rekap bulan sebelumnya: biaya tetap kendaraan menganggur, tanpa booking. Bukan bukti transfer nyata.',attachments:[]}),randomUUID());
  if(n<5){paySettlement(d,settlement.id,settlement.revision,partnerPaymentSchema.parse({requestId:randomUUID(),amount:n<3?settlement.total:Math.round(settlement.total/2),date:today,method:'transfer',reference:`DEMO-SET-${number}`,attachments:[],branch:'',expenseId:'',handledByEmployeeId:employee.id,handledBy:employee.name}));const expense=d.expenses!.at(-1)!;expense.title='Demo · '+expense.title;expense.notes=note+' '+expense.notes;}
  else saveExpense(d,expenseSchema.parse({title:`Demo ${n%2?'cuci kendaraan':'biaya operasional'} ${number}`,category:n%2?'cleaning':'other',amount:50000+n*10000,date:today,branch:'',recipient:`Demo Penyedia ${number}`,method:'cash',status:n%2?'paid':'unpaid',paidOn:n%2?today:'',unitId:unit.id,bookingId:'',maintenanceId:'',attachments:[],notes:note,borneBy:'operator',...(n%2?{handledByEmployeeId:employee.id,handledBy:employee.name}:{})}),undefined,0,randomUUID());
 }
 // Cap only newly generated feed entries; never trim the user's existing feed.
 const oldNoticeIds=new Set(oldNotifications.map(n=>n.id)),oldActivityIds=new Set(oldActivities.map(a=>a.id));
 d.notifications=[...d.notifications.filter(n=>!oldNoticeIds.has(n.id)).slice(0,10).map(n=>({...n,title:`Demo · ${n.title}`})),...oldNotifications];
 d.activities=[{id:DEMO_MARKER,title:'Demo · 10 item per modul ditambahkan',description:'Data contoh berlabel Demo; data sebelumnya tetap dipertahankan.',at:now,kind:'booking'},...d.activities.filter(a=>!oldActivityIds.has(a.id)).slice(0,9).map(a=>({...a,title:`Demo · ${a.title}`})),...oldActivities];
 return {data:d,added:true};
}
