'use client';
import { useState } from 'react';
import { LogOut,LoaderCircle } from 'lucide-react';
export default function SignoutButton({className='button',label='Keluar'}:{className?:string;label?:string}){const [busy,setBusy]=useState(false),[error,setError]=useState('');return <><button className={className} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const response=await fetch('/api/auth/signout',{method:'POST'});if(!response.ok)throw new Error();window.location.assign('/login');}catch{setError('Belum dapat keluar. Coba lagi.');setBusy(false);}}}>{busy?<LoaderCircle size={15} className="spin"/>:<LogOut size={15}/>}{label}</button>{error&&<p role="alert">{error}</p>}</>;}
