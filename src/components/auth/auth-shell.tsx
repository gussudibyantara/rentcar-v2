import Link from 'next/link';
import {signupEnabled} from '@/lib/auth/config';
import { CarFront,CalendarDays,Wallet,Check } from 'lucide-react';
import type { ReactNode } from 'react';
import './auth.css';
export default function AuthShell({children}:{children:ReactNode}){
 return <div className="auth-page"><a className="skip-link" href="#auth-main">Langsung ke formulir</a><header className="auth-topbar"><Link href="/login" className="auth-brand" aria-label="TravelOS — masuk"><span className="auth-brand-icon"><CarFront size={23}/></span><span>TravelOS<small>RENTAL WORKSPACE</small></span></Link><p>{signupEnabled()?<>Sudah punya akun? <Link href="/login">Masuk</Link> · <Link href="/signup">Daftar perusahaan</Link></>:'Akun dikelola oleh pengelola workspace.'}</p></header>
 <main className="auth-layout" id="auth-main"><aside className="auth-story" aria-label="Tentang TravelOS"><span className="auth-eyebrow"><span/> OPERASIONAL RENTAL, LEBIH RAPI</span><h2>Satu tempat untuk<br/>setiap perjalanan<span>.</span></h2><p>Mulai dari booking pertama sampai rekap akhir bulan. Kelola rentalmu dengan lebih jelas, setiap hari.</p><div className="auth-features">{[{icon:<CalendarDays size={19}/>,title:'Jadwal yang teratur',text:'Booking dan ketersediaan kendaraan dalam satu kalender.'},{icon:<CarFront size={19}/>,title:'Armada yang terhubung',text:'Mobil sendiri dan mobil rekanan dikelola bersama.'},{icon:<Wallet size={19}/>,title:'Angka yang lebih jelas',text:'Pantau pembayaran, pengeluaran, dan hak pemilik.'}].map(f=><div className="auth-feature" key={f.title}><span>{f.icon}</span><div><h3>{f.title}</h3><p>{f.text}</p></div></div>)}</div><div className="auth-story-foot"><Check size={15}/><span>Dirancang untuk cara kerja bisnis rental.</span></div></aside>
 <section className="auth-form-area">{children}</section></main><footer className="auth-footer"><span>TravelOS · Workspace untuk bisnis rental</span><span>Lebih rapi. Lebih terkendali.</span></footer></div>;
}
