import {getPool} from './db/connection.cjs';
import {readWorkspace,mutateWorkspace} from './db/storage.cjs';
import { assertWorkspaceAccess,authorizedWorkspaceId } from './auth/server';
import {normalizeFleetConditions} from './fleet-shared';
import { syncFleetReminders } from './fleet-reminders';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { makeEmptyData } from './empty-data';
import type { DashboardData } from './types';
const shared=globalThis as typeof globalThis & { travelosWriteQueue?: Promise<unknown> };
export function filePath() { return process.env.TRAVELOS_DATA_FILE || path.join(process.cwd(),'.local-data','dashboard.json'); }
export function uploadRoot(){return process.env.TRAVELOS_UPLOAD_DIR||path.join(path.dirname(filePath()),'uploads');}
export async function uploadDirectory(){return process.env.DATABASE_URL?path.join(uploadRoot(),'workspaces',await authorizedWorkspaceId()):uploadRoot();}
export async function readAssetBytes(id:string){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('ID lampiran tidak valid.');
 if(!process.env.DATABASE_URL)return readFile(path.join(uploadRoot(),id));
 const workspace=await authorizedWorkspaceId();
 try{return await readFile(path.join(uploadRoot(),'workspaces',workspace,id));}catch(error){
  // Flat files from an old single-workspace install belong only to its explicit legacy tenant.
  if((error as NodeJS.ErrnoException).code!=='ENOENT'||workspace!==(process.env.TRAVELOS_LEGACY_UPLOAD_WORKSPACE||process.env.TRAVELOS_WORKSPACE_ID||'main'))throw error;
  return readFile(path.join(uploadRoot(),id));
 }
}
function normalize(data:DashboardData){if(data.version!==1||!Array.isArray(data.bookings))throw new Error('Format data tidak didukung.');data.employees||=[];data.partners||=[];data.partnerAgreements||=[];data.settlements||=[];data.invoices||=[];data.expenses||=[];data.assets||=[];data.maintenance||=[];data.inspections||=[];normalizeFleetConditions(data);syncFleetReminders(data);return data;}
function usePostgres(){if(process.env.DATABASE_URL)return true;if(process.env.NODE_ENV==='production'&&process.env.TRAVELOS_LOCAL_PREVIEW!=='1')throw new Error('DATABASE_URL wajib diisi untuk deployment.');return false;}
async function read():Promise<DashboardData> {
 try {const data=JSON.parse(await readFile(filePath(),'utf8')) as DashboardData;if(data.version!==1||!Array.isArray(data.bookings))throw new Error('Format data lokal tidak didukung.');data.employees ||= [];data.partners ||= [];data.partnerAgreements ||= [];data.settlements ||= [];data.invoices ||= [];data.expenses ||= [];data.assets ||= [];data.maintenance ||= [];data.inspections ||= [];normalizeFleetConditions(data);syncFleetReminders(data);return data;}
 catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;const data=makeEmptyData();await persist(data);data.employees ||= [];data.partners ||= [];data.partnerAgreements ||= [];data.settlements ||= [];data.invoices ||= [];data.expenses ||= [];data.assets ||= [];data.maintenance ||= [];data.inspections ||= [];normalizeFleetConditions(data);syncFleetReminders(data);return data;}
}
async function persist(data:DashboardData) { const file=filePath();await mkdir(path.dirname(file),{recursive:true});const tmp=`${file}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(data,null,2),'utf8');await rename(tmp,file); }
export async function mutate<T>(fn:(data:DashboardData)=>T|Promise<T>):Promise<T> {
 await assertWorkspaceAccess();if(usePostgres())return mutateWorkspace(getPool(),await authorizedWorkspaceId(),async (data:DashboardData)=>fn(normalize(data)),makeEmptyData());const previous=shared.travelosWriteQueue||Promise.resolve();
 const result=previous.then(async()=>{const data=await read();const output=await fn(data);await persist(data);return output;});
 shared.travelosWriteQueue=result.catch(()=>{});return result;
}
export async function readDashboard():Promise<DashboardData> { await assertWorkspaceAccess();if(usePostgres())return normalize(await readWorkspace(getPool(),await authorizedWorkspaceId(),makeEmptyData()));const result=(shared.travelosWriteQueue||Promise.resolve()).then(read);shared.travelosWriteQueue=result.catch(()=>{});return result; }
