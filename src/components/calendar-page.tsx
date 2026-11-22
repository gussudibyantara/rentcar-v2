'use client';
import {vehicleCategories} from '@/lib/vehicle-config';
import DateField from './date-field';
import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CalendarDays, CarFront, ChevronLeft, ChevronRight, Clock3, LayoutGrid, List, MapPin, Plus, Search, Wrench } from 'lucide-react';
import type { Booking, DashboardData } from '@/lib/types';
import { dateLabel, period, todayISO } from '@/lib/format';
import { allMaintenance, blockedByMaintenance, maintenanceBlocks } from '@/lib/fleet-shared';
import { available } from '@/lib/rules';
import { addDays, addMonths, bookingsInRange, calendarRange, conflictIds, dayBookings, monthDays, timelineSegments, unitState, type CalendarView } from '@/lib/calendar';
import { Badge, VehicleIcon, statusText, statusTone } from './rental-ui';
const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const states: Record<string, string> = { available: 'Tersedia', running: 'Disewa', confirmed: 'Dipesan', maintenance: 'Maintenance', inactive: 'Nonaktif' };
export default function CalendarPage({ data, day, onDay, onOpen, onCreate }: {
  data: DashboardData; day: string; onDay: (day: string) => void; 
  onOpen: (booking: Booking) => void; onCreate: (unitId?: string, day?: string) => void;
}) {
  const [view, setView] = useState<CalendarView>('week'), [category, setCategory] = useState('all'), [status, setStatus] = useState('all'), [query, setQuery] = useState('');
  const range = calendarRange(day, view), today = todayISO();
  const baseUnits = data.units.filter(u => !u.archivedAt && (category === 'all' || u.category === category) && `${u.name} ${u.plate}`.toLowerCase().includes(query.toLowerCase().trim()));
  const visibleUnits = baseUnits.filter(u => status === 'all' || unitState(data, u, range.from, range.to) === status);
  const visibleBookings = data.bookings.filter(b => visibleUnits.some(u => u.id === b.unitId));
  const inRange = bookingsInRange(visibleBookings, range.from, range.to);
  const conflicts = conflictIds(inRange);
  const overdue = visibleBookings.filter(b => b.status === 'running' && +new Date(b.end) < Date.now());
  const week = Array.from({ length: 7 }, (_, i) => addDays(range.start, i));
  const month = useMemo(() => monthDays(day), [day]);
  const title = view === 'month' ? dateLabel(`${day}T12:00:00+08:00`, { month: 'long', year: 'numeric', day: undefined }) : view === 'day' ? dateLabel(`${day}T12:00:00+08:00`, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : `${dateLabel(`${range.start}T12:00:00+08:00`)} – ${dateLabel(`${addDays(range.end, -1)}T12:00:00+08:00`, { year: 'numeric' })}`;
  function move(direction: number) { onDay(view === 'month' ? addMonths(day, direction) : addDays(day, direction * (view === 'week' ? 7 : 1))); }
  function agenda(date: string, compact = false) {
    const bookings = dayBookings(visibleBookings, date);
    const maintenance = visibleUnits.filter(u => u.condition === 'maintenance' || blockedByMaintenance(data,u.id,`${date}T00:00:00+08:00`,`${addDays(date,1)}T00:00:00+08:00`));
    return <section className={`calendar-agenda ${compact ? 'compact-agenda' : ''}`} key={date}>
      <header><div><span className={`agenda-date-number ${date === today ? 'is-today' : ''}`}>{Number(date.slice(8))}</span><span><strong>{dateLabel(`${date}T12:00:00+08:00`, { weekday: 'long' })}</strong><small>{bookings.length} rental terjadwal</small></span></div><button className="icon-button" aria-label={`Booking baru pada ${date}`} onClick={() => onCreate(undefined, date)}><Plus size={15} /></button></header>
      <div className="calendar-agenda-items">{bookings.map(b => {
        const unit = data.units.find(u => u.id === b.unitId)!, customer = data.customers.find(c => c.id === b.customerId)!;
        return <button className={`agenda-booking status-${b.status} ${conflicts.has(b.id) ? 'conflict-event' : ''}`} key={b.id} onClick={() => onOpen(b)}><span className="agenda-booking-time"><Clock3 size={13} />{todayISO(new Date(b.start)) === date ? dateLabel(b.start, { hour: '2-digit', minute: '2-digit' }).split(' ').at(-1) : 'Berlangsung'}</span><div><strong>{unit.name} <small>{unit.plate}</small></strong><span>{customer.name} · {b.id}</span><small>{period(b.start, b.end)}</small></div><Badge tone={statusTone[b.status]}>{statusText[b.status]}</Badge><ArrowRight size={14} /></button>;
      })}{maintenance.map(u => <div className="agenda-maintenance" key={u.id}><Wrench size={15} /><span><strong>{u.name} · {u.plate}</strong><small>Unit dalam maintenance · belum dapat disewakan</small></span></div>)}
        {!bookings.length && !maintenance.length && <div className="calendar-day-empty"><CalendarDays size={20} /><p>Belum ada rental terjadwal.</p><button className="text-button" onClick={() => onCreate(undefined, date)}>Buat booking <Plus size={13} /></button></div>}
      </div>
    </section>;
  }
  return <div className="module-page calendar-page">
    <div className="calendar-stats">
      <article><span className="kpi-icon green"><CarFront size={17} /></span><div><strong>{baseUnits.filter(u => unitState(data, u, range.from, range.to) === 'available').length}</strong><span>Unit tersedia</span></div></article>
      <article><span className="kpi-icon orange"><CarFront size={17} /></span><div><strong>{baseUnits.filter(u => unitState(data, u, range.from, range.to) === 'running').length}</strong><span>Sedang disewa</span></div></article>
      <article><span className="kpi-icon blue"><CalendarDays size={17} /></span><div><strong>{baseUnits.filter(u => unitState(data, u, range.from, range.to) === 'confirmed').length}</strong><span>Sudah dipesan</span></div></article>
      <article><span className="kpi-icon yellow"><Wrench size={17} /></span><div><strong>{baseUnits.filter(u => unitState(data,u,range.from,range.to)==='maintenance').length}</strong><span>Maintenance</span></div></article>
    </div>
    <section className="panel calendar-panel" aria-label="Kalender rental">
      <div className="calendar-toolbar"><div className="calendar-navigation"><div><button className="icon-button" aria-label="Periode kalender sebelumnya" onClick={() => move(-1)}><ChevronLeft size={17} /></button><button className="icon-button" aria-label="Periode kalender berikutnya" onClick={() => move(1)}><ChevronRight size={17} /></button></div><h2 aria-live="polite">{title}</h2><button className="button today-button" onClick={() => onDay(today)}>Hari ini</button></div>
        <div className="calendar-view-tabs" role="tablist" aria-label="Tampilan kalender">{([['day', 'Hari', List], ['week', 'Minggu', CalendarDays], ['month', 'Bulan', LayoutGrid]] as const).map(([key, label, Icon]) => <button key={key} role="tab" aria-selected={view === key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}><Icon size={14} />{label}</button>)}</div>
      </div>
      <div className="module-filterbar calendar-filterbar"><label className="calendar-unit-search"><Search size={15} /><input aria-label="Cari kendaraan kalender" placeholder="Cari kendaraan atau plat…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        
        <label><span className="sr-only">Kategori kalender</span><select aria-label="Kategori kalender" value={category} onChange={e => setCategory(e.target.value)}><option value="all">Semua kendaraan</option>{vehicleCategories.map(c=><option key={c}>{c}</option>)}</select></label>
        <label><span className="sr-only">Status kendaraan kalender</span><select aria-label="Status kendaraan kalender" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Semua status</option>{Object.entries(states).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="calendar-date-input"><DateField required aria-label="Pilih tanggal kalender" type="date" min="2020-01-01" max="2100-12-31" value={day} onChange={e => { if (e.target.value) onDay(e.target.value); }} /></label>
      </div>
      <div className="calendar-legend"><div><span><i className="legend-running" />Disewa</span><span><i className="legend-confirmed" />Dipesan</span><span><i className="legend-completed" />Selesai</span><span><i className="legend-maintenance" />Maintenance</span></div><span className="timezone-label">Waktu Indonesia Tengah · WITA</span></div>
      {(conflicts.size > 0 || overdue.length > 0) && <div className="calendar-warning" role="status"><AlertCircle size={16} /><span>{conflicts.size > 0 ? `${conflicts.size} booking memiliki jadwal yang bertumpang tindih. ` : ''}{overdue.length > 0 ? `${overdue.length} rental lewat jadwal dan belum dikembalikan. Unit tetap diblokir.` : ''}</span></div>}
      {!visibleUnits.length ? <div className="module-empty"><Search size={28} /><h3>Kendaraan tidak ditemukan</h3><p>Coba kategori atau status lain.</p><button className="button" onClick={() => { setQuery(''); setCategory('all'); setStatus('all'); }}>Reset filter</button></div> : <>
        {view === 'week' && <>
          <p className="timeline-scroll-hint">Geser jadwal ke samping untuk melihat seluruh minggu. Kolom kendaraan tetap terlihat.</p>
          <div className="calendar-timeline timeline-scroll" role="region" aria-label="Jadwal mingguan per kendaraan, dapat digeser horizontal" tabIndex={0}><div className="timeline-grid"><div className="timeline-header"><div className="timeline-unit-title">Kendaraan <span>{visibleUnits.length} unit</span></div><div className="timeline-weekdays">{week.map((date, index) => <button key={date} className={date === today ? 'today-column' : ''} onClick={() => { onDay(date); setView('day'); }}><span>{weekdays[index]}</span><strong>{Number(date.slice(8))}</strong></button>)}</div></div>
            {visibleUnits.map(unit => { const rows = timelineSegments(visibleBookings.filter(b => b.unitId === unit.id), range.start); const lanes = Math.max(1, ...rows.map(row => row.lane + 1)); const jobs=allMaintenance(data).filter(m=>m.unitId===unit.id&&maintenanceBlocks(m,range.from,range.to)); const condition = unitState(data, unit, range.from, range.to); return <div className="timeline-unit-row" key={unit.id} style={{ minHeight: Math.max(70, (lanes+jobs.length) * 37 + 16) }}><div className="timeline-unit-label"><VehicleIcon unit={unit} /><span><strong>{unit.name}</strong><small>{unit.plate}</small></span></div><div className="timeline-track-grid"><div className="timeline-day-cells">{week.map(date => {
              const canBook = available(data, unit, `${date}T09:00:00+08:00`, `${date}T17:00:00+08:00`);
              return <button key={date} disabled={!canBook} className={date === today ? 'today-column' : ''} aria-label={`Booking ${unit.name} ${unit.plate} pada ${date}`} onClick={() => onCreate(unit.id, date)}>{canBook && <Plus size={14} />}</button>;
            })}</div>{unit.condition === 'maintenance' ? <div className="timeline-maintenance"><Wrench size={13} />Maintenance · unit belum tersedia</div> : <>{rows.map(({ booking: b, first, span, lane }) => { const customer = data.customers.find(c => c.id === b.customerId)!; return <button className={`timeline-event status-${b.status} ${conflicts.has(b.id) ? 'conflict-event' : ''}`} key={b.id} style={{ left: `calc(${first / 7 * 100}% + 4px)`, width: `calc(${span / 7 * 100}% - 8px)`, top: 9 + lane * 37 }} onClick={() => onOpen(b)} title={`${b.id} · ${customer.name} · ${period(b.start, b.end)}`}><strong>{customer.name}</strong><small>{b.id}</small></button>; })}{jobs.map((job,index)=>{const first=Math.max(0,Math.floor((+new Date(job.startedAt||job.start)-+new Date(range.from))/86400000));const until=job.status==='in_progress'&&+new Date(job.end)<Date.now()?7:Math.min(7,Math.ceil((+new Date(job.end)-+new Date(range.from))/86400000));return <div key={job.id} className="timeline-maintenance scheduled-maintenance" style={{left:`calc(${first/7*100}% + 4px)`,right:'auto',width:`calc(${Math.max(1,until-first)/7*100}% - 8px)`,top:9+(lanes+index)*37}} title={job.title}><Wrench size={12}/>{job.title}</div>;})}{!rows.length&&!jobs.length&&condition==='inactive'&&<div className="timeline-overdue">Unit nonaktif</div>}{!rows.length && condition === 'running' && <div className="timeline-overdue"><AlertCircle size={13} />Belum dikembalikan</div>}</>}</div></div>; })}
          </div></div>
          <div className="calendar-mobile-agenda"><p className="mobile-agenda-note">Agenda minggu ini · geser tanggal lewat tombol periode di atas.</p>{week.map(date => agenda(date, true))}</div>
        </>}
        {view === 'day' && <div className="calendar-day-layout">{agenda(day)}<aside className="day-availability"><h3>Kendaraan tersedia hari ini</h3><p>{dateLabel(`${day}T12:00:00+08:00`, { year: 'numeric' })} · 09.00–17.00 WITA</p>{visibleUnits.filter(u => available(data, u, `${day}T09:00:00+08:00`, `${day}T17:00:00+08:00`)).map(unit => <button className="day-available-unit" key={unit.id} onClick={() => onCreate(unit.id, day)}><VehicleIcon unit={unit} /><span><strong>{unit.name}</strong><small>{unit.plate}</small></span><Plus size={15} /></button>)}{!visibleUnits.some(u => available(data, u, `${day}T09:00:00+08:00`, `${day}T17:00:00+08:00`)) && <p className="empty-state">Tidak ada unit tersedia untuk filter ini.</p>}</aside></div>}
        {view === 'month' && <><div className="month-grid" aria-label="Kalender bulanan">{weekdays.map(d => <div key={d} className="month-weekday">{d}</div>)}{month.map(date => {
          const bookings = dayBookings(visibleBookings, date); return <div key={date} className={`month-cell ${date.slice(0, 7) !== day.slice(0, 7) ? 'outside-month' : ''} ${date === day ? 'selected-date' : ''}`}><button className={`month-date ${date === today ? 'today-date' : ''}`} aria-label={`Pilih tanggal ${date}`} aria-pressed={date === day} onClick={() => onDay(date)}>{Number(date.slice(8))}<span className="month-mobile-count">{bookings.length || '–'}</span></button><div className="month-events">{bookings.slice(0, 2).map(b => <button key={b.id} className={`month-event status-${b.status}`} onClick={() => onOpen(b)} title={`${b.id} · ${data.customers.find(c => c.id === b.customerId)!.name}`}>{data.units.find(u => u.id === b.unitId)!.name}</button>)}{bookings.length > 2 && <button className="month-more" onClick={() => onDay(date)}>+{bookings.length - 2} lainnya</button>}</div><div className="month-status-dots" aria-hidden="true">{Array.from(new Set(bookings.map(b => b.status))).map(s => <i key={s} className={`status-${s}`} />)}</div></div>;
        })}</div><div className="month-selected-agenda">{agenda(day)}</div></>}
      </>}
      <footer className="calendar-footer"><span>{visibleUnits.length} kendaraan · {inRange.length} rental dalam periode ini</span><span>Klik jadwal untuk detail · klik slot tersedia untuk booking baru</span></footer>
    </section>
    <p className="module-footnote">Ketersediaan mengikuti booking, periode maintenance, dan kondisi kendaraan. Pekerjaan yang melewati estimasi tetap memblokir unit. Booking dibatalkan tidak tampil di kalender.</p>
  </div>;
}
