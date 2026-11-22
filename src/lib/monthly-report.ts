import type {DashboardData} from './types';
import {todayISO} from './format';
import {addDays,addMonths} from './calendar';
import {partnerReport} from './partner-report';
import {expenseCategories} from './reports';

export function reportMonthBounds(month:string){
 if(!/^(20[2-9]\d|2100)-(0[1-9]|1[0-2])$/.test(month))throw Error('Bulan laporan tidak valid.');
 const from=month+'-01',next=addMonths(from,1);return {from,to:addDays(next,-1),start:from+'T00:00:00+08:00',end:next+'T00:00:00+08:00'};
}
export function monthlyReport(data:DashboardData,month:string,filter={unitId:'',category:''}){
 const bounds=reportMonthBounds(month),inMonth=(date:string)=>date>=bounds.from&&date<=bounds.to;
 const units=data.units.filter(u=>(!filter.unitId||u.id===filter.unitId)&&(!filter.category||u.category===filter.category)),ids=new Set(units.map(u=>u.id));
 const source=partnerReport(data,month),rows=source.rows.filter(r=>ids.has(r.unitId));
 const bookings=data.bookings.filter(b=>ids.has(b.unitId)&&b.status!=='cancelled'&&+new Date(b.start)<+new Date(bounds.end)&&+new Date(b.end)>+new Date(bounds.start));
 const departures=data.bookings.filter(b=>ids.has(b.unitId)&&b.status!=='cancelled'&&(Boolean(b.actualStart)||['running','returned','completed'].includes(b.status))&&inMonth(todayISO(new Date(b.actualStart||b.start))));
 const unallocated=!filter.unitId&&!filter.category?source.unallocatedOverhead:0;
 const revenue=rows.reduce((n,r)=>n+r.revenue,0),partnerIncome=rows.reduce((n,r)=>n+r.payable,0);
 const costsTotal=rows.reduce((n,r)=>n+r.operatorCosts+r.ownerDeductions+r.overhead,0)+unallocated;
 const incomplete=rows.some(r=>r.unknown.length>0),profit=incomplete?null:rows.reduce((n,r)=>n+(r.margin||0),0)-unallocated;
 const vehicles=units.map(unit=>{const ownRows=rows.filter(r=>r.unitId===unit.id),ownBookings=bookings.filter(b=>b.unitId===unit.id);return {unit,bookings:ownBookings.length,departures:departures.filter(b=>b.unitId===unit.id).length,days:ownRows.reduce((n,r)=>n+r.days,0),revenue:ownRows.reduce((n,r)=>n+r.revenue,0),cost:ownRows.reduce((n,r)=>n+r.operatorCosts+r.ownerDeductions+r.overhead,0),partnerIncome:ownRows.reduce((n,r)=>n+r.payable,0),profit:ownRows.some(r=>r.unknown.length)?null:ownRows.reduce((n,r)=>n+(r.margin||0),0)};}).filter(v=>v.bookings||v.departures||v.cost||v.partnerIncome).sort((a,b)=>b.departures-a.departures||b.bookings-a.bookings||b.revenue-a.revenue||a.unit.name.localeCompare(b.unit.name,'id'));
 const costs:{id:string;title:string;date:string;amount:number;category:string;unitId:string;borneBy:string;status:string;source:string;href:string;note?:string}[]=[];
 for(const e of data.expenses||[]){if(e.status==='void'||e.category==='partner'||e.maintenanceId||e.settlementId||!inMonth(e.date))continue;if(e.unitId&&!ids.has(e.unitId))continue;if(!e.unitId&&(filter.unitId||filter.category))continue;costs.push({id:'expense:'+e.id,title:e.title,date:e.date,amount:e.amount,category:expenseCategories[e.category],unitId:e.unitId,borneBy:e.borneBy==='owner'?'Rekanan':'Usaha',status:e.status==='paid'?'Sudah dibayar':'Belum dibayar',source:'Pengeluaran',href:'/expenses?record='+encodeURIComponent(e.id)});}
 for(const m of data.maintenance||[]){if(m.status!=='completed'||!m.completedAt||!ids.has(m.unitId)||!inMonth(todayISO(new Date(m.completedAt))))continue;costs.push({id:'maintenance:'+m.id,title:m.title,date:todayISO(new Date(m.completedAt)),amount:m.actualCost||0,category:'Maintenance',unitId:m.unitId,borneBy:'Usaha',status:'Pekerjaan selesai',source:'Maintenance',href:'/maintenance?record='+encodeURIComponent(m.id)});}
 if(filter.unitId||filter.category){const allocation=rows.reduce((n,r)=>n+r.overhead,0);if(allocation)costs.push({id:'overhead',title:'Alokasi biaya umum',date:bounds.to,amount:allocation,category:'Operasional kantor',unitId:'',borneBy:'Usaha',status:'Dialokasikan',source:'Alokasi bulanan',href:'/expenses',note:'Bagian biaya umum sesuai pendapatan kendaraan terpilih.'});}
 // Closed settlements preserve their sources. Keep any derived difference visible instead of inventing an expense.
 const difference=costsTotal-costs.reduce((n,c)=>n+c.amount,0);
 if(difference)costs.push({id:'snapshot',title:'Penyesuaian rekap final',date:bounds.to,amount:difference,category:'Rekap final',unitId:'',borneBy:'Usaha / rekanan',status:'Sumber terkunci',source:'Rekap rekanan',href:'/settlements?month='+month,note:'Selisih terhadap sumber yang sudah dikunci pada rekap final; bukan transaksi kas baru.'});
 costs.sort((a,b)=>b.date.localeCompare(a.date)||b.amount-a.amount);
 const unpaid=bookings.filter(b=>b.paid<b.total).sort((a,b)=>(b.total-b.paid)-(a.total-a.paid)||a.start.localeCompare(b.start));
 return {month,...bounds,bookings,departures,vehicles,costs,unpaid,revenue,expenses:costsTotal,partnerIncome,profit,incomplete,provisional:source.provisional||month>=todayISO().slice(0,7),outstanding:unpaid.reduce((n,b)=>n+Math.max(0,b.total-b.paid),0)};
}
export type MonthlyReport=ReturnType<typeof monthlyReport>;
export function reportComposition(r:Pick<MonthlyReport,'profit'|'expenses'|'partnerIncome'>){
 if(r.profit===null||r.partnerIncome<0||r.expenses<0)return [];
 const values=[Math.max(0,r.profit),r.expenses,r.partnerIncome],total=values.reduce((a,b)=>a+b,0);
 return values.map(value=>({value,share:total?value/total:0}));
}
