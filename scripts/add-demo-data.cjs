/** Local explicit import. Uses existing business services without exposing a seed API. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ts=require('typescript');
require.extensions['.ts']=(module,filename)=>{const text=fs.readFileSync(filename,'utf8');module._compile(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);};
const {addDemoData,demoCollections}=require('../src/lib/demo-data.ts');
const file=process.env.TRAVELOS_DATA_FILE||path.join(__dirname,'../.local-data/dashboard.json');
const raw=fs.readFileSync(file,'utf8'),original=JSON.parse(raw),{data,added}=addDemoData(original);
const counts=Object.fromEntries(demoCollections.map(k=>[k,{before:(original[k]||[]).length,after:(data[k]||[]).length}]));
if(!added){console.log('Data Demo sudah ditambahkan sebelumnya. Tidak ada duplikasi.');process.exit(0);}
// Check every original record before any write; logs never expose customer data.
for(const key of Object.keys(original))if(Array.isArray(original[key]))for(const record of original[key]){
 const kept=data[key]?.find(r=>r.id===record.id);if(JSON.stringify(kept)!==JSON.stringify(record))throw Error('Import akan mengubah data sebelumnya: '+key);
}
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'preview',counts},null,2));
if(!process.argv.includes('--apply')){console.log('Preview saja; tambahkan --apply untuk menyimpan. Hentikan server selama penulisan.');process.exit(0);}
if(fs.readFileSync(file,'utf8')!==raw)throw Error('Data berubah selama proses. Jalankan ulang setelah menghentikan server.');
const temporary=file+'.demo-'+crypto.randomUUID()+'.tmp';
try{fs.writeFileSync(temporary,JSON.stringify(data,null,2),'utf8');fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log('10 item Demo per modul berhasil ditambahkan. Tidak membuat file backup.');
