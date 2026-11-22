import { describe,expect,it } from 'vitest';
import { makeEmptyData } from '../src/lib/empty-data';
import { partnerUnits,unitPartnerId } from '../src/lib/partner-units';
import type { Partner,Unit } from '../src/lib/types';
const partner=(id:string,name:string):Partner=>({id,name,phone:'',email:'',address:'',bank:'',notes:'',revision:1,createdAt:'2026-11-01T00:00:00Z'});
const unit=(id:string,partnerId?:string):Unit=>({id,name:'Kendaraan uji',plate:id,category:'Mobil',branch:'Lombok',owner:'Pemilik uji',ownership:'partner',partnerId,rate:400000,condition:'ready',color:'#fff'});
describe('Partner fleet ownership',()=>{
 it('counts linked vehicles before any payment agreement exists',()=>{
  const d=makeEmptyData();d.partners=[partner('P1','Pemilik uji')];d.units=[unit('U1','P1'),unit('U2','P1')];
  expect(partnerUnits(d,'P1').map(u=>u.id)).toEqual(['U1','U2']);expect(d.partnerAgreements).toEqual([]);
 });
 it('follows reassignment and excludes archived and owned vehicles despite historical agreements',()=>{
  const d=makeEmptyData();d.partners=[partner('P1','Pemilik uji'),partner('P2','Pemilik lain')];const u=unit('U1','P1');d.units=[u,{...unit('U2','P1'),archivedAt:'2026-11-01'},{...unit('U3','P1'),ownership:'owned'}];
  d.partnerAgreements=[{id:'A1',partnerId:'P1',unitId:'U1',type:'daily',rate:200000,shareAfterCosts:false,start:'2026-10-01',end:'2026-10-31',notes:'',createdAt:'2026-10-01'}];
  expect(partnerUnits(d,'P1')).toHaveLength(1);u.partnerId='P2';expect(partnerUnits(d,'P1')).toHaveLength(0);expect(partnerUnits(d,'P2')).toHaveLength(1);
 });
 it('matches legacy owner names only when unambiguous and never overrides a stored identity',()=>{
  const d=makeEmptyData();d.partners=[partner('P1','Pemilik uji')];const u=unit('U1');u.owner='  PEMILIK UJI ';d.units=[u];expect(partnerUnits(d,'P1')).toHaveLength(1);
  d.partners.push(partner('P2','Pemilik uji'));expect(unitPartnerId(d,u)).toBeUndefined();u.partnerId='P2';expect(unitPartnerId(d,u)).toBe('P2');u.partnerId='unknown';expect(unitPartnerId(d,u)).toBeUndefined();
 });
 it('keeps identity stable after a partner rename and handles an empty workspace',()=>{
  const d=makeEmptyData();expect(partnerUnits(d,'P1')).toEqual([]);d.partners=[partner('P1','Nama baru')];d.units=[unit('U1','P1')];expect(partnerUnits(d,'P1')).toHaveLength(1);
 });
});
