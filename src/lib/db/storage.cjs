const {readFile}=require('node:fs/promises');
const path=require('node:path');
const collections=['units','customers','bookings','notifications','activities','assets','maintenance','inspections','expenses','invoices','partners','partnerAgreements','settlements','employees','branches'];
function emptyWorkspace(){const data={version:1,referenceDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())};for(const key of collections)if(key!=='branches')data[key]=[];return data;}
function validateSnapshot(data){
 if(!data||data.version!==1||!Array.isArray(data.bookings)||!Array.isArray(data.units)||!Array.isArray(data.customers))throw Error('Format data workspace tidak didukung.');
 for(const key of collections){if(data[key]!==undefined&&!Array.isArray(data[key]))throw Error('Koleksi workspace tidak valid: '+key);if(Array.isArray(data[key])){const ids=data[key].map(r=>r?.id);if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('ID record tidak valid atau duplikat: '+key);}}
 return data;
}
async function migrateDatabase(pool){
 const client=await pool.connect();try{await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('travelos:schema'))");const sql=await readFile(path.resolve(__dirname,'../../../database/schema.sql'),'utf8');await client.query(sql);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function ensureWorkspace(db,id,seed=emptyWorkspace()){
 validateSnapshot(seed);await db.query('INSERT INTO travelos_workspaces(id,data) VALUES($1,$2::jsonb) ON CONFLICT(id) DO NOTHING',[id,JSON.stringify(seed)]);
}
/** The ID must come from the verified session (or an explicit admin command).
 * Transaction-local context cannot leak when a pooled connection is reused. */
async function workspaceTransaction(pool,id,fn){
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error('Workspace tidak valid.');
 const client=await pool.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('travelos.workspace_id',$1,true)",[id]);const result=await fn(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function readWorkspace(pool,id,seed=emptyWorkspace()){
 return workspaceTransaction(pool,id,async client=>{await ensureWorkspace(client,id,seed);const result=await client.query('SELECT data FROM travelos_workspaces WHERE id=$1',[id]);if(!result.rows.length)throw Error('Workspace tidak ditemukan.');return validateSnapshot(result.rows[0].data);});
}
async function mutateWorkspace(pool,id,fn,seed=emptyWorkspace()){
 return workspaceTransaction(pool,id,async client=>{
  await ensureWorkspace(client,id,seed);
  const result=await client.query('SELECT data FROM travelos_workspaces WHERE id=$1 FOR UPDATE',[id]);
  if(!result.rows.length)throw Error('Workspace tidak ditemukan.');
  const data=validateSnapshot(result.rows[0].data),output=await fn(data);validateSnapshot(data);
  await client.query('UPDATE travelos_workspaces SET data=$2::jsonb,revision=revision+1,updated_at=now() WHERE id=$1',[id,JSON.stringify(data)]);return output;
 });
}
async function importWorkspace(pool,id,data,fingerprint,prepareFiles=async()=>{}){
 validateSnapshot(data);return workspaceTransaction(pool,id,async client=>{
  await ensureWorkspace(client,id);
  const result=await client.query('SELECT data FROM travelos_workspaces WHERE id=$1 FOR UPDATE',[id]);
  const old=await client.query('SELECT fingerprint FROM travelos_imports WHERE workspace_id=$1',[id]);
  if(old.rows[0]?.fingerprint===fingerprint)return false;
  if(old.rows.length||collections.some(key=>(result.rows[0].data[key]||[]).length))throw Error('Workspace tujuan tidak kosong. Import dihentikan agar data tidak tertimpa.');
  await prepareFiles();
  await client.query('UPDATE travelos_workspaces SET data=$2::jsonb,revision=revision+1,updated_at=now() WHERE id=$1',[id,JSON.stringify(data)]);
  await client.query('INSERT INTO travelos_imports(workspace_id,fingerprint) VALUES($1,$2)',[id,fingerprint]);return true;
 });
}
module.exports={collections,emptyWorkspace,validateSnapshot,migrateDatabase,ensureWorkspace,readWorkspace,mutateWorkspace,importWorkspace,workspaceTransaction};
