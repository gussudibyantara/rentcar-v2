'use client';
import DashboardBookingCard from './dashboard-booking-card';
import DateField from './date-field';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, CalendarDays, CarFront, ChevronLeft, ChevronRight, Download, Search, Wallet, X } from 'lucide-react';
import type { Booking, DashboardData } from '@/lib/types';
import { dateLabel, money, todayISO } from '@/lib/format';
import { addDays } from '@/lib/calendar';
import { statusText } from './rental-ui';
const PAGE_SIZE=20;
const tabs = [['all', 'Semua booking'], ['confirmed', 'Akan datang'], ['running', 'Berjalan'], ['returned', 'Dikembalikan'], ['completed', 'Selesai'], ['cancelled', 'Dibatalkan']] as const;
export default function BookingsPage({ data, onOpen }: {
  data: DashboardData; onOpen: (booking: Booking) => void; onEdit: (booking: Booking) => void;
}) {
  const [tab, setTab] = useState('all'), [query, setQuery] = useState(''), [payment, setPayment] = useState('all'), [category, setCategory] = useState('all');
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [sort, setSort] = useState('created'), [page, setPage] = useState(1);
  useEffect(()=>{const params=new URLSearchParams(window.location.search),status=params.get('status'),pay=params.get('payment');if(tabs.some(([key])=>key===status))setTab(status!);if(['full','partial','unpaid','outstanding'].includes(pay||''))setPayment(pay!);},[]);

  const [exportStatus, setExportStatus] = useState('');
  const base = useMemo(() => data.bookings, [data]);
  const dateError = Boolean(from && to && from > to);
  const filtered = useMemo(() => {
    if (dateError) return [];
    return base.filter(b => {
      const unit = data.units.find(u => u.id === b.unitId)!, customer = data.customers.find(c => c.id === b.customerId)!;
      const text = `${b.id} ${customer.name} ${unit.name} ${unit.plate} ${b.pic}`.toLowerCase();
      const paid = b.paid >= b.total ? 'full' : b.paid > 0 ? 'partial' : 'unpaid';
      return (tab === 'all' || b.status === tab) && text.includes(query.toLowerCase().trim()) && (payment === 'all' || (payment==='outstanding'?b.status!=='cancelled'&&b.paid<b.total:paid === payment)) && (category === 'all' || unit.category === category)
        && (!from || +new Date(b.end) > +new Date(`${from}T00:00:00+08:00`)) && (!to || +new Date(b.start) < +new Date(`${addDays(to, 1)}T00:00:00+08:00`));
    }).sort((a, b) => sort === 'start' ? +new Date(a.start) - +new Date(b.start) : sort === 'total' ? b.total - a.total : +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [base, data, tab, query, payment, category, from, to, sort, dateError]);
  useEffect(() => { setPage(1); }, [tab, query, payment, category, from, to, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages), visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilters = Number(category !== 'all') + Number(payment !== 'all') + Number(Boolean(from || to));
  function reset() { setTab('all'); setQuery(''); setPayment('all'); setCategory('all'); setFrom(''); setTo('');const params=new URLSearchParams(window.location.search);params.delete('status');params.delete('payment');window.history.replaceState(null,'',window.location.pathname+(params.size?'?'+params.toString():'')); }
  function applyKpi(status='all',pay='all') {reset();setTab(status);setPayment(pay);setPage(1);const params=new URLSearchParams();if(status!=='all')params.set('status',status);if(pay!=='all')params.set('payment',pay);window.history.replaceState(null,'',window.location.pathname+(params.size?'?'+params.toString():''));}
  function exportCSV() {
    const escape = (value: string | number) => `"${String(value).replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [['Booking', 'Pelanggan', 'Kendaraan', 'Plat',  'Mulai WITA', 'Selesai WITA', 'Status', 'Total', 'Dibayar', 'Sisa tagihan'], ...filtered.map(b => {
      const unit = data.units.find(u => u.id === b.unitId)!, customer = data.customers.find(c => c.id === b.customerId)!;
      return [b.id, customer.name, unit.name, unit.plate, dateLabel(b.start, { year: 'numeric', hour: '2-digit', minute: '2-digit' }), dateLabel(b.end, { year: 'numeric', hour: '2-digit', minute: '2-digit' }), statusText[b.status], b.total, b.paid, b.total - b.paid];
    })];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'TravelOS-bookings.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setExportStatus(`${filtered.length} booking diekspor sesuai filter.`);
  }
  return <div className="module-page bookings-page">
    <div className="kpi-grid">
      <button type="button" aria-pressed={tab==='all'&&payment==='all'&&!query&&category==='all'&&!from&&!to} onClick={()=>applyKpi('all','all')} className="kpi-card booking-kpi"><div className="kpi-top"><span>Total booking</span><span className="kpi-icon blue"><CalendarDays size={18} /></span></div><div className="kpi-number">{base.length}<span>booking</span></div><div className="kpi-bottom">Seluruh status booking</div></button>
      <button type="button" aria-pressed={tab==='running'&&payment==='all'&&!query&&category==='all'&&!from&&!to} onClick={()=>applyKpi('running','all')} className="kpi-card booking-kpi"><div className="kpi-top"><span>Rental berjalan</span><span className="kpi-icon orange"><CarFront size={18} /></span></div><div className="kpi-number">{base.filter(b => b.status === 'running').length}<span>rental</span></div><div className="kpi-bottom">Kendaraan sedang bersama pelanggan</div></button>
      <button type="button" aria-pressed={tab==='confirmed'&&payment==='all'&&!query&&category==='all'&&!from&&!to} onClick={()=>applyKpi('confirmed','all')} className="kpi-card booking-kpi"><div className="kpi-top"><span>Akan datang</span><span className="kpi-icon green"><CalendarDays size={18} /></span></div><div className="kpi-number">{base.filter(b => b.status === 'confirmed').length}<span>booking</span></div><div className="kpi-bottom">Booking dikonfirmasi, belum diserahkan</div></button>
      <button type="button" aria-pressed={tab==='all'&&payment==='outstanding'&&!query&&category==='all'&&!from&&!to} onClick={()=>applyKpi('all','outstanding')} className="kpi-card booking-kpi attention"><div className="kpi-top"><span>Sisa pembayaran</span><span className="kpi-icon yellow"><Wallet size={18} /></span></div><div className="kpi-number money-number">{money(base.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.total - b.paid, 0), true)}</div><div className="kpi-bottom">Lihat booking belum lunas dan sisa tagihannya</div></button>
    </div>
    <section className="panel bookings-list" aria-label="Daftar booking"><h2 className="sr-only">Daftar booking</h2>
      <div className="bookings-list-header"><div className="bookings-tabs" role="tablist" aria-label="Status booking">{tabs.map(([key, label]) => <button role="tab" aria-selected={tab === key} className={tab === key ? 'selected' : ''} key={key} onClick={() => setTab(key)}>{label}<span className="count">{key === 'all' ? base.length : base.filter(b => b.status === key).length}</span></button>)}</div><div className="bookings-action-buttons"><label className="filter-control sort-filter"><ArrowDownUp size={15} /><select aria-label="Urutkan booking" value={sort} onChange={e => setSort(e.target.value)}><option value="created">Terbaru dibuat</option><option value="start">Jadwal terdekat</option><option value="total">Nilai tertinggi</option></select></label><button className="button" onClick={exportCSV} disabled={!filtered.length}><Download size={15} />Ekspor CSV</button></div></div>
      <div className="bookings-card-toolbar"><label className="search-input module-search"><Search size={16} /><input aria-label="Cari daftar booking" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari booking…" />{query && <button aria-label="Hapus pencarian booking" onClick={() => setQuery('')}><X size={15} /></button>}</label>        <label><span className="sr-only">Kategori kendaraan booking</span><select aria-label="Kategori kendaraan booking" value={category} onChange={e => setCategory(e.target.value)}><option value="all">Semua kendaraan</option><option>Mobil</option><option>Minibus</option></select></label>
        <label><span className="sr-only">Pembayaran booking</span><select aria-label="Pembayaran booking" value={payment} onChange={e => setPayment(e.target.value)}><option value="all">Semua pembayaran</option><option value="outstanding">Semua belum lunas</option><option value="full">Lunas</option><option value="partial">DP / sebagian</option><option value="unpaid">Belum bayar</option></select></label>
        <div className="date-range-filter"><label><span>Dari</span><DateField aria-label="Periode booking dari" type="date" min="2020-01-01" max="2100-12-31" value={from} onChange={e => setFrom(e.target.value)} /></label><span>–</span><label><span>Sampai</span><DateField aria-label="Periode booking sampai" type="date" min="2020-01-01" max="2100-12-31" value={to} onChange={e => setTo(e.target.value)} /></label></div>
        {(activeFilters > 0 || query || tab !== 'all') && <button className="text-button reset-filters" onClick={reset}>Reset filter <X size={13} /></button>}

      </div>
      {dateError && <p className="filter-error" role="alert">Tanggal akhir filter harus sama atau setelah tanggal awal.</p>}
      <div className="bookings-card-grid">{visible.map((booking,index)=><DashboardBookingCard key={booking.id} booking={booking} data={data} index={index} day={todayISO()} onOpen={()=>onOpen(booking)} detailed/>)}</div>
      {!visible.length && <div className="module-empty"><Search size={28} /><h3>Booking tidak ditemukan</h3><p>{dateError ? 'Periksa kembali rentang tanggal yang dipilih.' : 'Coba kata pencarian atau filter lain.'}</p><button className="button" onClick={reset}>Reset filter</button></div>}
      <footer className="pagination-footer"><span>{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}` : '0'} dari {filtered.length} booking</span><div className="pagination"><button className="icon-button" aria-label="Halaman booking sebelumnya" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>Halaman {currentPage} dari {totalPages}</span><button className="icon-button" aria-label="Halaman booking berikutnya" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
    </section>
    <p className="module-footnote">Rentang tanggal menampilkan booking yang beririsan dengan periode pilihan. Semua waktu menggunakan WITA.</p>
    {exportStatus && <p className="export-status" role="status">{exportStatus}</p>}
  </div>;
}
