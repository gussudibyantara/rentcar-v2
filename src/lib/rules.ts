import { blockedByMaintenance, unresolvedRepair } from './fleet-shared';
import type { DashboardData, Booking, Unit } from './types';
export const isReserved = (b: Booking) => b.status === 'confirmed' || b.status === 'running';
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) { return +new Date(aStart) < +new Date(bEnd) && +new Date(bStart) < +new Date(aEnd); }
export function available(data: DashboardData, unit: Unit, start: string, end: string, except?: string) { return !unit.archivedAt && unit.condition === 'ready' && !blockedByMaintenance(data,unit.id,start,end) && !unresolvedRepair(data,unit.id) && !data.bookings.some(b => b.id !== except && b.unitId === unit.id && isReserved(b) && overlaps(start,end,b.start,b.status === 'running' && +new Date(b.end) < Date.now() ? '9999-12-31T23:59:59.000Z' : b.end)); }
export function assertBooking(data: DashboardData, input: {customerId:string;unitId:string;start:string;end:string}, except?: string) {
 const unit=data.units.find(u=>u.id===input.unitId);
 if (!unit || !data.customers.some(c=>c.id===input.customerId)) throw new Error('Pelanggan atau kendaraan tidak ditemukan.');
 const customer=data.customers.find(c=>c.id===input.customerId)!;const previous=data.bookings.find(b=>b.id===except);if((customer.archivedAt||customer.status==='blocked')&&previous?.customerId!==customer.id)throw new Error('Pelanggan diblokir atau diarsipkan. Pilih pelanggan aktif.');
 if (!Number.isFinite(+new Date(input.start)) || !Number.isFinite(+new Date(input.end)) || +new Date(input.end)<=+new Date(input.start)) throw new Error('Waktu selesai harus setelah waktu mulai.');
 if (!available(data,unit,input.start,input.end,except)) throw new Error('Kendaraan tidak tersedia pada periode ini. Pilih jadwal atau kendaraan lain.');
 return unit;
}
