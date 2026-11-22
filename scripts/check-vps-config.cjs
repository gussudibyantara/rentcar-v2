const {getPool}=require('../src/lib/db/connection.cjs');
const {assertRuntimeDatabase}=require('../src/lib/db/runtime-check.cjs');
(async()=>{
 if(!process.env.DATABASE_URL?.startsWith('postgres'))throw Error('DATABASE_URL belum diisi.');
 const url=new URL(process.env.APP_URL||'');if(!['http:','https:'].includes(url.protocol)||url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('APP_URL harus HTTPS.');
 if(process.env.TRAVELOS_AUTH_PROVIDER!=='postgres')throw Error('Gunakan TRAVELOS_AUTH_PROVIDER=postgres.');
 if(process.env.TRAVELOS_LOCAL_PREVIEW==='1')throw Error('Matikan TRAVELOS_LOCAL_PREVIEW untuk deployment.');
 if(!process.env.TRAVELOS_UPLOAD_DIR?.startsWith('/'))throw Error('Isi path absolut TRAVELOS_UPLOAD_DIR.');
 if(!['0','1'].includes(process.env.TRAVELOS_ALLOW_SIGNUP||'0'))throw Error('TRAVELOS_ALLOW_SIGNUP harus 0 atau 1.');
 const pool=getPool();try{await assertRuntimeDatabase(pool);}finally{await pool.end();}
 console.log('Konfigurasi VPS dan role database siap.');
})().catch(error=>{console.error(error.code?'Pemeriksaan database gagal. Periksa koneksi dan migrasi.':error.message||'Konfigurasi VPS belum lengkap.');process.exitCode=1;});
