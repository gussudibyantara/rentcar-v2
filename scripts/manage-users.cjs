if(!process.env.DATABASE_URL){const {loadEnvConfig}=require('@next/env');loadEnvConfig(process.cwd());}
const readline=require('node:readline/promises');const {getPool,workspaceId}=require('../src/lib/db/connection.cjs');const {createUser,resetUserPassword}=require('../src/lib/db/auth.cjs');
const args=process.argv.slice(2),action=args[0],flag=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
function passwordPrompt(){return new Promise((resolve,reject)=>{
 if(!process.stdin.isTTY)return reject(Error('Gunakan --password-stdin untuk input noninteraktif.'));
 let value='';process.stderr.write('Kata sandi (minimal 12 karakter, tidak ditampilkan): ');process.stdin.setRawMode(true);process.stdin.resume();
 const done=()=>{process.stdin.removeListener('data',input);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');};
 const input=chunk=>{for(const char of chunk.toString()){if(char==='\r'||char==='\n'){done();resolve(value);return;}if(char==='\u0003'){done();reject(Error('Dibatalkan.'));return;}if(char==='\u007f'||char==='\b')value=value.slice(0,-1);else value+=char;}};process.stdin.on('data',input);
 });}
(async()=>{
 if(!['create','reset-password'].includes(action))throw Error('Gunakan create atau reset-password, --email EMAIL, dan --name NAMA untuk akun baru.');
 const email=flag('--email'),name=flag('--name');if(!email||action==='create'&&!name)throw Error('Isi --email dan --name (akun baru).');
 let password;if(args.includes('--password-stdin')){let raw='';for await(const chunk of process.stdin)raw+=chunk.toString();password=raw.replace(/\r?\n$/,'');}else password=await passwordPrompt();
 const pool=getPool();try{let target=flag('--workspace')||workspaceId();if(action==='reset-password'&&!flag('--workspace')){const result=await pool.query('SELECT workspace_id FROM travelos_auth_users WHERE email=$1',[email.trim().toLowerCase()]);if(!result.rows.length)throw Error('Akun tidak ditemukan.');target=result.rows[0].workspace_id;}if(!/^[A-Za-z0-9_-]{1,80}$/.test(target))throw Error('ID workspace tidak valid.');if(action==='create')await createUser(pool,target,email,name,password);else await resetUserPassword(pool,target,email,password);console.log(action==='create'?'Akun workspace dibuat.':'Kata sandi diubah dan seluruh sesi akun dicabut.');}finally{password='';await pool.end();}
})().catch(error=>{console.error(error.code==='23505'?'Email sudah digunakan.':error.code?'Operasi akun gagal. Periksa database dan migrasinya.':error.message);process.exitCode=1;});
