import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSeed } from '../src/lib/seed';
import { addDays, addMonths, bookingsInRange, calendarRange, conflictIds, dayBookings, monthDays, timelineSegments, weekStart } from '../src/lib/calendar';
import { changeBooking } from '../src/lib/booking-changes';
import { available } from '../src/lib/rules';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T02:00:00Z')); });
afterEach(() => vi.useRealTimers());
describe('Calendar dates and segments', () => {
  it('keeps WITA dates correct across month, year and leap-day boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(calendarRange('2026-11-15', 'month').end).toBe('2026-12-01');
    const grid = monthDays('2026-11-01'); expect(grid).toHaveLength(42); expect(grid[0]).toBe('2026-10-26'); expect(grid[41]).toBe('2026-12-06');
  });
  it('excludes bookings ending at midnight from the following day and hides cancellations', () => {
    const d = makeSeed(), b = d.bookings[6]; b.start = '2026-11-01T09:00:00+08:00'; b.end = '2026-11-02T00:00:00+08:00';
    expect(dayBookings([b], '2026-11-01')).toHaveLength(1); expect(dayBookings([b], '2026-11-02')).toHaveLength(0);
    b.status = 'cancelled'; expect(dayBookings([b], '2026-11-01')).toHaveLength(0);
  });
  it('clips long rentals and separates overlapping visual lanes without inventing conflicts', () => {
    const d = makeSeed(), b = { ...d.bookings[6], start: '2026-10-20T09:00:00+08:00', end: '2026-11-10T09:00:00+08:00' };
    const second = { ...b, id: 'B2', start: '2026-10-27T09:00:00+08:00' };
    const segments = timelineSegments([b, second], '2026-10-26');
    expect(segments[0]).toMatchObject({ first: 0, span: 7, lane: 0 }); expect(segments[1].lane).toBe(1); expect(conflictIds([b, second]).size).toBe(2);
    second.unitId = 'other'; expect(conflictIds([b, second]).size).toBe(0);
    second.unitId = b.unitId; second.status = 'completed'; expect(conflictIds([b, second]).size).toBe(0);
  });
});
describe('Booking updates and cancellations', () => {
  function input(b: ReturnType<typeof makeSeed>['bookings'][0]) { return { customerId: b.customerId, unitId: b.unitId, start: b.start, end: b.end, pic: b.pic, notes: b.notes }; }
  it('reschedules without conflicting with itself, preserves the original rate, and records snapshots', () => {
    const d = makeSeed(), b = d.bookings[6], previous = b.total;
    d.units.find(u => u.id === b.unitId)!.rate *= 10;
    const next = changeBooking(d, b.id, 'update', 0, 'Perpanjangan pelanggan', { ...input(b), end: '2026-11-06T17:00:00+08:00' });
    expect(next.total).toBeGreaterThan(previous); expect(next.total).toBe(5 * 350000); expect(next.paid).toBe(b.paid);
    expect(next.history?.[0].before.total).toBe(previous); expect(next.history?.[0].after.total).toBe(next.total); expect(next.revision).toBe(1);
    expect(() => changeBooking(d, b.id, 'update', 0, 'Old edit', input(b))).toThrow('sudah diperbarui');
  });
  it('rejects a conflicting edit without altering the old booking', () => {
    const d = makeSeed(), b = d.bookings[6], occupied = d.bookings[0], before = JSON.stringify(b);
    expect(() => changeBooking(d, b.id, 'update', 0, 'Ganti kendaraan', { ...input(b), unitId: occupied.unitId, start: occupied.start, end: occupied.end })).toThrow('tidak tersedia');
    expect(JSON.stringify(b)).toBe(before);
  });
  it('blocks refunds and direct editing of active rentals', () => {
    const d = makeSeed(), b = d.bookings[6];
    expect(() => changeBooking(d, b.id, 'cancel', 0, 'Batal')).toThrow('refund');
    expect(() => changeBooking(d, b.id, 'update', 0, 'Dipendekkan', { ...input(b), end: '2026-11-02T17:00:00+08:00' })).toThrow('refund');
    expect(() => changeBooking(d, d.bookings[0].id, 'cancel', 0, 'Batal')).toThrow('Hanya booking');
  });
  it('cancels unpaid bookings, frees the unit and keeps historical amounts and reason', () => {
    const d = makeSeed(), b = d.bookings[8], total = b.total;
    expect(available(d, d.units.find(u => u.id === b.unitId)!, b.start, b.end)).toBe(false);
    const next = changeBooking(d, b.id, 'cancel', 0, 'Pelanggan membatalkan');
    expect(next.total).toBe(total); expect(next.status).toBe('cancelled'); expect(next.history?.[0].reason).toBe('Pelanggan membatalkan');
    expect(available(d, d.units.find(u => u.id === b.unitId)!, b.start, b.end)).toBe(true);
    expect(bookingsInRange([next], next.start, next.end)).toHaveLength(0);
  });
});
