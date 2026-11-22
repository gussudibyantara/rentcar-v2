'use client';
import {notifyWorkspaceChanged} from '@/lib/workspace-sync';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, CarFront, CircleCheck, Info, LoaderCircle, Plus } from 'lucide-react';
import Drawer from './drawer';
import VehicleSymbol from './vehicle-symbol';
import EmployeeSelect from './employee-select';
import CustomerForm from './customer-form';
import DateField from './date-field';
import { bookingPaymentNames,bookingCustomerNames } from '@/lib/booking-payment-shared';
import BookingDatePicker from './booking-date-picker';
import type { DashboardData, Booking, Customer, BookingPaymentSetup } from '@/lib/types';
import { available } from '@/lib/rules';
import { money, days, todayISO } from '@/lib/format';
const localInput = (iso: string) => new Date(+new Date(iso) + 8 * 3600000).toISOString().slice(0, 16);
const isoInput = (value: string) => { const date = new Date(`${value}:00+08:00`); return Number.isFinite(+date) ? date.toISOString() : ''; };
export default function BookingForm({ data, day, initialUnit, initialBooking, onClose, onSaved, onCustomerCreated }: {
  data: DashboardData; day: string; initialUnit?: string; initialBooking?: Booking;
  onCustomerCreated: (customer: Customer) => void;
  onClose: () => void; onSaved: (booking: Booking) => Promise<void>;
}) {
  const [addingCustomer, setAddingCustomer] = useState(false);
  const editing = Boolean(initialBooking);
  const [unitId, setUnitId] = useState(initialBooking?.unitId || initialUnit || '');
  const [customerId, setCustomerId] = useState(initialBooking?.customerId || '');
  const [start, setStart] = useState(initialBooking ? localInput(initialBooking.start) : `${day}T09:00`);
  const [end, setEnd] = useState(initialBooking ? localInput(initialBooking.end) : `${day}T17:00`);
  const [pic, setPic] = useState(initialBooking?.pic || '');
  const [picEmployeeId,setPicEmployeeId]=useState(initialBooking?.picEmployeeId||'');
  const [deliveryEmployeeId,setDeliveryEmployeeId]=useState(initialBooking?.deliveryEmployeeId||''),[deliveryBy,setDeliveryBy]=useState(initialBooking?.deliveryBy||'');
  const [returnEmployeeId,setReturnEmployeeId]=useState(initialBooking?.returnEmployeeId||''),[returnBy,setReturnBy]=useState(initialBooking?.returnBy||'');
  const [receivedByEmployeeId,setReceivedByEmployeeId]=useState(''),[receivedBy,setReceivedBy]=useState('');
  const [notes, setNotes] = useState(initialBooking?.notes || '');
  const [customerKind,setCustomerKind]=useState<BookingPaymentSetup['customerKind']>('consumer');
  const [paymentMode,setPaymentMode]=useState<BookingPaymentSetup['mode']>('unpaid');
  const [dp,setDP]=useState('');
  const [paymentMethod,setPaymentMethod]=useState<'transfer'|'cash'|'qris'>('transfer');
  const [paymentDate,setPaymentDate]=useState(todayISO());
  const [paymentReference,setPaymentReference]=useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [choosingDates, setChoosingDates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Booking>();
  const requestId = useRef(crypto.randomUUID());
  const startISO = isoInput(start), endISO = isoInput(end);
  const valid = Boolean(startISO && endISO && startISO < endISO);
  const selected = data.units.find(u => u.id === unitId);
  const unitAvailable = selected && valid && available(data, selected, startISO, endISO, initialBooking?.id);
  const duration = valid ? days(startISO, endISO) : 0;
  const rate = initialBooking && initialBooking.unitId === unitId ? initialBooking.total / days(initialBooking.start, initialBooking.end) : selected?.rate || 0;
  const refundRequired = Boolean(initialBooking && duration * rate < initialBooking.paid);
  const receiving=paymentMode==='dp'||paymentMode==='full';
  const receivedAmount=paymentMode==='full'?duration*rate:paymentMode==='dp'?Number(dp):0;
  const invalidPayment=!editing&&receiving&&(!paymentDate||paymentDate>todayISO()||!Number.isSafeInteger(receivedAmount)||receivedAmount<=0||(paymentMode==='dp'&&receivedAmount>=duration*rate));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving || choosingDates) return; setError('');
    if (!valid) { setError('Waktu selesai harus setelah waktu mulai.'); return; }
    if(invalidPayment){setError('Periksa nominal dan tanggal pembayaran yang diterima.');return;}
    setSaving(true);
    try {
      const input = { customerId, unitId, start: startISO, end: endISO, pic, picEmployeeId, deliveryEmployeeId, deliveryBy, returnEmployeeId, returnBy, notes };
      const response = await fetch(editing ? `/api/bookings/${initialBooking!.id}` : '/api/bookings', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { action: 'update', revision: initialBooking!.revision || 0, reason, input } : { requestId: requestId.current, ...input, paymentSetup:{customerKind,mode:paymentMode,amount:receivedAmount,reference:receiving?paymentReference:'',...(receiving?{method:paymentMethod,date:paymentDate,receivedByEmployeeId,receivedBy}:{})} }),
      });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      notifyWorkspaceChanged();setSaved(result.booking); await onSaved(result.booking);
    } catch (error) { setError(error instanceof TypeError ? 'Koneksi terputus. Periksa koneksi lalu coba simpan kembali.' : (error as Error).message || 'Booking gagal disimpan. Coba lagi.'); }
    finally { setSaving(false); }
  }
  if (addingCustomer) return <CustomerForm data={data} onClose={() => setAddingCustomer(false)} onSaved={async customer => {
    onCustomerCreated(customer);
    setCustomerId(customer.id);
  }}/>;
  return <Drawer title={saved ? 'Booking tersimpan' : editing ? 'Ubah booking' : 'Booking baru'} subtitle={editing ? initialBooking!.id : 'RENTAL / BOOKING'} onClose={() => !saving && onClose()}>
    {saved ? <div className="drawer-body success-state"><CircleCheck size={48} /><h3>{saved.id}</h3>
      <p>{editing ? 'Perubahan dan riwayat booking tersimpan. Jadwal kendaraan sudah diperbarui.' : 'Booking dikonfirmasi dan jadwal kendaraan sudah dicadangkan.'}</p>
      <p className="muted">{editing ? 'Pembayaran yang telah diterima tetap tercatat.' : `Sudah dibayar ${money(saved.paid)}. Sisa tagihan ${money(saved.total-saved.paid)}.${saved.paymentSetup?.mode==='after_return'?' Pembayaran disepakati setelah rental selesai.':''}`} Data tersimpan di workspace ini.</p>
      <button className="button primary" onClick={onClose}>Kembali ke halaman <ArrowRight size={16} /></button>
    </div> : <form onSubmit={submit} className="booking-form"><div className="drawer-body">
      <section className="form-section"><h3><span>01</span> Pelanggan</h3>
        <label htmlFor="customer">Pilih pelanggan</label><select id="customer" required value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Pilih pelanggan terdaftar</option>{data.customers.filter(c=>(!c.archivedAt&&c.status!=='blocked')||c.id===initialBooking?.customerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <p className="field-hint">Belum terdaftar? Tambahkan pelanggan langsung dari booking ini.</p>
        <button type="button" className="button" disabled={saving} onClick={() => setAddingCustomer(true)}><Plus size={15}/>Tambah pelanggan</button>
      </section>
      <section className="form-section"><h3><span>02</span> Periode & kendaraan</h3>
        <BookingDatePicker onOpenChange={setChoosingDates} start={start.slice(0,10)} end={end.slice(0,10)} startTime={start.slice(11)} endTime={end.slice(11)} onChange={(from,to,deliveryTime,returnTime)=>{setStart(`${from}T${deliveryTime}`);setEnd(`${to}T${returnTime}`);}}/>
        {!valid&&<p className="form-error" role="alert">Tanggal dan jam kembali harus setelah waktu mobil diantar.</p>}
        <label htmlFor="unit">Pilih kendaraan</label><select id="unit" required value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">Pilih kendaraan yang tersedia</option>{data.units.filter(u=>!u.archivedAt).map(u => {
          const ready = valid && available(data, u, startISO, endISO, initialBooking?.id);
          return <option key={u.id} value={u.id} disabled={!ready}>{u.name} · {u.plate}{!ready ? ' — tidak tersedia' : ''}</option>;
        })}</select>
        {selected && <div className={`inline-info ${!unitAvailable ? 'error-inline' : ''}`}><VehicleSymbol unit={selected} size={16}/>{unitAvailable ? `${selected.owner}` : 'Unit tidak tersedia pada periode ini.'}</div>}
      </section>
      <section className="form-section"><h3><span>03</span> Penanggung jawab</h3>
        <EmployeeSelect id="pic" label="PIC booking" data={data} role="booking" required value={picEmployeeId} previousId={initialBooking?.picEmployeeId} previousName={initialBooking?.pic} onChange={(id,name)=>{setPicEmployeeId(id);setPic(name);}}/>
        <EmployeeSelect id="booking-delivery" label="Petugas pengantaran" data={data} role="delivery" value={deliveryEmployeeId} previousId={initialBooking?.deliveryEmployeeId} previousName={initialBooking?.deliveryBy} onChange={(id,name)=>{setDeliveryEmployeeId(id);setDeliveryBy(name);}}/>
        <EmployeeSelect id="booking-return" label="Petugas pengembalian" data={data} role="delivery" value={returnEmployeeId} previousId={initialBooking?.returnEmployeeId} previousName={initialBooking?.returnBy} onChange={(id,name)=>{setReturnEmployeeId(id);setReturnBy(name);}}/>
        <label htmlFor="notes">Catatan <small>Opsional</small></label><textarea id="notes" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Kebutuhan atau catatan untuk tim…" />
        {editing && <><label htmlFor="change-reason">Alasan perubahan</label><textarea id="change-reason" rows={2} maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} placeholder="Contoh: pelanggan memperpanjang periode sewa" /></>}
      </section>
      {!editing&&<section className="form-section"><h3><span>04</span> Pembayaran</h3>
        <label htmlFor="booking-customer-kind">Jenis pelanggan booking</label><select id="booking-customer-kind" value={customerKind} onChange={e=>{const kind=e.target.value as BookingPaymentSetup['customerKind'];setCustomerKind(kind);if(paymentMode==='unpaid'||paymentMode==='after_return')setPaymentMode(kind==='rental_partner'?'after_return':'unpaid');}}>{Object.entries(bookingCustomerNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <label htmlFor="booking-payment-mode">Pilihan pembayaran</label><select id="booking-payment-mode" value={paymentMode} onChange={e=>setPaymentMode(e.target.value as BookingPaymentSetup['mode'])}>{Object.entries(bookingPaymentNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        {receiving?<><label htmlFor="booking-payment-amount">{paymentMode==='dp'?'DP sudah diterima':'Pelunasan sudah diterima'} <small>Rp</small></label><input id="booking-payment-amount" type="number" min={1} max={paymentMode==='dp'?duration*rate-1:duration*rate} step={1} required readOnly={paymentMode==='full'} value={paymentMode==='full'?duration*rate:dp} onChange={e=>setDP(e.target.value)}/>
        <div className="form-grid"><div><label htmlFor="booking-payment-method">Metode pembayaran</label><select id="booking-payment-method" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as typeof paymentMethod)}><option value="transfer">Transfer</option><option value="cash">Tunai</option><option value="qris">QRIS</option></select></div><div><label htmlFor="booking-payment-date">Tanggal pembayaran</label><DateField id="booking-payment-date" type="date" required max={todayISO()} value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></div></div>
        <EmployeeSelect id="booking-received-by" label="Penerima pembayaran" data={data} role="payment" required value={receivedByEmployeeId} onChange={(id,name)=>{setReceivedByEmployeeId(id);setReceivedBy(name);}}/>
        <label htmlFor="booking-payment-reference">Referensi pembayaran <small>Opsional</small></label><input id="booking-payment-reference" maxLength={150} value={paymentReference} onChange={e=>setPaymentReference(e.target.value)}/><p className="field-hint">Isi hanya uang yang sudah diterima. Pembayaran ini dibawa ke invoice tanpa dicatat dua kali.</p></>:<p className="inline-info">{paymentMode==='after_return'?'Tagihan dibayar setelah rental selesai. Belum ada uang diterima; piutang tetap sebesar total sewa.':'Belum ada uang diterima. Pembayaran berikutnya dicatat melalui Invoice.'}</p>}
        {invalidPayment&&<p className="form-error" role="alert">{paymentMode==='dp'?'DP harus lebih dari nol dan kurang dari total sewa.':'Pilih kendaraan untuk menghitung pelunasan.'} Pastikan tanggal pembayaran tidak melewati hari ini.</p>}
      </section>}
      <div className="price-summary"><div><CalendarDays size={18} /><strong>Ringkasan biaya</strong></div><p><span>Durasi sewa</span><strong>{duration || '—'} hari</strong></p><p><span>Tarif harian</span><strong>{money(rate)}</strong></p><p className="price-total"><span>Total sewa</span><strong>{money(rate * duration)}</strong></p>
        {!editing&&<><p><span>Sudah diterima</span><strong>{money(receivedAmount)}</strong></p><p><span>Sisa tagihan</span><strong>{money(Math.max(0,duration*rate-receivedAmount))}</strong></p></>}
        {initialBooking && <><p><span>Total sebelumnya</span><strong>{money(initialBooking.total)}</strong></p><p><span>Sudah dibayar</span><strong>{money(initialBooking.paid)}</strong></p><p><span>Selisih tagihan</span><strong>{money(rate * duration - initialBooking.total)}</strong></p></>}
      </div>
      <p className="inline-info"><Info size={16} />Tarif per 24 jam, dibulatkan ke atas. Tarif lama dipertahankan saat kendaraan tidak berubah. Pelunasan berikutnya dikelola melalui Invoice.</p>
      {refundRequired && <p className="form-error" role="alert">Total baru lebih kecil dari pembayaran yang diterima. Penyelesaian refund diperlukan sebelum perubahan ini.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div><footer className="drawer-footer"><button type="button" className="button" disabled={saving} onClick={onClose}>Batal</button><button className="button primary" type="submit" disabled={saving || choosingDates || !unitAvailable || refundRequired || invalidPayment}>{saving ? <LoaderCircle className="spin" size={16} /> : <CircleCheck size={16} />}{saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan booking'}</button></footer></form>}
  </Drawer>;
}
