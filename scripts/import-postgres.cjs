if(!process.env.DATABASE_URL){const {loadEnvConfig}=require('@next/env');loadEnvConfig(process.cwd());}
const fs=require('node:fs/promises'),path=require('node:path'),{constants}=require('node:fs'),{createHash}=require('node:crypto');
const {getPool,workspaceId}=require('../src/lib/db/connection.cjs');const {collections,validateSnapshot,importWorkspace}=require('../src/lib/db/storage.cjs');
const args=process.argv.slice(2),flag=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
(async()=>{
 const source=path.resolve(flag('--source')||'.local-data/dashboard.json'),raw=await fs.readFile(source),data=validateSnapshot(JSON.parse(raw.toString('utf8'))),assets=data.assets||[];
 const from=path.resolve(flag('--uploads')||path.join(path.dirname(source),'uploads')),to=process.env.TRAVELOS_UPLOAD_DIR?path.join(process.env.TRAVELOS_UPLOAD_DIR,'workspaces',workspaceId()):undefined;
 // Preflight reads only; no SQL or destination write until --apply is explicit.
 for(const asset of assets){if(!/^[a-f0-9-]{36}$/.test(asset.id))throw Error('ID lampiran tidak valid.');const file=await fs.stat(path.join(from,asset.id));if(!file.isFile()||file.size!==asset.size)throw Error('Lampiran hilang atau ukurannya berbeda: '+asset.id);}
 console.log(JSON.stringify(Object.fromEntries(collections.filter(k=>Array.isArray(data[k])).map(k=>[k,data[k].length]))));
 if(!args.includes('--apply')){console.log('Preview saja. Tambahkan --apply untuk import; file sumber tidak diubah.');return;}
 if(!to||!path.isAbsolute(to))throw Error('Isi TRAVELOS_UPLOAD_DIR dengan path absolut tujuan lampiran.');
 const pool=getPool();try{
  const changed=await importWorkspace(pool,workspaceId(),data,createHash('sha256').update(raw).digest('hex'),async()=>{
   await fs.mkdir(to,{recursive:true});
   for(const asset of assets){const original=path.join(from,asset.id),target=path.join(to,asset.id);try{await fs.copyFile(original,target,constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;const [a,b]=await Promise.all([fs.readFile(original),fs.readFile(target)]);if(!a.equals(b))throw Error('Lampiran tujuan berbeda. Import dihentikan: '+asset.id);}}
  });console.log(changed?'Import PostgreSQL selesai. Data sumber tetap utuh.':'File ini sudah diimpor. Tidak ada data yang ditimpa.');
 }finally{await pool.end();}
})().catch(error=>{console.error(error.message?.includes('password')||error.code?'Import gagal. Periksa koneksi database, file sumber, dan folder lampiran.':error.message);process.exitCode=1;});
