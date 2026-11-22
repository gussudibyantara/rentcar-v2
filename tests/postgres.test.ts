import {PGlite} from '@electric-sql/pglite';
import {beforeAll,afterAll,afterEach,describe,it,expect} from 'vitest';
import {migrateDatabase,readWorkspace,mutateWorkspace,importWorkspace,validateSnapshot} from '../src/lib/db/storage.cjs';
import {createUser,resetUserPassword,login,sessionUser,signout} from '../src/lib/db/auth.cjs';
import {hashPassword,verifyPassword,hashToken} from '../src/lib/db/security.cjs';
import {makeEmptyData} from '../src/lib/empty-data';
import type {DashboardData} from '../src/lib/types';
import {saveProfile,saveSettings,changeBilling,accountView} from '../src/lib/account-service';
import {saveUnit} from '../src/lib/fleet-service';
import {unitSchema} from '../src/lib/fleet-schema';
const db=new PGlite();
const query=async(text:string,values?:unknown[])=>{if(!values){const all=await db.exec(text),last=all.at(-1);return {rows:last?.rows||[],rowCount:last?.affectedRows};}const result=await db.query(text,values);return {rows:result.rows,rowCount:result.affectedRows};};
const pool={query,connect:async()=>({query,release:()=>{}})};
beforeAll(async()=>{await db.waitReady;await migrateDatabase(pool);},30000);
afterAll(async()=>{await db.close();});
afterEach(async()=>{await query('DELETE FROM travelos_login_limits');});
describe('PostgreSQL business storage',()=>{
 it('round-trips motorcycle fields and equipment through PostgreSQL JSONB without another schema migration',async()=>{
  await mutateWorkspace(pool,'motor-sql',(d:DashboardData)=>{saveUnit(d,unitSchema.parse({name:'Motor SQL',plate:'QA SQL MOTOR',brand:'Honda',model:'Vario',year:2024,category:'Motor',owner:'Armada sendiri',ownership:'owned',rate:150000,weeklyRate:0,monthlyRate:0,deposit:0,mileage:100,operatingHours:0,condition:'ready',notes:'',photoId:'',documents:[],motorcycleType:'matic',transmission:'automatic',engineCC:160,vehicleColor:'Hitam',equipment:{helmets:2,raincoats:1,spareKey:true,extras:[]}}));});
  const d=await readWorkspace(pool,'motor-sql');expect(d.units[0]).toMatchObject({category:'Motor',engineCC:160,vehicleColor:'Hitam',equipment:{helmets:2,raincoats:1,spareKey:true,extras:[]}});
 });
 it('persists new profile, settings and subscription requests in PostgreSQL JSONB',async()=>{
  const identity={id:'profile-owner',name:'Pemilik Uji',email:'owner@example.invalid',provider:'native' as const};
  await mutateWorkspace(pool,'account-sql',(data:DashboardData)=>{
   saveProfile(data,identity,{name:'Owner SQL',phone:'+6288712345678',position:'Owner'},0);
   saveSettings(data,{name:'Rental SQL',phone:'',email:'billing@example.invalid',address:'Alamat uji',paymentInstructions:'Instruksi uji'},0);
   changeBilling(data,{action:'order',revision:0,requestId:'10000000-0000-4000-8000-000000000001',plan:'pro',months:6});
  });
  const stored=await readWorkspace(pool,'account-sql');const view=accountView(stored,identity);
  expect(view.profile.name).toBe('Owner SQL');expect(view.settings.name).toBe('Rental SQL');expect(view.billing.orders[0].amount).toBe(1254000);expect(view.active.plan).toBe('free');expect(stored.bookings).toEqual([]);
 });
 it('migrates idempotently and creates a genuine PostgreSQL workspace and queryable SQL views',async()=>{
  await migrateDatabase(pool);const d=await readWorkspace(pool,'sql-test');expect(d.version).toBe(1);
  await mutateWorkspace(pool,'sql-test',(data:DashboardData)=>{data.units.push({id:'U-SQL',name:'Unit uji',plate:'DR TEST',category:'Mobil',branch:'Legacy',owner:'Armada sendiri',rate:350000,condition:'ready',color:''});});
  const rows=await query('SELECT id,name,plate FROM travelos_vehicles WHERE workspace_id=$1',['sql-test']);expect(rows.rows).toEqual([{id:'U-SQL',name:'Unit uji',plate:'DR TEST'}]);expect((await readWorkspace(pool,'sql-test')).units).toHaveLength(1);
 });
 it('rolls back failed business mutations and isolates explicitly selected workspaces',async()=>{
  const before=await readWorkspace(pool,'sql-test');await expect(mutateWorkspace(pool,'sql-test',(data:DashboardData)=>{data.units=[];throw Error('business validation');})).rejects.toThrow('business validation');expect(await readWorkspace(pool,'sql-test')).toEqual(before);expect((await readWorkspace(pool,'other-workspace')).units).toEqual([]);
 });
 it('imports exactly once, retains snapshots and legacy metadata, and refuses to overwrite non-empty targets',async()=>{
  const source={...makeEmptyData(),branches:[{id:'legacy',name:'Historical',code:'',address:'',city:'',phone:'',email:'',managerId:'',notes:'',revision:0,createdAt:''}]};
  expect(await importWorkspace(pool,'import-test',source,'a'.repeat(64))).toBe(true);expect(await readWorkspace(pool,'import-test')).toEqual(source);
  await mutateWorkspace(pool,'import-test',(data:DashboardData)=>{data.referenceDate='2026-12-01';});expect(await importWorkspace(pool,'import-test',source,'a'.repeat(64))).toBe(false);expect((await readWorkspace(pool,'import-test')).referenceDate).toBe('2026-12-01');
  await expect(importWorkspace(pool,'import-test',source,'b'.repeat(64))).rejects.toThrow('tidak kosong');
 });
 it('does not commit imported metadata when attachment preparation fails',async()=>{
  await expect(importWorkspace(pool,'failed-import',makeEmptyData(),'c'.repeat(64),async()=>{throw Error('disk failure');})).rejects.toThrow('disk failure');const markers=await query('SELECT * FROM travelos_imports WHERE workspace_id=$1',['failed-import']);expect(markers.rows).toEqual([]);expect((await readWorkspace(pool,'failed-import')).units).toEqual([]);
 });
 it('rejects malformed arrays and duplicate record IDs before storing them',()=>{
  const data=makeEmptyData();expect(()=>validateSnapshot({...data,bookings:'bad'})).toThrow();expect(()=>validateSnapshot({...data,assets:[{id:'duplicate'},{id:'duplicate'}]})).toThrow('duplikat');
 });
});
describe('native PostgreSQL authentication',()=>{
 const password='Correct-password-123!';
 it('uses salted scrypt hashes and refuses incorrect or malformed credentials',async()=>{
  const hash=await hashPassword(password);expect(hash).not.toContain(password);expect(await verifyPassword(password,hash)).toBe(true);expect(await verifyPassword('wrong',hash)).toBe(false);expect(await verifyPassword(password,'bad-hash')).toBe(false);expect(await hashPassword(password)).not.toBe(hash);
 });
 it('authenticates only a provisioned user in the configured workspace and stores token hashes',async()=>{
  await createUser(pool,'native','Owner@Example.invalid','Pemilik Uji',password);expect(await login(pool,'native','owner@example.invalid','wrong')).toBeNull();expect(await login(pool,'other-workspace','owner@example.invalid',password)).toBeNull();const result=await login(pool,'native','owner@example.invalid',password);expect(result?.user.name).toBe('Pemilik Uji');
  expect(await sessionUser(pool,'native',result!.token)).toMatchObject({email:'owner@example.invalid'});expect(await sessionUser(pool,'other-workspace',result!.token)).toBeNull();expect(await sessionUser(pool,'native','forged-cookie')).toBeNull();
  const stored=await query('SELECT token_hash FROM travelos_auth_sessions WHERE token_hash=$1',[hashToken(result!.token)]);expect(stored.rows).toEqual([{token_hash:hashToken(result!.token)}]);await signout(pool,result!.token);expect(await sessionUser(pool,'native',result!.token)).toBeNull();
 });
 it('revokes sessions on password reset, enforces expiry and rejects disabled users',async()=>{
  await createUser(pool,'reset-test','reset@example.invalid','Pemilik Uji',password);const first=await login(pool,'reset-test','reset@example.invalid',password);await resetUserPassword(pool,'reset-test','reset@example.invalid','New-password-456!');expect(await sessionUser(pool,'reset-test',first!.token)).toBeNull();expect(await login(pool,'reset-test','reset@example.invalid',password)).toBeNull();
  const next=await login(pool,'reset-test','reset@example.invalid','New-password-456!');await query("UPDATE travelos_auth_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[hashToken(next!.token)]);expect(await sessionUser(pool,'reset-test',next!.token)).toBeNull();await query('UPDATE travelos_auth_users SET active=false WHERE email=$1',['reset@example.invalid']);expect(await login(pool,'reset-test','reset@example.invalid','New-password-456!')).toBeNull();
 });
 it('rate-limits attempts through shared PostgreSQL state',async()=>{
  for(let i=0;i<10;i++)expect(await login(pool,'limit-test','unknown@example.invalid','wrong')).toBeNull();await expect(login(pool,'limit-test','unknown@example.invalid','wrong')).rejects.toMatchObject({status:429});
 });
});
