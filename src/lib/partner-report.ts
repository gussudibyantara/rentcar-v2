import type { Booking,DashboardData,PartnerAgreement,PartnerReportRow,PartnerSettlement } from './types';
import { days,todayISO } from './format';
import { addMonths,addDays } from './calendar';
import { isPartnerUnit,agreementCovers } from './partner-rules';
export const schemeNames={daily:'Modal harian',share:'Bagi hasil',monthly:'Sewa bulanan tetap'};
/** Cumulative rounding preserves the whole amount when an interval is split across months. */
export function allocate(amount:number,start:string,end:string,from:string,to:string){const a=+new Date(start),z=+new Date(end),duration=z-a;if(duration<=0)return 0;const before=Math.max(0,Math.min(duration,+new Date(from)-a)),after=Math.max(0,Math.min(duration,+new Date(to)-a));return Math.round(amount*after/duration)-Math.round(amount*before/duration);}
export function partnerReport(d:DashboardData,month:string){const day=month+'-01',next=addMonths(day,1),from=day+'T00:00:00+08:00',to=next+'T00:00:00+08:00',rows=new Map<string,PartnerReportRow>();
 function row(unitId:string,partnerId='',partnerName='Armada sendiri'){const key=unitId+':'+partnerId;let r=rows.get(key);if(!r){const u=d.units.find(u=>u.id===unitId)!;r={key,unitId,unitName:u.name,plate:u.plate,branch:u.branch,partnerId,partnerName,bookingIds:[],bookings:0,days:0,revenue:0,ownerGross:0,ownerDeductions:0,operatorCosts:0,overhead:0,payable:0,margin:0,unknown:[],provisional:false,details:[]};rows.set(key,r);}return r;}

 const bookings=d.bookings.filter(b=>b.status!=='cancelled'&&+new Date(b.start)<+new Date(to)&&+new Date(b.end)>+new Date(from));
 for(const b of bookings){const u=d.units.find(u=>u.id===b.unitId);if(!u)continue;const terms=b.partnerTerms;const a=terms?.kind==='partner'?terms.agreement:undefined;const inferred=d.partnerAgreements?.find(a=>agreementCovers(a,b));const unknown=!terms&&(isPartnerUnit(u)||!!inferred);const r=row(u.id,a?.partnerId||inferred?.partnerId||(unknown?'unknown':''),terms?.kind==='partner'?terms.partnerName:d.partners?.find(p=>p.id===inferred?.partnerId)?.name||(unknown?u.owner:'Armada sendiri'));
 const invoice=d.invoices?.find(i=>i.bookingId===b.id&&i.status==='issued'),net=invoice?invoice.subtotal-invoice.discount:b.total,rent=invoice?Math.round(net*invoice.source.baseTotal/invoice.subtotal):b.total;
 const directCosts=(d.expenses||[]).filter(e=>e.bookingId===b.id&&e.status!=='void'&&e.category!=='partner'&&!e.maintenanceId&&e.borneBy!=='owner').reduce((n,e)=>n+e.amount,0);
 let gross=0;if(a?.type==='daily')gross=days(b.start,b.end)*a.rate;else if(a?.type==='share')gross=Math.round(Math.max(0,rent-(a.shareAfterCosts?directCosts:0))*a.rate/100);
 const fraction=allocate(1000000000,b.start,b.end,from,to)/1000000000,billedDays=days(b.start,b.end)*fraction,owner=allocate(gross,b.start,b.end,from,to);
 r.bookingIds.push(b.id);r.bookings++;r.days+=billedDays;r.revenue+=allocate(net,b.start,b.end,from,to);r.ownerGross+=owner;r.provisional ||= b.status==='confirmed'||(b.status==='running'&&!invoice)||month>=todayISO().slice(0,7);if(unknown)r.unknown.push(b.id);r.details.push({bookingId:b.id,start:b.start,end:b.end,days:billedDays,ownerGross:owner,scheme:a?schemeNames[a.type]:(unknown?'Belum direkonsiliasi':'Milik sendiri')});
 }
 // Fixed monthly fees accrue even when a vehicle has no bookings; partial contract months use calendar-day proration.
 for(const a of d.partnerAgreements||[]){if(a.type!=='monthly'||a.start>=next||a.end<day)continue;const p=d.partners?.find(p=>p.id===a.partnerId);const r=row(a.unitId,a.partnerId,p?.name||'Rekanan');const first=a.start>day?a.start:day,last=addDays(a.end,1)<next?addDays(a.end,1):next;const count=(+new Date(last+'T00:00:00+08:00')-+new Date(first+'T00:00:00+08:00'))/86400000,monthDays=(+new Date(to)-+new Date(from))/86400000;r.ownerGross+=Math.round(a.rate*count/monthDays);}
 const costs:{unitId:string;date:string;amount:number;borneBy:string;bookingId:string}[]=[];
 for(const e of d.expenses||[]){if(e.status==='void'||e.category==='partner'||e.maintenanceId||e.date<day||e.date>=next)continue;if(!e.unitId){continue;}costs.push({unitId:e.unitId,date:e.date,amount:e.amount,borneBy:e.borneBy||'operator',bookingId:e.bookingId});}
 for(const m of d.maintenance||[]){if(m.status!=='completed'||!m.completedAt)continue;const date=todayISO(new Date(m.completedAt));if(date<day||date>=next)continue;costs.push({unitId:m.unitId,date,amount:m.actualCost||0,borneBy:'operator',bookingId:''});}
 for(const c of costs){const owner=partnerCostOwner(d,c.unitId,c.date,c.bookingId);const r=row(c.unitId,owner.id,owner.name);if(c.borneBy==='owner')r.ownerDeductions+=c.amount;else r.operatorCosts+=c.amount;}
 for(const u of d.units.filter(u=>!u.archivedAt)){if([...rows.values()].some(r=>r.unitId===u.id))continue;const a=d.partnerAgreements?.find(a=>a.unitId===u.id&&a.start<next&&a.end>=day),p=d.partners?.find(p=>p.id===a?.partnerId);row(u.id,p?.id||(isPartnerUnit(u)?'unknown':''),p?.name||(isPartnerUnit(u)?u.owner:'Armada sendiri'));}
 for(const r of rows.values()){if(r.partnerId==='unknown'&&!r.unknown.length)r.unknown.push('Skema kendaraan '+r.plate);r.payable=r.ownerGross-r.ownerDeductions;r.margin=r.unknown.length?null:r.revenue-r.ownerGross-r.operatorCosts;}
 // Final documents are the immutable source for the owner/month once closed.
 for(const s of d.settlements||[]){if(s.status!=='final'||s.month!==month)continue;for(const [k,r]of rows)if(r.partnerId===s.partnerId)rows.delete(k);for(const r of s.rows)rows.set(r.key,structuredClone(r));}
 const result=[...rows.values()].sort((a,b)=>b.revenue-a.revenue),overhead=(d.expenses||[]).filter(e=>e.status!=='void'&&!e.unitId&&e.category!=='partner'&&!e.maintenanceId&&e.date>=day&&e.date<next).reduce((n,e)=>n+e.amount,0);const totalRevenue=result.reduce((n,r)=>n+r.revenue,0);let cumulative=0,allocated=0;for(const r of result){cumulative+=r.revenue;const next=totalRevenue?Math.round(overhead*cumulative/totalRevenue):0;r.overhead=next-allocated;allocated=next;r.margin=r.unknown.length?null:r.revenue-r.ownerGross-r.operatorCosts-r.overhead;}const unknown=result.flatMap(r=>r.unknown),margin=unknown.length?null:result.reduce((n,r)=>n+(r.margin||0),0)-(overhead-allocated);
 const legacyPayments=(d.expenses||[]).filter(e=>e.category==='partner'&&!e.settlementId&&e.status!=='void'&&e.date>=day&&e.date<next);
 return {rows:result,overhead,unallocatedOverhead:overhead-allocated,unknown,margin,legacyPayments,provisional:result.some(r=>r.provisional),revenue:result.reduce((n,r)=>n+r.revenue,0),ownerGross:result.reduce((n,r)=>n+r.ownerGross,0),ownerDeductions:result.reduce((n,r)=>n+r.ownerDeductions,0),operatorCosts:result.reduce((n,r)=>n+r.operatorCosts,0)};
}
export function settlementPaid(s:PartnerSettlement){return s.payments.filter(p=>!p.reversedAt).reduce((n,p)=>n+p.amount,0);}
export function settlementCredit(s:PartnerSettlement){return (s.credits||[]).reduce((n,c)=>n+(c.direction==='in'?c.amount:-c.amount),0);}
export function settlementBalance(s:PartnerSettlement){return s.total-settlementPaid(s)-settlementCredit(s);}

/** Aggregate by owner identity, retaining vehicle-level sources for drill-down. */
export function groupPartnerRows(rows:PartnerReportRow[]){
 const groups=new Map<string,{key:string;partnerId:string;name:string;rows:PartnerReportRow[];unitIds:string[];branches:string[];bookingIds:string[];days:number;revenue:number;ownerGross:number;ownerDeductions:number;payable:number;operatorCosts:number;overhead:number;margin:number|null;provisional:boolean}>();
 for(const row of rows){
  const key=row.partnerId==='unknown'?`unknown:${row.partnerName}`:row.partnerId||'owned';
  let g=groups.get(key);if(!g){g={key,partnerId:row.partnerId,name:row.partnerName,rows:[],unitIds:[],branches:[],bookingIds:[],days:0,revenue:0,ownerGross:0,ownerDeductions:0,payable:0,operatorCosts:0,overhead:0,margin:0,provisional:false};groups.set(key,g);}
  g.rows.push(row);if(!g.unitIds.includes(row.unitId))g.unitIds.push(row.unitId);if(!g.branches.includes(row.branch))g.branches.push(row.branch);for(const id of row.bookingIds)if(!g.bookingIds.includes(id))g.bookingIds.push(id);
  for(const key of ['days','revenue','ownerGross','ownerDeductions','payable','operatorCosts','overhead'] as const)g[key]+=row[key];
  g.margin=g.margin===null||row.margin===null?null:g.margin+row.margin;g.provisional ||= row.provisional;
 }
 return [...groups.values()].sort((a,b)=>b.revenue-a.revenue||a.name.localeCompare(b.name,'id'));
}
export type PartnerSummary=ReturnType<typeof groupPartnerRows>[number];
export function usageDays(value:number){return new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(value);}

export function partnerCostOwner(d:DashboardData,unitId:string,date:string,bookingId=''){const b=d.bookings.find(b=>b.id===bookingId);if(b?.partnerTerms?.kind==='owned')return {id:'',name:'Armada sendiri'};if(b?.partnerTerms?.kind==='partner')return {id:b.partnerTerms.agreement.partnerId,name:b.partnerTerms.partnerName};const a=d.partnerAgreements?.find(a=>a.unitId===unitId&&a.start<=date&&a.end>=date),p=d.partners?.find(p=>p.id===a?.partnerId);const unit=d.units.find(u=>u.id===unitId);return p?{id:p.id,name:p.name}:unit&&isPartnerUnit(unit)?{id:'unknown',name:unit.owner}:{id:'',name:'Armada sendiri'};}
