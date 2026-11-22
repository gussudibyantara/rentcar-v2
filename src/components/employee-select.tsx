'use client';
import Link from 'next/link';
import {useState} from 'react';
import type { DashboardData,EmployeeRole } from '@/lib/types';
import { eligibleEmployees } from '@/lib/employees-shared';
export default function EmployeeSelect({id,label,data,role,value,onChange,required=false,previousId,previousName}:{id:string;label:string;data:DashboardData;role:EmployeeRole;value:string;onChange:(id:string,name:string)=>void;required?:boolean;previousId?:string;previousName?:string}){
 const [legacySelected,setLegacySelected]=useState(!previousId&&Boolean(previousName));
 const choices=eligibleEmployees(data,role),previous=(data.employees||[]).find(e=>e.id===previousId);const legacy=!previousId&&Boolean(previousName),selected=value||(legacySelected?'__legacy':'');
 return <><label htmlFor={id}>{label}{!required&&<small>Opsional</small>}</label><select id={id} required={required} value={selected} onChange={e=>{setLegacySelected(e.target.value==='__legacy');if(e.target.value==='__legacy'){onChange('',previousName||'');return;}const employee=data.employees?.find(p=>p.id===e.target.value);onChange(employee?.id||'',employee?.name||'');}}><option value="">{required?'Pilih karyawan':'Belum ditentukan'}</option>{legacy&&<option value="__legacy">{previousName} · catatan lama</option>}{previousId&&!choices.some(e=>e.id===previousId)&&<option value={previousId}>{previousName||previous?.name||'Karyawan sebelumnya'} · penugasan tersimpan</option>}{choices.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>{!choices.length&&<p className="field-hint">Belum ada karyawan aktif untuk tugas ini. Kelola melalui <Link href="/employees" target="_blank" rel="noreferrer">halaman Karyawan</Link>.</p>}</>;
}
