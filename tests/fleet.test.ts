import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSeed } from '../src/lib/seed';
import { savePartner, saveAgreement } from '../src/lib/partner-service';
import { available } from '../src/lib/rules';
import { allInspections, checklistItems, photoViews, maintenanceOverdue, normalizeFleetConditions } from '../src/lib/fleet-shared';
import { archiveUnit, saveMaintenance, saveUnit, transitionMaintenance, type MaintenanceInput, type UnitInput } from '../src/lib/fleet-service';
import { saveInspection, scheduleInspection, startInspection } from '../src/lib/inspection-service';
import {inspectionWorkSchema} from '../src/lib/fleet-schema';
import type { DashboardData } from '../src/lib/types';
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T02:00:00Z'));});
afterEach(()=>vi.useRealTimers());
const unitInput=(plate='DR 9999 TEST'):UnitInput=>({name:'Toyota Uji',plate,brand:'Toyota',model:'Uji',year:2024,category:'Mobil',branch:'Lombok',owner:'Armada sendiri',ownership:'owned',rate:400000,weeklyRate:2500000,monthlyRate:9000000,deposit:500000,mileage:100,operatingHours:0,condition:'ready',notes:'',photoId:'',documents:[]});
const maintenanceInput=(unitId='U7'):MaintenanceInput=>({unitId,title:'Servis uji',type:'routine',start:'2026-11-10T01:00:00Z',end:'2026-11-11T01:00:00Z',provider:'Bengkel uji',pic:'Fajar',scheduleType:'date',estimatedCost:400000,notes:'',attachments:[],damageIds:[]});
function setup(){const data=makeSeed();const unit=saveUnit(data,unitInput());data.bookings.push({id:'RN-TEST',unitId:unit.id,customerId:'C1',start:'2026-11-01T01:00:00Z',end:'2026-11-02T01:00:00Z',status:'confirmed',total:400000,paid:0,pic:'Test',notes:'',createdAt:'2026-11-01T00:00:00Z'});return {data,unit};}
function work(data:DashboardData,mileage=110){data.assets=photoViews.map(v=>({id:`photo-${v.id}`,name:`${v.id}.png`,mime:'image/png',size:100,createdAt:new Date().toISOString()}));return {mileage,fuel:75,notes:'',checklist:Object.fromEntries(checklistItems.map(c=>[c.id,'good' as const])),photos:photoViews.map(v=>({view:v.id,assetId:`photo-${v.id}`})),damages:[] as {id:string;area:string;description:string;severity:'minor'|'major';estimatedCost:number;requiresRepair:boolean}[],customerName:'Pelanggan uji',accepted:true,baselineMissingReason:''};}
function checkout(data:DashboardData){const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Fajar',notes:''},'checkout-request');startInspection(data,i.id,0);return saveInspection(data,i.id,1,work(data),true);}
describe('Vehicle records',()=>{
 it('links partner vehicles by ID and uses the registered owner name',()=>{
  const d=makeSeed();const p=savePartner(d,{name:'Rekanan Uji',phone:'',email:'',address:'',bank:'',notes:''});
  const input={...unitInput(),ownership:'partner' as const,partnerId:p.id,owner:'Nama tidak sesuai'};
  const u=saveUnit(d,input,undefined,0,'partner-vehicle-request');expect(u.partnerId).toBe(p.id);expect(u.owner).toBe(p.name);
  expect(saveUnit(d,input,undefined,0,'partner-vehicle-request').id).toBe(u.id);
  p.name='Rekanan Uji Diperbarui';const updated=saveUnit(d,{...input,rate:500000},u.id,u.revision);expect(updated.owner).toBe(p.name);
  const owned=saveUnit(d,{...unitInput(),partnerId:p.id},u.id,updated.revision);expect(owned.partnerId).toBe('');
 });
 it('rejects missing, unknown and archived partners on new vehicles',()=>{
  const d=makeSeed();const input={...unitInput(),ownership:'partner' as const};
  expect(()=>saveUnit(d,input)).toThrow('rekanan aktif');expect(()=>saveUnit(d,{...input,partnerId:'missing'})).toThrow('rekanan aktif');
  const p=savePartner(d,{name:'Rekanan Arsip Uji',phone:'',email:'',address:'',bank:'',notes:''});p.archivedAt=new Date().toISOString();
  expect(()=>saveUnit(d,{...input,partnerId:p.id})).toThrow('rekanan aktif');
 });
 it('keeps the partner identity protected by active agreements',()=>{
  const d=makeSeed();const profile={name:'Pemilik Pertama Uji',phone:'',email:'',address:'',bank:'',notes:''};const p=savePartner(d,profile),other=savePartner(d,{...profile,name:'Pemilik Kedua Uji'});
  const input={...unitInput(),ownership:'partner' as const,partnerId:p.id,owner:p.name};const u=saveUnit(d,input);
  saveAgreement(d,{partnerId:p.id,unitId:u.id,type:'daily',rate:200000,shareAfterCosts:false,start:'2026-11-01',end:'2026-12-01',notes:''},'agreement-unit-test');
  expect(()=>saveUnit(d,{...input,partnerId:other.id,owner:other.name},u.id,u.revision)).toThrow('skema rekanan');
  p.archivedAt=new Date().toISOString();const updated=saveUnit(d,{...input,rate:450000},u.id,u.revision);expect(updated.partnerId).toBe(p.id);
 });

 it('normalizes duplicate plates and preserves booked prices when unit rates change',()=>{const d=makeSeed();expect(()=>saveUnit(d,unitInput('dr1280ax'))).toThrow('Plat');const old=d.bookings[0].total;const u=saveUnit(d,unitInput());saveUnit(d,{...unitInput(),rate:900000},u.id,u.revision);expect(d.bookings[0].total).toBe(old);expect(()=>saveUnit(d,unitInput(),u.id,0)).toThrow('diperbarui');});
 it('archives only unused vehicles without deleting history',()=>{const {data,unit}=setup();expect(()=>archiveUnit(data,unit.id,unit.revision!)).toThrow('booking');const spare=saveUnit(data,unitInput('DR 9988 TEST'));archiveUnit(data,spare.id,spare.revision!);expect(data.units.some(u=>u.id===spare.id)).toBe(true);expect(available(data,spare,'2026-12-01','2026-12-02')).toBe(false);archiveUnit(data,spare.id,spare.revision!,true);expect(spare.condition).toBe('inactive');});
 it('rejects invalid asset references and decreasing mileage',()=>{const d=makeSeed();expect(()=>saveUnit(d,{...unitInput(),photoId:'missing'})).toThrow('Lampiran');const u=saveUnit(d,unitInput());expect(()=>saveUnit(d,{...unitInput(),mileage:99},u.id,u.revision!)).toThrow('Kilometer');});
});
describe('Maintenance and availability',()=>{
 it('blocks only the reserved maintenance interval and rejects conflicting jobs/bookings',()=>{const d=makeSeed();const m=saveMaintenance(d,maintenanceInput());expect(available(d,d.units[6],m.start,m.end)).toBe(false);expect(available(d,d.units[6],m.end,'2026-11-12T01:00:00Z')).toBe(true);expect(()=>saveMaintenance(d,maintenanceInput())).toThrow('maintenance lain');const b=d.bookings[0];expect(()=>saveMaintenance(d,{...maintenanceInput(b.unitId),start:b.start,end:b.end})).toThrow('booking');transitionMaintenance(d,m.id,m.revision,'cancel',{reason:'Uji'});expect(available(d,d.units[6],m.start,m.end)).toBe(true);});
 it('requires starting first, protects overdue rentals and records one completion cost',()=>{const d=makeSeed();const m=saveMaintenance(d,{...maintenanceInput(),start:'2026-11-01T01:00:00Z',end:'2026-11-01T05:00:00Z'});expect(()=>transitionMaintenance(d,m.id,m.revision,'complete',{actualCost:500000,returnCondition:'ready'})).toThrow('Mulai');transitionMaintenance(d,m.id,m.revision,'start',{});transitionMaintenance(d,m.id,m.revision,'complete',{actualCost:500000,returnCondition:'ready',mileage:200});expect(m.actualCost).toBe(500000);expect(m.status).toBe('completed');expect(()=>transitionMaintenance(d,m.id,m.revision,'complete',{actualCost:500000,returnCondition:'ready'})).toThrow();});
 it('keeps overdue in-progress jobs blocked beyond the estimated end',()=>{const d=makeSeed();const m=saveMaintenance(d,{...maintenanceInput(),start:'2026-11-01T01:00:00Z',end:'2026-11-01T03:00:00Z'});transitionMaintenance(d,m.id,m.revision,'start',{});vi.setSystemTime(new Date('2026-11-02T01:00:00Z'));expect(available(d,d.units[6],'2026-11-12T01:00:00Z','2026-11-13T01:00:00Z')).toBe(false);});
 it('supports mileage reminders independently of scheduled dates',()=>{const d=makeSeed();d.units[6].mileage=1000;const m=saveMaintenance(d,{...maintenanceInput(),scheduleType:'mileage',dueMileage:900});expect(maintenanceOverdue(m,d.units[6])).toBe(true);});
});
describe('Inspections and handovers',()=>{
 it('does not complete an incomplete inspection or create a duplicate active schedule',()=>{const {data}=setup();const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'one');expect(()=>scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'two')).toThrow('aktif');startInspection(data,i.id,0);const incomplete=work(data);incomplete.photos=[];incomplete.checklist.body='unchecked' as 'good';expect(()=>saveInspection(data,i.id,1,incomplete,true)).toThrow('checklist');expect(i.status).toBe('in_progress');expect(data.bookings.find(b=>b.id==='RN-TEST')!.status).toBe('confirmed');});
 it('requires every checklist item and acceptance before starting a rental',()=>{const {data}=setup();const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'one');startInspection(data,i.id,0);const w=work(data);w.accepted=false;expect(()=>saveInspection(data,i.id,1,w,true)).toThrow('persetujuan');w.accepted=true;const completed=saveInspection(data,i.id,1,w,true);expect(completed.status).toBe('completed');expect(data.bookings.find(b=>b.id==='RN-TEST')!.status).toBe('running');});
 it('returns a damaged rental to maintenance, compares mileage and requires repair resolution before ready',()=>{const {data,unit}=setup();checkout(data);const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkin',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'return');startInspection(data,i.id,0);expect(()=>saveInspection(data,i.id,1,work(data,109),true)).toThrow('Kilometer');const w=work(data,150);w.checklist.body='damaged' as 'good';w.damages=[{id:'damage1',area:'body',description:'Bodi penyok',severity:'major',estimatedCost:600000,requiresRepair:true}];const returned=saveInspection(data,i.id,1,w,true);expect(data.bookings.find(b=>b.id==='RN-TEST')!.status).toBe('returned');expect(unit.condition).toBe('maintenance');expect(()=>saveUnit(data,{...unitInput(),mileage:150},unit.id,unit.revision!)).toThrow('perbaikan');const m=saveMaintenance(data,{...maintenanceInput(unit.id),start:'2026-11-01T01:30:00Z',end:'2026-11-01T05:00:00Z',inspectionId:returned.id,damageIds:['damage1']});transitionMaintenance(data,m.id,m.revision,'start',{});expect(()=>transitionMaintenance(data,m.id,m.revision,'complete',{actualCost:500000,returnCondition:'ready',resolveDamage:false})).toThrow('temuan');transitionMaintenance(data,m.id,m.revision,'complete',{actualCost:500000,returnCondition:'ready',resolveDamage:true});expect(allInspections(data).find(x=>x.id===returned.id)!.damages[0].resolved).toBe(true);expect(unit.condition).toBe('ready');expect(available(data,unit,'2026-11-10','2026-11-11')).toBe(true);});
 it('requires an explicit missing baseline reason for legacy running rentals',()=>{const d=makeSeed(),b=d.bookings[0];const i=scheduleInspection(d,{bookingId:b.id,type:'checkin',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'legacy');startInspection(d,i.id,0);const w=work(d);expect(()=>saveInspection(d,i.id,1,w,true)).toThrow('baseline');w.baselineMissingReason='Rental sudah berjalan sebelum modul inspeksi tersedia';expect(saveInspection(d,i.id,1,w,true).status).toBe('completed');});
 it('completes checkout and return without any photos and uses the photo-free checkout as a baseline',()=>{
  const {data}=setup();const out=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'no-photo-out');startInspection(data,out.id,0);
  const w={...work(data),photos:[]};const done=saveInspection(data,out.id,1,w,true);expect(done.photos).toEqual([]);expect(data.bookings.find(b=>b.id==='RN-TEST')!.status).toBe('running');
  const back=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkin',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'no-photo-return');startInspection(data,back.id,0);
  expect(saveInspection(data,back.id,1,{...w,mileage:150},true).status).toBe('completed');expect(data.bookings.find(b=>b.id==='RN-TEST')!.status).toBe('returned');expect(data.units.find(u=>u.id===back.unitId)!.condition).toBe('ready');expect(available(data,data.units.find(u=>u.id===back.unitId)!,'2026-11-03','2026-11-04')).toBe(true);
 });
 it('keeps multiple images on each finding, including separate findings on the same side, after save and reload',()=>{
  const {data}=setup();const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'finding-photos');startInspection(data,i.id,0);
  const w=work(data);const finding={id:'finding-left',side:'left' as const,area:'body',description:'Goresan pintu kiri',severity:'minor' as const,estimatedCost:0,requiresRepair:false,photos:['photo-front','photo-rear']};
  const input=inspectionWorkSchema.parse({...w,photos:[],damages:[finding,{...finding,id:'finding-left-2',photos:['photo-left']},{...finding,id:'finding-right',side:'right',photos:[]}]});
  const draft=saveInspection(data,i.id,1,input,false);const reloaded=JSON.parse(JSON.stringify(data)) as DashboardData;
  expect(reloaded.inspections!.find(x=>x.id===draft.id)!.damages).toEqual(draft.damages);expect(draft.damages[0].photos).toHaveLength(2);expect(draft.damages[0].side).toBe('left');expect(draft.damages[2].photos).toEqual([]);
  expect(saveInspection(reloaded,i.id,draft.revision,input,true).damages[0].photos).toEqual(finding.photos);
 });
 it('rejects unknown, non-image and duplicate finding photos before changing inspection or booking',()=>{
  const {data}=setup();const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'invalid-evidence');startInspection(data,i.id,0);const w=work(data);
  data.assets!.push({id:'pdf',name:'note.pdf',mime:'application/pdf',size:100,createdAt:new Date().toISOString()});
  for(const photos of [['missing'],['pdf'],['photo-front','photo-front']]){
   const before=structuredClone(data);expect(()=>saveInspection(data,i.id,1,{...w,damages:[{id:'finding',area:'body',description:'Goresan',severity:'minor',estimatedCost:0,requiresRepair:false,photos}]},true)).toThrow();expect(data).toEqual(before);
  }
 });
 it('validates side and photo count while accepting legacy findings without new fields',()=>{
  const {data}=setup(),w=work(data),finding={id:'old-finding',area:'body',description:'Catatan lama',severity:'minor',estimatedCost:0,requiresRepair:false};
  expect(inspectionWorkSchema.safeParse({...w,damages:[finding]}).success).toBe(true);
  expect(inspectionWorkSchema.safeParse({...w,damages:[{...finding,side:'roof'}]}).success).toBe(false);
  expect(inspectionWorkSchema.safeParse({...w,damages:[{...finding,photos:Array.from({length:11},(_,i)=>'photo-'+i)}]}).success).toBe(false);
 });
 it('retains incomplete drafts without changing the booking state',()=>{const {data}=setup();const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkout',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'draft');startInspection(data,i.id,0);const w=work(data);w.photos=[];w.accepted=false;const draft=saveInspection(data,i.id,1,w,false);expect(draft.revision).toBe(2);expect(draft.status).toBe('in_progress');expect(data.bookings.find(b=>b.id==='RN-TEST')!.status).toBe('confirmed');});
});

describe('Fleet reminders',()=>{
 it('keeps read state on current reminders and removes outdated expiry notices',async()=>{const {syncFleetReminders}=await import('../src/lib/fleet-reminders');const d=makeSeed();d.units[0].documents=[{id:'doc-test',type:'STNK',number:'1',expiresOn:'2026-10-31',assetId:''}];syncFleetReminders(d);const n=d.notifications.find(n=>n.id.startsWith('DOC:'))!;expect(n.title).toContain('kedaluwarsa');n.read=true;syncFleetReminders(d);expect(d.notifications.filter(n=>n.id.startsWith('DOC:'))).toHaveLength(1);expect(d.notifications.find(current=>current.id===n.id)?.read).toBe(true);d.units[0].documents[0].expiresOn='2028-01-01';syncFleetReminders(d);expect(d.notifications.some(n=>n.id.startsWith('DOC:'))).toBe(false);});
 it('rejects impossible calendar dates in vehicle documents',async()=>{const {unitSchema}=await import('../src/lib/fleet-schema');const invalid={...unitInput(),documents:[{id:'d',type:'STNK',number:'1',expiresOn:'2026-02-31',assetId:''}]};expect(unitSchema.safeParse(invalid).success).toBe(false);});
});

describe('Fleet request retries',()=>{
 it('does not silently replay a vehicle create after form data changed',()=>{const d=makeSeed();const input=unitInput();const u=saveUnit(d,input,undefined,0,'unit-request');expect(saveUnit(d,input,undefined,0,'unit-request').id).toBe(u.id);expect(()=>saveUnit(d,{...input,rate:900000},undefined,0,'unit-request')).toThrow('data berbeda');});
 it('reuses one maintenance schedule for an identical retry and rejects changed payloads',()=>{const d=makeSeed();const input=maintenanceInput();const m=saveMaintenance(d,input,undefined,0,'job-request');expect(saveMaintenance(d,input,undefined,0,'job-request').id).toBe(m.id);expect(()=>saveMaintenance(d,{...input,title:'Changed'},undefined,0,'job-request')).toThrow('data berbeda');expect(d.maintenance).toHaveLength(1);});
});

describe('Retired vehicle condition migration',()=>{
 it('upgrades legacy preparation to ready while preserving repair and archive blocks',()=>{
  const d=makeSeed();d.bookings=[];d.inspections=[];d.maintenance=[];
  for(const u of d.units.slice(0,3))(u as unknown as {condition:string}).condition='preparation';
  d.units[2].archivedAt=new Date().toISOString();
  d.inspections.push({id:'legacy-damage',unitId:d.units[1].id,status:'completed',damages:[{id:'d1',requiresRepair:true,resolved:false}]} as never);
  normalizeFleetConditions(d);expect(d.units[0].condition).toBe('ready');expect(d.units[1].condition).toBe('maintenance');expect(d.units[2].condition).toBe('inactive');
  const first=structuredClone(d);normalizeFleetConditions(d);expect(d).toEqual(first);
 });
 it('keeps clean check-in blocked by an existing unfinished repair',()=>{
  const {data,unit}=setup();checkout(data);data.inspections!.push({id:'old-repair',unitId:unit.id,status:'completed',damages:[{id:'old',requiresRepair:true,resolved:false}]} as never);
  const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkin',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'blocked-return');startInspection(data,i.id,0);saveInspection(data,i.id,1,work(data,150),true);expect(unit.condition).toBe('maintenance');expect(available(data,unit,'2026-11-03','2026-11-04')).toBe(false);
 });
 it('keeps clean check-in blocked by maintenance already in progress',()=>{
  const {data,unit}=setup();checkout(data);data.maintenance=[{...maintenanceInput(unit.id),id:'ongoing',status:'in_progress',revision:0,history:[],createdAt:new Date().toISOString()}];
  const i=scheduleInspection(data,{bookingId:'RN-TEST',type:'checkin',scheduledAt:new Date().toISOString(),inspector:'Test',notes:''},'maintenance-return');startInspection(data,i.id,0);saveInspection(data,i.id,1,work(data,150),true);expect(unit.condition).toBe('maintenance');expect(available(data,unit,'2026-11-03','2026-11-04')).toBe(false);
 });
});
