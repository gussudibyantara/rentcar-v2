import { blockedByMaintenance, unresolvedRepair } from './fleet-shared';
import type { Booking, DashboardData, Unit } from './types';
import { todayISO } from './format';
import { available, overlaps } from './rules';
export type CalendarView = 'day' | 'week' | 'month';
export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return todayISO(date);
}
export function addMonths(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+08:00`);
  const dayOfMonth = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(dayOfMonth, last));
  return todayISO(date);
}
export function weekStart(day: string) {
  const weekday = new Date(`${day}T12:00:00+08:00`).getUTCDay();
  return addDays(day, -(weekday === 0 ? 6 : weekday - 1));
}
export function monthDays(day: string) {
  const first = `${day.slice(0, 7)}-01`;
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
export function calendarRange(day: string, view: CalendarView) {
  const start = view === 'month' ? `${day.slice(0, 7)}-01` : view === 'week' ? weekStart(day) : day;
  const end = view === 'month' ? addMonths(start, 1) : addDays(start, view === 'week' ? 7 : 1);
  return { start, end, from: `${start}T00:00:00+08:00`, to: `${end}T00:00:00+08:00` };
}
export const calendarEnd = (b:Booking) => b.status==='returned'&&b.actualEnd?b.actualEnd:b.end;
export function bookingsInRange(bookings: Booking[], from: string, to: string) {
  return bookings.filter(b => b.status !== 'cancelled' && overlaps(b.start, calendarEnd(b), from, to));
}
export function dayBookings(bookings: Booking[], day: string) {
  return bookingsInRange(bookings, `${day}T00:00:00+08:00`, `${addDays(day, 1)}T00:00:00+08:00`)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
}
export function unitState(data: DashboardData, unit: Unit, from: string, to: string) {
  if (unit.archivedAt || unit.condition === 'inactive') return 'inactive';
  if (unit.condition === 'maintenance' || blockedByMaintenance(data,unit.id,from,to)) return 'maintenance';
  if (unresolvedRepair(data,unit.id)) return 'maintenance';
  if (available(data, unit, from, to)) return 'available';
  const bookings = bookingsInRange(data.bookings.filter(b => b.unitId === unit.id), from, to);
  if (bookings.some(b => b.status === 'running') || data.bookings.some(b => b.unitId === unit.id && b.status === 'running' && +new Date(b.end) < Date.now())) return 'running';
  return 'confirmed';
}
export function conflictIds(bookings: Booking[]) {
  const result = new Set<string>();
  const blocking = bookings.filter(b => b.status === 'confirmed' || b.status === 'running');
  for (let i = 0; i < blocking.length; i++) for (let j = i + 1; j < blocking.length; j++) {
    const a = blocking[i], b = blocking[j];
    if (a.unitId === b.unitId && overlaps(a.start, a.end, b.start, b.end)) { result.add(a.id); result.add(b.id); }
  }
  return result;
}
export function timelineSegments(bookings: Booking[], start: string, count = 7) {
  const from = `${start}T00:00:00+08:00`, to = `${addDays(start, count)}T00:00:00+08:00`;
  const lanes: number[] = [];
  return bookingsInRange(bookings, from, to).sort((a, b) => +new Date(a.start) - +new Date(b.start)).map(booking => {
    const first = Math.max(0, Math.floor((+new Date(booking.start) - +new Date(from)) / 86400000));
    const last = Math.min(count, Math.ceil((+new Date(calendarEnd(booking)) - +new Date(from)) / 86400000));
    let lane = lanes.findIndex(end => end <= first);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = last;
    return { booking, first, span: Math.max(1, last - first), lane };
  });
}
