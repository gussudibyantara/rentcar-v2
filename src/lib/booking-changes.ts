import { bookingStaff } from './employee-service';
import type { Booking, BookingInput, BookingSnapshot, DashboardData } from './types';
import { bookingSettlementLocked,capturePartnerTerms } from './partner-rules';
import { assertBooking } from './rules';
import { days } from './format';
export class BookingError extends Error { constructor(message: string, public status = 409) { super(message); } }
export function snapshot(booking: Booking): BookingSnapshot {
  const { customerId, unitId, start, end, total, status, pic, notes, picEmployeeId, deliveryEmployeeId, deliveryBy, returnEmployeeId, returnBy } = booking;
  return { customerId, unitId, start, end, total, status, pic, notes, picEmployeeId, deliveryEmployeeId, deliveryBy, returnEmployeeId, returnBy };
}
export function changeBooking(data: DashboardData, id: string, action: 'update' | 'cancel', revision: number, reason: string, input?: Omit<BookingInput, 'requestId'>) {
  const booking = data.bookings.find(b => b.id === id);
  if (!booking) throw new BookingError('Booking tidak ditemukan.', 404);
  if ((booking.revision || 0) !== revision) throw new BookingError('Booking sudah diperbarui. Muat ulang data sebelum mencoba kembali.');
  if (booking.status !== 'confirmed') throw new BookingError('Hanya booking berstatus Dikonfirmasi yang dapat diubah atau dibatalkan pada tahap ini.');
  if (!reason.trim()) throw new BookingError('Alasan perubahan wajib diisi.', 400);
  if(data.invoices?.some(i=>i.bookingId===id&&i.status==='issued'))throw new BookingError('Booking memiliki invoice terbit. Batalkan invoice tanpa pembayaran sebelum mengubah booking; invoice dibayar memerlukan penyelesaian pembayaran.');
  if(bookingSettlementLocked(data,id))throw new BookingError('Booking sudah masuk rekap rekanan final. Batalkan rekap tanpa pembayaran sebelum mengubah transaksi.');
  const before = snapshot(booking);
  if (action === 'cancel') {
    if (booking.paid > 0) throw new BookingError('Booking memiliki pembayaran. Penyelesaian refund diperlukan sebelum pembatalan.');
    booking.status = 'cancelled';
  } else {
    if (!input) throw new BookingError('Data perubahan belum lengkap.', 400);
    input=bookingStaff(data,input,booking);
    const unit = assertBooking(data, input, id);
    const previousRate = booking.total / days(booking.start, booking.end);
    const total = Math.round(days(input.start, input.end) * (booking.unitId === input.unitId ? previousRate : unit.rate));
    if (total < booking.paid) throw new BookingError('Total baru lebih kecil dari pembayaran yang diterima. Penyelesaian refund diperlukan.');
    if(booking.unitId!==input.unitId||booking.start!==new Date(input.start).toISOString()||booking.end!==new Date(input.end).toISOString())booking.partnerTerms=capturePartnerTerms(data,input);
    Object.assign(booking, input, { start: new Date(input.start).toISOString(), end: new Date(input.end).toISOString(), total });
  }
  booking.revision = (booking.revision || 0) + 1;
  booking.history = [...(booking.history || []), { at: new Date().toISOString(), action: action === 'cancel' ? 'cancelled' : 'updated', reason: reason.trim(), before, after: snapshot(booking) }];
  return booking;
}

/** Operational staff changes do not change rental prices or issued invoice snapshots. */
export function assignBookingStaff(data:DashboardData,id:string,expected:number,reason:string,input:Pick<BookingInput,'pic'|'picEmployeeId'|'deliveryEmployeeId'|'deliveryBy'|'returnEmployeeId'|'returnBy'>){
 const b=data.bookings.find(b=>b.id===id);if(!b)throw new BookingError('Booking tidak ditemukan.',404);
 if((b.revision||0)!==expected)throw new BookingError('Booking sudah diperbarui. Muat ulang data sebelum mencoba kembali.');
 if(b.status==='cancelled')throw new BookingError('Booking dibatalkan tidak dapat ditugaskan.');
 if(!reason.trim())throw new BookingError('Alasan perubahan petugas wajib diisi.',400);
 const before=snapshot(b),staff=bookingStaff(data,input,b);
 Object.assign(b,staff);b.revision=(b.revision||0)+1;b.history=[...(b.history||[]),{at:new Date().toISOString(),action:'updated',reason:'Penugasan petugas: '+reason.trim(),before,after:snapshot(b)}];return b;
}
