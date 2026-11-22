'use client';
import Link from 'next/link';
import SignupForm from './signup-form';
import {useState,type FormEvent} from 'react';
import {ArrowRight,Eye,EyeOff,LoaderCircle,Info} from 'lucide-react';
export type AuthMode='login'|'signup'|'forgot'|'reset';
export default function AuthForm({mode,configured,allowSignup=false,initialError=''}:{mode:AuthMode;configured:boolean;allowSignup?:boolean;initialError?:string}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[error,setError]=useState(initialError),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!configured||busy)return;setBusy(true);setError('');try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password})});const result=await response.json();if(!response.ok)throw Error(result.error||'Belum dapat masuk. Coba lagi.');window.location.assign('/');}catch(e){setError(e instanceof TypeError?'Koneksi terputus. Periksa koneksi lalu coba lagi.':(e as Error).message);setBusy(false);}}
 if(mode==='signup')return <SignupForm configured={configured}/>;
 if(mode!=='login')return <div className="auth-card"><span className="auth-eyebrow">AKUN WORKSPACE</span><h1>Pemulihan akun</h1><p className="auth-description">Pemulihan akun dilakukan oleh pengelola. Hubungi pengelola untuk mengganti kata sandi.</p><Link className="button primary auth-submit" href="/login">Kembali ke halaman masuk<ArrowRight size={16}/></Link></div>;
 return <div className="auth-card"><span className="auth-eyebrow">MASUK KE WORKSPACE</span><h1>Selamat datang kembali</h1><p className="auth-description">Masuk untuk melanjutkan pengelolaan rentalmu.</p>
 {!configured&&<p className="auth-message" role="status"><Info size={17}/>Layanan akun belum tersedia saat ini. Hubungi pengelola untuk menyiapkan login workspace.</p>}
 <form method="post" className="auth-form" onSubmit={submit} aria-busy={busy}>
 <div className="auth-field"><label htmlFor="auth-email">Email</label><input id="auth-email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@bisnismu.com" disabled={busy}/></div>
 <div className="auth-field"><div className="auth-label-row"><label htmlFor="auth-password">Kata sandi</label><Link href="/forgot-password">Lupa kata sandi?</Link></div><div className="auth-password"><input id="auth-password" name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan kata sandi" disabled={busy}/><button type="button" aria-label={visible?'Sembunyikan kata sandi':'Tampilkan kata sandi'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
 {error&&<p className="auth-message auth-error" role="alert">{error}</p>}
 <button className="button primary auth-submit" disabled={!configured||busy} type="submit">{busy?<><LoaderCircle size={17} className="spin"/>Memproses…</>:<>Masuk<ArrowRight size={16}/></>}</button></form><p className="auth-bottom">{allowSignup?<>Belum punya akun? <Link href="/signup">Daftarkan perusahaan</Link></>:'Hubungi pengelola untuk membuat akun.'}</p></div>;
}
