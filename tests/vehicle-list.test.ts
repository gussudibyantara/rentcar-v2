import {afterEach,describe,it,expect,vi} from 'vitest';
import {makeEmptyData} from '../src/lib/empty-data';
import {vehicleMatchesStatus,vehicleStatCounts,vehicleOwnerLabel,vehicleOwnerIdentity} from '../src/lib/vehicle-list';
import type {Unit,Booking} from '../src/lib/types';
afterEach(()=>vi.useRealTimers());
const from='2026-11-14T00:00:00+08:00',to='2026-11-15T00:00:00+08:00';
function unit(id:string,condition:Unit['condition']='ready'):Unit{return {id,name:'Toyota Avanza',plate:id,category:'Mobil',branch:'',owner:'Armada sendiri',ownership:'owned',rate:350000,condition,color:''};}
function booking(id:string,unitId:string,status:Booking['status'],start='2026-11-13T01:00:00Z',end='2026-11-14T01:00:00Z'):Booking{return {id,unitId,status,start,end,customerId:'C1',total:350000,paid:0,pic:'Petugas',notes:'',createdAt:start};}
describe('vehicle status shortcuts',()=>{
 it('keeps KPI membership identical to list results, including overdue rentals, archive and active rental states',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-14T02:00:00Z'));const d=makeEmptyData();d.units=[unit('ready'),unit('rented'),unit('reserved'),unit('maintenance','maintenance'),unit('overdue'),unit('inactive','inactive'),{...unit('archived'),archivedAt:from}];
  d.bookings=[booking('B1','rented','running'),booking('B2','overdue','running'),booking('B3','archived','running'),booking('B4','reserved','confirmed',from,to)];
  const counts=vehicleStatCounts(d,from,to);expect(counts).toEqual({all:6,available:1,running:2,maintenance:1});
  for(const status of Object.keys(counts))expect(d.units.filter(u=>vehicleMatchesStatus(d,u,status,from,to))).toHaveLength(counts[status]);
  expect(d.units.filter(u=>vehicleMatchesStatus(d,u,'running',from,to)).map(u=>u.id)).toEqual(['rented','overdue']);expect(d.units.filter(u=>vehicleMatchesStatus(d,u,'archived',from,to)).map(u=>u.id)).toEqual(['archived']);
 });
 it('uses Armada Sendiri only for owned units and keeps partner identities',()=>{
  expect(vehicleOwnerLabel(unit('own'))).toBe('Armada Sendiri');expect(vehicleOwnerLabel({...unit('legacy'),ownership:undefined})).toBe('Armada Sendiri');expect(vehicleOwnerLabel({...unit('partner'),ownership:'partner',owner:'Dede Rama'})).toBe('Dede Rama');
 });
});

describe('Vehicle owner identity',()=>{
 it('uses the registered partner name and explicit kind instead of an outdated vehicle owner snapshot',()=>{
  const d=makeEmptyData();d.partners=[{id:'partner',name:'Mitra Transport',kind:'company',phone:'',email:'',address:'',bank:'',notes:'',revision:1,createdAt:from}];
  expect(vehicleOwnerIdentity(d,{...unit('u'),ownership:'partner',partnerId:'partner',owner:'Nama lama'})).toEqual({label:'Mitra Transport',kind:'company'});
  d.partners[0].kind='individual';d.partners[0].name='Azis Maliek';expect(vehicleOwnerIdentity(d,{...unit('u'),ownership:'partner',partnerId:'partner'})).toEqual({label:'Azis Maliek',kind:'individual'});
  expect(vehicleOwnerIdentity(d,unit('own'))).toEqual({label:'Armada Sendiri',kind:'owned'});
  expect(vehicleOwnerIdentity(d,{...unit('legacy'),ownership:'partner',owner:'PT Mitra Uji'}).kind).toBe('company');
 });
});
