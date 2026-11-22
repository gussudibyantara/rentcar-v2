import type { DashboardData,EmployeeRole } from './types';
export const employeeRoles:Record<EmployeeRole,string>={booking:'Admin booking',delivery:'Pengantaran / pengembalian',inspection:'Inspeksi',maintenance:'Maintenance',payment:'Pembayaran'};
export function eligibleEmployees(data:DashboardData,role:EmployeeRole){return (data.employees||[]).filter(e=>!e.archivedAt&&e.roles.includes(role)).sort((a,b)=>a.name.localeCompare(b.name,'id'));}
export function employeeAssignments(data:DashboardData,id:string){
 const rows:{key:string;title:string;kind:string;date:string;status:string;href:string;open:boolean}[]=[];
 for(const b of data.bookings){for(const [field,kind,date]of [['picEmployeeId','PIC booking',b.start],['deliveryEmployeeId','Pengantaran',b.start],['returnEmployeeId','Pengembalian',b.end]]as const)if(b[field]===id)rows.push({key:b.id+field,title:b.id,kind,date,status:b.status,href:`/bookings?record=${b.id}`,open:b.status==='confirmed'||b.status==='running'});if(b.initialPayment?.receivedByEmployeeId===id)rows.push({key:b.id+'payment',title:b.id,kind:'Penerima pembayaran awal',date:b.initialPayment.date,status:b.initialPayment.reversedAt?'Dikoreksi':'Tercatat',href:`/bookings?record=${b.id}`,open:false});}
 for(const i of data.inspections||[])if(i.inspectorEmployeeId===id)rows.push({key:i.id,title:i.id,kind:'Inspeksi',date:i.scheduledAt,status:i.status,href:`/inspections?record=${i.id}`,open:i.status==='scheduled'||i.status==='in_progress'});
 for(const m of data.maintenance||[])if(m.picEmployeeId===id)rows.push({key:m.id,title:m.title,kind:'Maintenance',date:m.start,status:m.status,href:`/maintenance?record=${m.id}`,open:m.status==='scheduled'||m.status==='in_progress'});
 const initialIds=new Set(data.bookings.map(b=>b.initialPayment?.id));
 for(const i of data.invoices||[])for(const p of i.payments)if(p.receivedByEmployeeId===id&&!initialIds.has(p.id))rows.push({key:p.id,title:i.number||i.bookingId,kind:'Penerima pembayaran',date:p.date,status:p.reversedAt?'Dikoreksi':'Tercatat',href:`/invoices?record=${i.id}`,open:false});
 for(const e of data.expenses||[])if(e.handledByEmployeeId===id)rows.push({key:e.id,title:e.title,kind:'Pengeluaran',date:e.paidOn||e.date,status:e.status,href:`/expenses?record=${e.id}`,open:false});
 for(const s of data.settlements||[])for(const p of s.payments)if(p.handledByEmployeeId===id&&data.expenses?.find(e=>e.id===p.expenseId)?.handledByEmployeeId!==id)rows.push({key:p.id,title:s.number,kind:'Pembayaran rekanan',date:p.date,status:p.reversedAt?'Dikoreksi':'Tercatat',href:`/settlements?record=${s.id}`,open:false});
 return rows.sort((a,b)=>b.date.localeCompare(a.date));
}
