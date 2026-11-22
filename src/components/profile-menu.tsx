'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {UserRound,Settings2,CreditCard,CircleHelp} from 'lucide-react';
import Link from 'next/link';
import {initials} from '@/lib/format';
import SignoutButton from './auth/signout-button';
export default function ProfileMenu({onHelp,onOpen,userName='Azis Maliek',localWorkspace=true}:{userName?:string;localWorkspace?:boolean;onHelp:()=>void;onOpen:()=>void}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{
  if(!open)return;
  root.current?.querySelector<HTMLElement>('.profile-dropdown a,.profile-dropdown button')?.focus();
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 function select(value:'profile'|'settings'|'billing'|'help'){
  setOpen(false);trigger.current?.focus();
  if(value==='help')onHelp();
 }
 return <><div className="profile-menu" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
  <button type="button" ref={trigger} className="top-avatar profile-trigger" aria-label={`Menu akun ${userName}`} aria-expanded={open} aria-controls={id} onClick={()=>{if(!open)onOpen();setOpen(v=>!v);}}>{initials(userName)}</button>
  {open&&<div id={id} className="profile-dropdown"><div className="profile-menu-identity"><strong>{userName}</strong><small>Owner workspace</small></div><ul aria-label="Menu akun">
   <li><Link href="/profile" onClick={()=>select('profile')}><UserRound size={17}/>Profile</Link></li>
   <li><Link href="/settings" onClick={()=>select('settings')}><Settings2 size={17}/>Pengaturan</Link></li>
   <li><Link href="/billing" onClick={()=>select('billing')}><CreditCard size={17}/>Check billing</Link></li>
   <li><button type="button" onClick={()=>select('help')}><CircleHelp size={17}/>Panduan Workspace</button></li>
   <li className="profile-signout"><SignoutButton className="profile-logout" label="Log out"/></li>
  </ul></div>}
 </div></>;
}
