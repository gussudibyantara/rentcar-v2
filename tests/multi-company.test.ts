import {PGlite} from '@electric-sql/pglite';
import {AsyncLocalStorage} from 'node:async_hooks';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:context.getStore()?.token}),set:(_name:string,value:string)=>{const ctx=context.getStore();if(ctx)ctx.token=value;}})}));
vi.mock('../src/lib/db/connection.cjs',()=>({getPool:()=>pool,workspaceId:()=> 'wrong-global-workspace'}));
import {migrateDatabase,readWorkspace,mutateWorkspace,workspaceTransaction} from '../src/lib/db/storage.cjs';
import {assertRuntimeDatabase} from '../src/lib/db/runtime-check.cjs';
import {registerCompany,login,sessionUser} from '../src/lib/db/auth.cjs';
import {readDashboard,mutate,uploadDirectory,readAssetBytes} from '../src/lib/store';
import {POST as authPost} from '../src/app/api/auth/[action]/route';
import {GET as dashboardGet} from '../src/app/api/dashboard/route';
import {GET as accountGet,PATCH as accountPatch} from '../src/app/api/account/route';
import {PATCH as unitPatch} from '../src/app/api/units/[id]/route';
import {POST as filePost} from '../src/app/api/files/route';
import {GET as fileGet} from '../src/app/api/files/[id]/route';
import type {DashboardData,Unit} from '../src/lib/types';
const context=new AsyncLocalStorage<{token?:string}>();
const db=new PGlite();
const query=async(sql:string,values?:unknown[])=>{if(!values){const results=await db.exec(sql),r=results.at(-1);return {rows:r?.rows||[],rowCount:r?.affectedRows};}const r=await db.query(sql,values);return {rows:r.rows,rowCount:r.affectedRows};};
let queue=Promise.resolve();
const pool={query,connect:async()=>{let release!:()=>void;const previous=queue;queue=new Promise<void>(r=>{release=r;});await previous;return {query,release};}};
const password='Tenant-test-password-123!';
let a:Awaited<ReturnType<typeof registerCompany>>,b:Awaited<ReturnType<typeof registerCompany>>,folder:string;
const inAccount=<T>(token:string,fn:()=>T)=>context.run({token},fn);
const request=(url:string,body:unknown)=>new Request('http://localhost:3002'+url,{method:'PATCH',headers:{origin:'http://localhost:3002','Content-Type':'application/json'},body:JSON.stringify(body)});
const unit=(id:string,name:string):Unit=>({id,name,plate:id,category:'Mobil',branch:'',owner:'Armada sendiri',rate:350000,condition:'ready',color:''});
beforeAll(async()=>{
 vi.stubEnv('NODE_ENV','test');vi.stubEnv('DATABASE_URL','postgresql://test-only');vi.stubEnv('TRAVELOS_AUTH_PROVIDER','postgres');vi.stubEnv('TRAVELOS_ALLOW_SIGNUP','1');vi.stubEnv('TRAVELOS_WORKSPACE_ID','wrong-global-workspace');vi.stubEnv('APP_URL','http://localhost:3002');vi.stubEnv('TRAVELOS_TRUST_PROXY','1');
 folder=await mkdtemp('/private/tmp/travelos-tenants-');vi.stubEnv('TRAVELOS_UPLOAD_DIR',folder);
 await db.waitReady;await query('CREATE ROLE travelos_app NOLOGIN');await migrateDatabase(pool);await query('SET ROLE travelos_app');
 a=await registerCompany(pool,{name:'Owner A',companyName:'Rental A',email:'a@example.invalid',phone:'+6288712345678',password},'test-a');
 b=await registerCompany(pool,{name:'Owner B',companyName:'Rental B',email:'b@example.invalid',phone:'+6288712345679',password},'test-b');
},30000);
afterAll(async()=>{vi.unstubAllEnvs();await db.close();await rm(folder,{recursive:true,force:true});});
describe('automatic company registration and request isolation',()=>{
 it('creates distinct empty workspaces with company settings and owner profiles atomically',async()=>{
  expect(a.user.workspaceId).not.toBe(b.user.workspaceId);
  for(const [account,label] of [[a,'Rental A'],[b,'Rental B']] as const){const d=await readWorkspace(pool,account.user.workspaceId);expect(d.units).toEqual([]);expect(d.bookings).toEqual([]);expect(d.workspaceSettings?.name).toBe(label);expect(Object.keys(d.accountProfiles||{})).toEqual([account.user.id]);}
 });
 it('resolves the workspace from login/session without a shared environment tenant',async()=>{
  const result=await login(pool,null,'a@example.invalid',password,'login-a');expect(result?.user.workspaceId).toBe(a.user.workspaceId);
  expect((await sessionUser(pool,null,a.token))?.workspaceId).toBe(a.user.workspaceId);expect(await sessionUser(pool,b.user.workspaceId,a.token)).toBeNull();
 });
 it('keeps reads isolated across concurrent requests, even when local record IDs collide',async()=>{
  await inAccount(a.token,()=>mutate(d=>{d.units.push(unit('SAME-ID','Avanza A'),unit('ONLY-A','Mobil A'));}));
  await inAccount(b.token,()=>mutate(d=>{d.units.push(unit('SAME-ID','Avanza B'),unit('ONLY-B','Mobil B'));}));
  const [da,dbb]=await Promise.all([inAccount(a.token,readDashboard),inAccount(b.token,readDashboard)]);
  expect(da.units.map(u=>u.name)).toEqual(['Avanza A','Mobil A']);expect(dbb.units.map(u=>u.name)).toEqual(['Avanza B','Mobil B']);
 });
 it('returns dashboard data only from the verified session tenant',async()=>{
  const response=await inAccount(b.token,()=>dashboardGet());const d=await response.json();expect(d.units.some((u:Unit)=>u.id==='ONLY-A')).toBe(false);expect(d.runtime.user.name).toBe('Owner B');expect(d.accountProfiles).toBeUndefined();
 });
 it('refuses editing another company vehicle by ID through the real API',async()=>{
  const response=await inAccount(b.token,()=>unitPatch(request('/api/units/ONLY-A?workspace='+a.user.workspaceId,{action:'archive',revision:0,workspaceId:a.user.workspaceId}),{params:Promise.resolve({id:'ONLY-A'})}));expect(response.status).toBe(404);
  expect((await inAccount(a.token,readDashboard)).units.find(u=>u.id==='ONLY-A')?.archivedAt).toBeUndefined();
 });
 it('keeps billing, profile and settings scoped, and rejects workspace selection in payloads',async()=>{
  const response=await inAccount(a.token,()=>accountPatch(request('/api/account',{section:'billing',input:{action:'order',revision:0,requestId:'10000000-0000-4000-8000-000000000001',plan:'pro',months:6}})));expect(response.status).toBe(200);
  const av=await (await inAccount(a.token,accountGet)).json(),bv=await (await inAccount(b.token,accountGet)).json();expect(av.billing.orders).toHaveLength(1);expect(bv.billing.orders).toHaveLength(0);expect(bv.settings.name).toBe('Rental B');expect(bv.profile.name).toBe('Owner B');
  const forged=await inAccount(b.token,()=>accountPatch(request('/api/account',{section:'billing',workspaceId:a.user.workspaceId,input:{action:'order',revision:0,requestId:'20000000-0000-4000-8000-000000000002',plan:'business',months:12}})));expect(forged.status).toBe(400);
 });
 it('uploads into a tenant directory and refuses the other tenant asset URL',async()=>{
  const form=new FormData();form.set('file',new File([new Uint8Array([137,80,78,71,13,10,26,10])],'test.png',{type:'image/png'}));
  const response=await inAccount(a.token,()=>filePost(new Request('http://localhost:3002/api/files',{method:'POST',headers:{origin:'http://localhost:3002'},body:form})));expect(response.status).toBe(201);const {asset}=await response.json();
  expect((await readFile(path.join(folder,'workspaces',a.user.workspaceId,asset.id))).length).toBe(8);
  const own=await inAccount(a.token,()=>fileGet(new Request('http://localhost/file'),{params:Promise.resolve({id:asset.id})}));expect(own.status).toBe(200);
  const other=await inAccount(b.token,()=>fileGet(new Request('http://localhost/file?workspace='+a.user.workspaceId),{params:Promise.resolve({id:asset.id})}));expect(other.status).toBe(404);
  expect(await inAccount(b.token,uploadDirectory)).toBe(path.join(folder,'workspaces',b.user.workspaceId));
 });
 it('never falls back to legacy shared uploads for a new company',async()=>{
  const id='40000000-0000-4000-8000-000000000004';await writeFile(path.join(folder,id),'legacy tenant file');vi.stubEnv('TRAVELOS_LEGACY_UPLOAD_WORKSPACE',a.user.workspaceId);
  expect((await inAccount(a.token,()=>readAssetBytes(id))).toString()).toBe('legacy tenant file');await expect(inAccount(b.token,()=>readAssetBytes(id))).rejects.toMatchObject({code:'ENOENT'});
 });
 it('creates a company through the signup endpoint and immediately establishes its session',async()=>{
  const ctx:{token?:string}={};const response=await context.run(ctx,()=>authPost(new Request('http://localhost:3002/api/auth/signup',{method:'POST',headers:{origin:'http://localhost:3002','Content-Type':'application/json','x-real-ip':'signup-http'},body:JSON.stringify({name:'Owner C',companyName:'Rental C',email:'c@example.invalid',phone:'+6288712345680',password})}),{params:Promise.resolve({action:'signup'})}));expect(response.status).toBe(201);expect(ctx.token).toBeTruthy();const d=await context.run(ctx,readDashboard);expect(d.workspaceSettings?.name).toBe('Rental C');expect(d.units).toEqual([]);
 });
 it('logs into the account company and clears access on logout through the real auth route',async()=>{
  const ctx:{token?:string}={token:b.token};
  const response=await context.run(ctx,()=>authPost(new Request('http://localhost:3002/api/auth/login',{method:'POST',headers:{origin:'http://localhost:3002','Content-Type':'application/json','x-real-ip':'http-login'},body:JSON.stringify({email:'a@example.invalid',password})}),{params:Promise.resolve({action:'login'})}));expect(response.status).toBe(200);expect((await context.run(ctx,readDashboard)).workspaceSettings?.name).toBe('Rental A');
  const logout=await context.run(ctx,()=>authPost(new Request('http://localhost:3002/api/auth/signout',{method:'POST',headers:{origin:'http://localhost:3002'}}),{params:Promise.resolve({action:'signout'})}));expect(logout.status).toBe(200);await expect(context.run(ctx,readDashboard)).rejects.toMatchObject({status:401});
 });
 it('rate limits signup before creating further companies',async()=>{
  for(let i=0;i<5;i++)await registerCompany(pool,{name:'Rate Owner',companyName:'Rate Rental',email:`rate-${i}@example.invalid`,phone:'+6288712345688',password},'signup-limit');
  await expect(registerCompany(pool,{name:'Rate Owner',companyName:'Rate Rental',email:'rate-blocked@example.invalid',phone:'+6288712345688',password},'signup-limit')).rejects.toMatchObject({status:429});
 });
 it('does not allow a registrant to nominate another workspace or user ID',async()=>{
  const r=await context.run({},()=>authPost(new Request('http://localhost:3002/api/auth/signup',{method:'POST',headers:{origin:'http://localhost:3002','Content-Type':'application/json'},body:JSON.stringify({name:'Owner D',companyName:'Rental D',email:'d@example.invalid',phone:'+6288712345681',password,workspaceId:a.user.workspaceId})}),{params:Promise.resolve({action:'signup'})}));expect(r.status).toBe(400);
 });
 it('rolls back duplicate email registration without leaving an orphan workspace',async()=>{
  await query('RESET ROLE');const before=await query('SELECT count(*)::int AS n FROM travelos_workspaces');await query('SET ROLE travelos_app');
  await expect(registerCompany(pool,{name:'Copy',companyName:'Copy Rental',email:'a@example.invalid',phone:'+6288712345682',password},'duplicate')).rejects.toMatchObject({code:'23505'});
  await query('RESET ROLE');const after=await query('SELECT count(*)::int AS n FROM travelos_workspaces');expect(after.rows).toEqual(before.rows);await query('SET ROLE travelos_app');
 });
 it('can disable public signup without disabling existing login',async()=>{
  vi.stubEnv('TRAVELOS_ALLOW_SIGNUP','0');const r=await context.run({},()=>authPost(new Request('http://localhost:3002/api/auth/signup',{method:'POST',headers:{origin:'http://localhost:3002'},body:'{}'}),{params:Promise.resolve({action:'signup'})}));expect(r.status).toBe(403);expect((await login(pool,null,'a@example.invalid',password,'existing-login'))?.user.id).toBe(a.user.id);vi.stubEnv('TRAVELOS_ALLOW_SIGNUP','1');
 });
});
describe('PostgreSQL RLS as the restricted runtime role',()=>{
 it('accepts the restricted runtime role and rejects an owner/superuser connection',async()=>{await expect(assertRuntimeDatabase(pool)).resolves.toBeUndefined();await query('RESET ROLE');await expect(assertRuntimeDatabase(pool)).rejects.toThrow('non-owner');await query('SET ROLE travelos_app');});
 it('shows no tenant snapshots without transaction-local context',async()=>{expect((await query('SELECT id FROM travelos_workspaces')).rows).toEqual([]);expect((await query('SELECT id FROM travelos_vehicles')).rows).toEqual([]);});
 it('filters snapshots and SQL views, including a forgotten WHERE clause',async()=>{
  await workspaceTransaction(pool,a.user.workspaceId,async (client:{query:typeof query})=>{const workspaces=await client.query('SELECT id FROM travelos_workspaces');expect(workspaces.rows).toEqual([{id:a.user.workspaceId}]);const vehicles=await client.query('SELECT name FROM travelos_vehicles');expect((vehicles.rows as {name:string}[]).map(r=>r.name)).toEqual(['Avanza A','Mobil A']);const update=await client.query('UPDATE travelos_workspaces SET revision=revision+1 WHERE id=$1',[b.user.workspaceId]);expect(update.rowCount).toBe(0);});
 });
 it('rejects an insert into a different tenant and clears context after rollback',async()=>{
  await expect(workspaceTransaction(pool,a.user.workspaceId,async (client:{query:typeof query})=>{await client.query('INSERT INTO travelos_workspaces(id,data) VALUES($1,$2::jsonb)',['forbidden-tenant',JSON.stringify({version:1,bookings:[],units:[],customers:[]})]);})).rejects.toThrow();
  expect((await query('SELECT id FROM travelos_workspaces')).rows).toEqual([]);expect((await readWorkspace(pool,b.user.workspaceId)).workspaceSettings?.name).toBe('Rental B');
 });
});
