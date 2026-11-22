const {randomUUID}=require('node:crypto');const {ensureWorkspace,workspaceTransaction,emptyWorkspace}=require('./storage.cjs');const {hashPassword,verifyPassword,hashToken,newSessionToken}=require('./security.cjs');
const SESSION_SECONDS=7*24*3600;
const dummyHash='scrypt$'+'0'.repeat(32)+'$'+'0'.repeat(128);
function cleanEmail(value){const email=String(value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Email tidak valid.');return email;}
async function createUser(pool,workspace,email,name,password){
 email=cleanEmail(email);name=String(name||'').trim();if(name.length<2||name.length>150)throw Error('Nama harus 2–150 karakter.');const hash=await hashPassword(password);const id=randomUUID();return workspaceTransaction(pool,workspace,async client=>{await ensureWorkspace(client,workspace);await client.query('INSERT INTO travelos_auth_users(id,workspace_id,email,name,password_hash) VALUES($1,$2,$3,$4,$5)',[id,workspace,email,name,hash]);return id;});
}
async function resetUserPassword(pool,workspace,email,password){
 const hash=await hashPassword(password),client=await pool.connect();try{await client.query('BEGIN');const user=await client.query('UPDATE travelos_auth_users SET password_hash=$3 WHERE email=$1 AND workspace_id=$2 RETURNING id',[cleanEmail(email),workspace,hash]);if(!user.rows.length)throw Error('Akun tidak ditemukan pada workspace ini.');await client.query('DELETE FROM travelos_auth_sessions WHERE user_id=$1',[user.rows[0].id]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function consumeLimit(pool,key,limit){
 const window=new Date(Math.floor(Date.now()/900000)*900000).toISOString();const result=await pool.query('INSERT INTO travelos_login_limits(bucket,window_start) VALUES($1,$2) ON CONFLICT(bucket,window_start) DO UPDATE SET attempts=travelos_login_limits.attempts+1 RETURNING attempts',[hashToken(key),window]);return result.rows[0].attempts<=limit;
}
async function login(pool,workspace,email,password,ip='unknown'){
 email=cleanEmail(email);const limits=await Promise.all([consumeLimit(pool,'login:email:'+email,10),consumeLimit(pool,'login:ip:'+ip,100)]);
 if(limits.some(ok=>!ok))throw Object.assign(Error('Terlalu banyak percobaan. Coba lagi setelah 15 menit.'),{status:429});
 await pool.query("DELETE FROM travelos_login_limits WHERE window_start < now()-interval '1 day'");
 const result=await pool.query('SELECT id,workspace_id,email,name,password_hash,active FROM travelos_auth_users WHERE email=$1 AND ($2::text IS NULL OR workspace_id=$2)',[email,workspace]);const user=result.rows[0];
 const valid=await verifyPassword(password,user?.password_hash||dummyHash);if(!valid||!user?.active)return null;
 const client=await pool.connect();try{await client.query('BEGIN');
  // Recheck under lock so password reset/deactivation cannot race session creation.
  const current=await client.query('SELECT password_hash,active FROM travelos_auth_users WHERE id=$1 FOR UPDATE',[user.id]);if(!current.rows[0]?.active||current.rows[0].password_hash!==user.password_hash){await client.query('ROLLBACK');return null;}
  const token=newSessionToken(),expires=new Date(Date.now()+SESSION_SECONDS*1000);await client.query('DELETE FROM travelos_auth_sessions WHERE expires_at<=now()');await client.query('INSERT INTO travelos_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[hashToken(token),user.id,expires.toISOString()]);await client.query('COMMIT');return {token,expires,user:{id:user.id,workspaceId:user.workspace_id,email:user.email,name:user.name}};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function sessionUser(pool,workspace,token){
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const result=await pool.query('SELECT u.id,u.workspace_id,u.email,u.name FROM travelos_auth_sessions s JOIN travelos_auth_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true AND ($2::text IS NULL OR u.workspace_id=$2)',[hashToken(token),workspace]);const u=result.rows[0];return u?{id:u.id,workspaceId:u.workspace_id,email:u.email,name:u.name}:null;
}
async function signout(pool,token){if(token)await pool.query('DELETE FROM travelos_auth_sessions WHERE token_hash=$1',[hashToken(token)]);}
async function registerCompany(pool,input,ip='unknown'){
 const email=cleanEmail(input.email),name=String(input.name||'').trim(),companyName=String(input.companyName||'').trim(),phone=String(input.phone||'');
 if(name.length<2||name.length>150||companyName.length<2||companyName.length>150||!/^\+62[1-9]\d{7,12}$/.test(phone))throw Error('Periksa nama usaha dan kontak pemilik.');
 if(!await consumeLimit(pool,'signup:ip:'+ip,5))throw Object.assign(Error('Terlalu banyak pendaftaran. Coba lagi setelah 15 menit.'),{status:429});
 const passwordHash=await hashPassword(input.password),id=randomUUID(),workspace='rental_'+randomUUID(),token=newSessionToken(),expires=new Date(Date.now()+SESSION_SECONDS*1000);
 const seed=emptyWorkspace();seed.workspaceSettings={name:companyName,phone,email,address:'',paymentInstructions:'',revision:1};seed.accountProfiles={[id]:{name,phone,position:'Owner',revision:1}};
 return workspaceTransaction(pool,workspace,async client=>{
  await ensureWorkspace(client,workspace,seed);
  await client.query('INSERT INTO travelos_auth_users(id,workspace_id,email,name,password_hash) VALUES($1,$2,$3,$4,$5)',[id,workspace,email,name,passwordHash]);
  await client.query('INSERT INTO travelos_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[hashToken(token),id,expires.toISOString()]);
  return {token,expires,user:{id,workspaceId:workspace,email,name}};
 });
}
module.exports={SESSION_SECONDS,createUser,resetUserPassword,login,sessionUser,signout,cleanEmail,registerCompany};
