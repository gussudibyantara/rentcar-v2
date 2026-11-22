import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { makeSeed } from '../src/lib/seed';
import { available, assertBooking, overlaps } from '../src/lib/rules';
import { days, todayISO } from '../src/lib/format';
import { readDashboard, mutate } from '../src/lib/store';
let temp:string;
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T02:00:00.000Z'));temp=await mkdtemp(path.join(tmpdir(),'travelos-test-'));process.env.TRAVELOS_DATA_FILE=path.join(temp,'data.json');});
afterEach(async()=>{await rm(temp,{recursive:true,force:true});delete process.env.TRAVELOS_DATA_FILE;vi.useRealTimers();});
describe('Rental rules',()=>{
 it('seeds dates and quoted amounts consistently in WITA',()=>{const d=makeSeed();expect(d.referenceDate).toBe('2026-11-01');expect(todayISO(new Date(d.bookings[0].end))).toBe(d.referenceDate);expect(todayISO(new Date(d.bookings[6].start))).toBe('2026-11-02');for(const b of d.bookings)expect(b.total).toBe(days(b.start,b.end)*d.units.find(u=>u.id===b.unitId)!.rate);});
 it('uses end-exclusive intervals and rejects real overlap',()=>{expect(overlaps('2026-11-01T09:00Z','2026-11-01T10:00Z','2026-11-01T10:00Z','2026-11-01T11:00Z')).toBe(false);expect(overlaps('2026-11-01T09:00Z','2026-11-01T10:00Z','2026-11-01T09:59Z','2026-11-01T11:00Z')).toBe(true);});
 it('blocks an already reserved unit and a maintenance unit',()=>{const d=makeSeed();const b=d.bookings[0];expect(()=>assertBooking(d,{...b})).toThrow('tidak tersedia');expect(available(d,d.units[14],b.start,b.end)).toBe(false);});
 it('does not offer an overdue running vehicle until returned',()=>{const d=makeSeed();const b=d.bookings[0];b.end='2026-10-31T09:00:00Z';expect(available(d,d.units[0],'2026-11-10T09:00:00Z','2026-11-11T09:00:00Z')).toBe(false);b.status='completed';expect(available(d,d.units[0],'2026-11-10T09:00:00Z','2026-11-11T09:00:00Z')).toBe(true);});
 it('releases cancelled reservations and validates dates and references',()=>{const d=makeSeed();const b=d.bookings[6];b.status='cancelled';expect(available(d,d.units.find(u=>u.id===b.unitId)!,b.start,b.end)).toBe(true);expect(()=>assertBooking(d,{...b,end:b.start})).toThrow('setelah');expect(()=>assertBooking(d,{...b,customerId:'missing'})).toThrow('tidak ditemukan');});
});
describe('Local persistence',()=>{
 it('starts empty and persists explicit changes without inserting samples',async()=>{const d=await readDashboard();for(const value of Object.values(d))if(Array.isArray(value))expect(value).toHaveLength(0);await mutate(s=>{s.customers.push(makeSeed().customers[0]);});const saved=await readDashboard();expect(saved.customers).toHaveLength(1);expect(saved.units).toHaveLength(0);expect(saved.bookings).toHaveLength(0);});
 it('serializes competing reservations so only one can succeed',async()=>{await mutate(s=>{Object.assign(s,makeSeed());});const d=await readDashboard();const input={customerId:d.customers[0].id,unitId:d.units[6].id,start:'2026-11-10T01:00:00Z',end:'2026-11-11T01:00:00Z'};const reserve=()=>mutate(state=>{assertBooking(state,input);state.bookings.push({...input,id:randomUUID(),status:'confirmed',total:400000,paid:0,pic:'Test',notes:'',createdAt:new Date().toISOString()});});const outcomes=await Promise.allSettled([reserve(),reserve()]);expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(1);expect((await readDashboard()).bookings).toHaveLength(d.bookings.length+1);});
 it('a failed write action does not poison later actions',async()=>{await expect(mutate(()=>{throw new Error('Rejected');})).rejects.toThrow('Rejected');await mutate(d=>{d.customers.push(makeSeed().customers[0]);});expect((await readDashboard()).customers).toHaveLength(1);});
});

describe('Browser origin validation',()=>{
 it('accepts the actual browser host when the framework URL is normalized',async()=>{const {originAllowed}=await import('../src/lib/request');expect(originAllowed(new Request('http://localhost:3002/api/bookings',{headers:{host:'127.0.0.1:3002',origin:'http://127.0.0.1:3002'}}))).toBe(true);expect(originAllowed(new Request('http://localhost:3002/api/bookings',{headers:{host:'127.0.0.1:3002',origin:'https://other.example'}}))).toBe(false);expect(originAllowed(new Request('http://localhost:3002/api/bookings',{headers:{host:'127.0.0.1:3002',origin:'null'}}))).toBe(false);});
});
