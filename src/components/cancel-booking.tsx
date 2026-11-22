'use client';
import {notifyWorkspaceChanged} from '@/lib/workspace-sync';
import { useState } from 'react';
import { LoaderCircle, XCircle } from 'lucide-react';
import Drawer from './drawer';
import type { Booking } from '@/lib/types';
export default function CancelBooking({ booking, onClose, onSaved }: { booking: Booking; onClose: () => void; onSaved: () => Promise<void> }) {
  const [reason, setReason] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  return <Drawer title="Batalkan booking" subtitle={booking.id} onClose={() => !saving && onClose()}><form className="booking-form" onSubmit={async e => {
    e.preventDefault(); if (saving) return; setSaving(true); setError('');
    try { const response = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', revision: booking.revision || 0, reason }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error);notifyWorkspaceChanged(); await onSaved(); onClose(); }
    catch (error) { setError(error instanceof TypeError ? 'Koneksi terputus. Coba kembali.' : (error as Error).message); } finally { setSaving(false); }
  }}><div className="drawer-body"><p>Jadwal kendaraan akan dilepas. Data booking dan alasan pembatalan tetap disimpan dalam riwayat.</p><section className="form-section"><label htmlFor="cancel-reason">Alasan pembatalan</label><textarea id="cancel-reason" rows={4} required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Jelaskan alasan pembatalan booking ini…" /></section>{error && <p role="alert" className="form-error">{error}</p>}</div><footer className="drawer-footer"><button type="button" className="button" disabled={saving} onClick={onClose}>Kembali</button><button className="button danger-button" disabled={saving} type="submit">{saving ? <LoaderCircle size={15} className="spin" /> : <XCircle size={15} />}Ya, batalkan booking</button></footer></form></Drawer>;
}
