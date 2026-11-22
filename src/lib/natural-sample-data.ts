import type {DashboardData} from './types';
const marker='travelos-demo-ten-v1';
const version='presentation:natural-v1';
/** One-time presentation migration for the explicitly imported fictional dataset only. */
export function naturalizeSampleData(source:DashboardData){
 const data=structuredClone(source),entry=data.activities.find(a=>a.id===marker);
 if(!entry||entry.description.includes(version))return {data,changed:false};
 const mappings=new Map<string,string>();
 const names={branches:['Mataram Pusat','Senggigi','Praya','Kuta Mandalika','Selong','Tanjung','Denpasar','Ubud','Jakarta Selatan','Bandung'],partners:['Arif Setiawan','Bagus Wicaksana','Citra Maharani','Dimas Saputra','Eko Nugroho','Fajar Hidayat','Gilang Permana','Hendra Kusuma','Indra Wijaya','Joko Santoso'],employees:['Agus Firmansyah','Rina Wulandari','Fikri Maulana','Sari Puspita','Rizky Aditya','Nadia Putri','Yoga Prasetyo','Dewi Anggraini','Andi Kurniawan','Laras Safitri'],customers:['PT Lombok Wisata Mandiri','Naufal Ramadhan','Aulia Rahmawati','CV Mandalika Transport','Reza Mahendra','Intan Permatasari','PT Bali Jelajah Nusantara','Wahyu Saputra','Putri Amelia','CV Nusantara Perjalanan']};
 const codes=['MTR','SGG','PRY','KMD','SLG','TJG','DPS','UBD','JKS','BDG'];
 const plates=['DR 4821 AK','DR 2756 BS','DR 7103 CM','DR 3468 DN','DR 1592 EP','DR 2835 FR','DK 1746 GS','DK 2389 HT','B 1857 JKS','D 1468 VBN'];
 const demoIds=new Set<string>();
 for(const key of ['branches','partners','employees','customers'] as const){
  const rows=data[key]||[];if(key==='branches'&&!rows.some(r=>r.name.startsWith('Demo ')))continue;const sample=rows.filter(r=>r.name.startsWith('Demo '));
  if(sample.length!==10)throw Error(`Dataset contoh ${key} tidak lengkap. Tidak ada data yang ditulis.`);
  const occupied=new Set(rows.filter(r=>!r.name.startsWith('Demo ')).map(r=>r.name.toLowerCase()));
  sample.sort((a,b)=>Number(a.name.match(/(\d+)$/)?.[1])-Number(b.name.match(/(\d+)$/)?.[1])).forEach((r,i)=>{let name=names[key][i];if(occupied.has(name.toLowerCase()))name+=' '+(key==='branches'?'Timur':key==='customers'?'Utama':'Pranata');if(occupied.has(name.toLowerCase()))throw Error('Nama contoh berbenturan dengan data sebelumnya.');occupied.add(name.toLowerCase());mappings.set(r.name,name);if(r.email)mappings.set(r.email,name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/\.$/,'')+'@example.invalid');demoIds.add(r.id);});
 }
 const units=data.units.filter(u=>u.name.startsWith('Demo '));if(units.length!==10)throw Error('Dataset kendaraan contoh tidak lengkap.');
 for(const u of units){const slot=Number(u.plate.match(/^DEMO (\d+) UNIT$/)?.[1])-1;if(!Number.isInteger(slot)||slot<0||slot>=10)throw Error('Plat contoh sudah berubah; perlu pemeriksaan manual.');if(data.units.some(other=>other.id!==u.id&&other.plate===plates[slot]))throw Error('Plat contoh berbenturan.');mappings.set(u.name,u.name.replace(/^Demo /,''));mappings.set(u.plate,plates[slot]);demoIds.add(u.id);}
 // Derived records are included only when linked to this imported sample dataset.
 for(const b of data.bookings)if(demoIds.has(b.unitId)&&b.notes.startsWith('Demo'))demoIds.add(b.id);
 for(const k of ['partnerAgreements','maintenance','inspections','invoices','settlements','expenses'] as const)for(const r of data[k]||[])if(('unitId' in r&&demoIds.has(r.unitId))||('bookingId' in r&&demoIds.has(r.bookingId))||('partnerId' in r&&demoIds.has(r.partnerId))||('notes' in r&&r.notes.startsWith('Demo')))demoIds.add(r.id);
 const replace=(value:unknown):unknown=>{
  if(typeof value==='string'){
   if(mappings.has(value))return mappings.get(value)!;
   let s=value;for(const [from,to]of [...mappings].sort((a,b)=>b[0].length-a[0].length))s=s.split(from).join(to);
   return s.replace(/^Demo · /,'').replace(/Demo Rental Fiktif/g,'Nusa Jelajah Rental').replace(/Alamat perusahaan simulasi/g,'Mataram, Nusa Tenggara Barat').replace(/SIMULASI — jangan melakukan transfer uang\./g,'Konfirmasi rekening pembayaran kepada admin.').replace(/Dokumen demo, bukan tagihan nyata\./g,'Pembayaran mengikuti rincian tagihan dan kesepakatan sewa.').replace(/Demo — data fiktif untuk mencoba aplikasi; bukan transaksi atau identitas nyata\.\s*/g,'').replace(/ Status berjalan adalah skenario demo impor; foto\/checklist belum diisi\./g,' Pemeriksaan pengembalian dijadwalkan; foto dan checklist belum dilengkapi.').replace(/Bukan bukti transfer nyata\./g,'Pembayaran dicatat terpisah sesuai riwayat.').replace(/Contoh biaya bulanan tetap/g,'Biaya bulanan tetap').replace(/Alamat pelanggan fiktif/g,'Indonesia').replace(/Alamat simulasi — tidak untuk pengiriman/g,'Nusa Tenggara Barat').replace(/Tidak ada rekening nyata; seluruh pembayaran hanya simulasi\./g,'').replace(/Demo Bengkel \d+/g,'Bengkel Sinar Motor').replace(/Demo Penyedia \d+/g,'Mitra Perawatan Armada').replace(/^Demo servis rutin \d+$/,'Servis rutin dan pemeriksaan berkala').replace(/^Demo cuci kendaraan \d+$/,'Cuci dan kebersihan kendaraan').replace(/^Demo biaya operasional \d+$/,'Perlengkapan operasional kendaraan').replace(/DEMO-PAY-/g,'TRF-SEWA-').replace(/DEMO-SET-/g,'TRF-REKANAN-');
  }
  if(Array.isArray(value))return value.map(replace);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='id'||k.endsWith('Id')?v:replace(v)]));
  return value;
 };
 for(const [key,value]of Object.entries(data))if(Array.isArray(value)){
  const rows=value as {id:string;title?:string}[];
  for(let i=0;i<rows.length;i++)if(demoIds.has(rows[i].id)||rows[i].title?.startsWith('Demo · '))rows[i]=replace(rows[i]) as typeof rows[number];
 }
 for(let i=0;i<10;i++){
  const b=data.branches?.find(b=>demoIds.has(b.id)&&b.name===mappings.get(`Demo Cabang ${String(i+1).padStart(2,'0')}`));if(!b)continue;b.code=codes[i];b.address=b.city;b.notes='Lokasi operasional dan penugasan armada.';
 }
 for(const e of data.employees||[])if(demoIds.has(e.id)){e.position='Staf operasional';e.notes='Menangani reservasi, serah terima, inspeksi, dan pembayaran.';}
 for(const p of data.partners||[])if(demoIds.has(p.id)){p.address='Nusa Tenggara Barat';p.bank='';p.notes='Kerja sama penyediaan kendaraan dengan biaya bulanan tetap.';}
 for(const c of data.customers)if(demoIds.has(c.id)){c.address='Indonesia';c.notes=c.type==='Business'?'Pelanggan perusahaan / mitra perjalanan.':'Pelanggan sewa kendaraan.';}
 for(const u of data.units)if(demoIds.has(u.id))u.notes='Kendaraan rekanan untuk operasional rental.';
 for(const b of data.bookings)if(demoIds.has(b.id)&&!b.notes.trim())b.notes='Reservasi kendaraan sesuai jadwal.';
 for(const i of data.inspections||[])if(demoIds.has(i.id)&&!i.notes.trim())i.notes='Periksa kondisi kendaraan, kelengkapan, dan bahan bakar.';
 for(const m of data.maintenance||[])if(demoIds.has(m.id)&&!m.notes.trim())m.notes='Pemeriksaan rutin mesin, rem, ban, dan cairan kendaraan.';
 for(const e of data.expenses||[])if(demoIds.has(e.id)&&!e.notes.trim())e.notes='Biaya operasional kendaraan sesuai pencatatan.';
 for(const i of data.invoices||[])if(demoIds.has(i.id)&&!i.notes.trim())i.notes='Tagihan sewa kendaraan sesuai periode reservasi.';
 const mark=data.activities.find(a=>a.id===marker)!;mark.title='Data awal workspace tersedia';mark.description=`Dataset fiktif untuk pengujian lokal; bukan pelanggan atau transaksi nyata. ${version}`;
 return {data,changed:true};
}
