import {ArrowUpRight,ChevronRight,Clock3} from 'lucide-react';
import type {Booking,DashboardData} from '@/lib/types';
import {dateLabel,todayISO,money} from '@/lib/format';
import {Avatar,Badge,statusText} from './rental-ui';

/** Shared booking content, with a compact clickable variant for the Booking page. */
export default function DashboardBookingCard({booking:b,data,index,day,onOpen,detailed=false}:{booking:Booking;data:DashboardData;index:number;day:string;onOpen:()=>void;detailed?:boolean}){
 const unit=data.units.find(u=>u.id===b.unitId)!,customer=data.customers.find(c=>c.id===b.customerId)!;
 const running=b.status==='running',late=running&&+new Date(b.end)<Date.now();
 const paymentLabel=b.paid>=b.total?'Pembayaran lunas':b.paid>0?'DP diterima':b.paymentSetup?.mode==='after_return'?'Bayar setelah selesai':'Menunggu pembayaran';
 const paymentTone=b.paid>=b.total?'green':b.paid>0?'yellow':'red';
 const progress=<div className="timeline-track" aria-label={`Pembayaran ${money(b.paid)} dari ${money(b.total)}`}><span style={{width:`${b.total>0?Math.min(100,Math.max(0,Math.round(b.paid/b.total*100))):0}%`}} className={b.paid>=b.total?'green-fill':'orange-fill'}/></div>;
 if(detailed)return <article className="upcoming-card booking-summary-card" role="button" tabIndex={0} aria-label={`Detail booking ${b.id}, ${unit.name}, ${customer.name}`} onClick={onOpen} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen();}}}>
  <div className="booking-summary-top"><span>{b.id}</span><div><Badge tone={b.status==='cancelled'?'neutral':paymentTone}>{b.status==='cancelled'?'Dibatalkan':paymentLabel}</Badge><ArrowUpRight size={16} aria-hidden="true"/></div></div>
  <div className="booking-summary-identity"><div><h3>{unit.name}</h3><span className="plate">{unit.plate}</span></div><div className="booking-summary-customer"><Avatar name={customer.name} index={index}/><span>{customer.name}</span></div></div>
  <dl className="booking-card-finances"><div><dt>Masa Sewa</dt><dd>{dateLabel(b.start)} - {dateLabel(b.end)}</dd></div><div><dt>Total booking</dt><dd>{money(b.total)}</dd></div><div><dt>Sudah dibayar</dt><dd>{money(b.paid)}</dd></div><div className="booking-card-balance"><dt>Sisa tagihan</dt><dd>{b.status==='cancelled'?'—':money(Math.max(0,b.total-b.paid))}</dd></div></dl>{progress}
 </article>;
 const untilStart=Math.max(0,Math.round((+new Date(`${todayISO(new Date(b.start))}T00:00:00+08:00`)-+new Date(`${day}T00:00:00+08:00`))/86400000));
 return <article className="upcoming-card"><div className="upcoming-top"><span>{b.id}</span><button aria-label={`Buka ${b.id}`} onClick={onOpen}><ArrowUpRight size={15}/></button></div><h3>{unit.name}</h3><span className="plate">{unit.plate}</span><Badge tone={paymentTone}>{paymentLabel}</Badge><div className="upcoming-customer"><Avatar name={customer.name} index={index}/><span>{customer.name}</span></div><div className="booking-period"><span>{dateLabel(b.start)}</span><span>{dateLabel(b.end)}</span></div>{progress}<div className="upcoming-footer"><span><Clock3 size={12}/>{running?(late?'Terlambat kembali':'Sedang berjalan'):b.status==='confirmed'?(untilStart===0?(todayISO(new Date(b.start))<day?'Belum diserahkan':'Mulai hari ini'):`${untilStart} hari lagi`):statusText[b.status]}</span><button onClick={onOpen}>Detail <ChevronRight size={13}/></button></div></article>;
}
