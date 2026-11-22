const {Pool}=require('pg');
const key=Symbol.for('travelos.postgres.pool');
function getPool(){
 const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL belum diisi.');
 if(!globalThis[key]||globalThis[key].url!==url){
  const max=Number(process.env.DATABASE_POOL_MAX||5);if(!Number.isInteger(max)||max<1||max>50)throw Error('DATABASE_POOL_MAX tidak valid.');
  const pool=new Pool({connectionString:url,max,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,...(process.env.DATABASE_SSL==='require'?{ssl:{rejectUnauthorized:true}}:{})});
  pool.on('error',()=>console.error('Koneksi PostgreSQL terputus.'));
  globalThis[key]={url,pool};
 }
 return globalThis[key].pool;
}
function workspaceId(){const id=process.env.TRAVELOS_WORKSPACE_ID||'main';if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error('TRAVELOS_WORKSPACE_ID tidak valid.');return id;}
module.exports={getPool,workspaceId};
