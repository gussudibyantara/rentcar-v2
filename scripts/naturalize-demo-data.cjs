const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {naturalizeSampleData}=require('../src/lib/natural-sample-data.ts');
const file=process.env.TRAVELOS_DATA_FILE||path.join(__dirname,'../.local-data/dashboard.json'),raw=fs.readFileSync(file,'utf8'),original=JSON.parse(raw),{data,changed}=naturalizeSampleData(original);
if(!changed){console.log('Penamaan sudah diperbarui atau dataset contoh tidak ditemukan.');process.exit(0);}
for(const [key,rows]of Object.entries(original))if(Array.isArray(rows)){
 if(rows.length!==data[key].length)throw Error('Jumlah data berubah: '+key);
 for(const row of rows){const result=data[key].find(r=>r.id===row.id);if(!result)throw Error('ID hilang: '+key);for(const property of ['amount','total','paid','rate','gross','deductions','revision','requestId','start','end','month','status'])if(JSON.stringify(row[property])!==JSON.stringify(result[property]))throw Error('Nilai bisnis berubah: '+key+'/'+property);}
}
console.log('Validasi: jumlah, ID, nominal, tanggal, dan status tetap.');
if(!process.argv.includes('--apply')){console.log('Preview saja; gunakan --apply setelah server dihentikan.');process.exit(0);}
if(fs.readFileSync(file,'utf8')!==raw)throw Error('Data berubah selama proses. Coba ulang.');
const temp=file+'.names-'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(data,null,2));fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
console.log('Nama dan tampilan dataset contoh diperbarui tanpa membuat backup.');
