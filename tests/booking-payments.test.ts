import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { makeSeed } from '../src/lib/seed';
import { createBooking } from '../src/lib/booking-service';
import { saveInvoice,issueInvoice,addInvoicePayment,reverseInvoicePayment,voidInvoice } from '../src/lib/invoice-service';
import { invoicePaid } from '../src/lib/invoice-shared';
import { changeBooking } from '../src/lib/booking-changes';
import { reportData } from '../src/lib/reports';
import type { Booking,BookingPaymentSetup } from '../src/lib/types';
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-03T02:00:00Z'));});afterEach(()=>vi.useRealTimers());
function setup(){const d=makeSeed();d.bookings=[];d.invoices=[];d.partnerAgreements=[];const u=d.units[0];u.ownership='owned';u.owner='Armada sendiri';u.rate=400000;u.condition='ready';return {d,input:{requestId:randomUUID(),customerId:d.customers[0].id,unitId:u.id,start:'2026-11-10T01:00:00Z',end:'2026-11-11T01:00:00Z',pic:'Petugas uji',notes:''}};}
const payment=(mode:BookingPaymentSetup['mode']='dp',amount=100000):BookingPaymentSetup=>({customerKind:'consumer',mode,amount,method:'transfer',date:'2026-11-02',reference:'UJI-PAY'});
function invoice(d:ReturnType<typeof setup>['d'],b:Booking){return saveInvoice(d,{bookingId:b.id,issueDate:'2026-11-03',dueDate:'2026-11-11',company:{name:'Rental Uji',address:'',phone:'',email:'',logoId:'',paymentInstructions:''},lines:[],discount:0,taxRate:0,notes:'',terms:''});}
describe('New booking payment choices',()=>{
 it('keeps old clients unpaid by default',()=>{const {d,input}=setup();const b=createBooking(d,input);expect(b.paid).toBe(0);expect(b.initialPayment).toBeUndefined();expect(b.paymentSetup?.mode).toBe('unpaid');});
 it.each(['consumer','rental_partner'] as const)('supports DP, full and pay after return for %s',customerKind=>{
  for(const mode of ['dp','full','after_return'] as const){const {d,input}=setup();const paid=mode==='dp'?100000:mode==='full'?400000:0;const p=mode==='after_return'?{customerKind,mode,amount:0,reference:''}:{...payment(mode,paid),customerKind};const b=createBooking(d,{...input,paymentSetup:p});expect(b.paid).toBe(paid);expect(b.total-b.paid).toBe(400000-paid);expect(b.paymentSetup?.customerKind).toBe(customerKind);expect(b.initialPayment?.method).toBe(paid?'transfer':undefined);}
 });
 it('rejects zero/excess DP, incorrect full payment, future dates and missing metadata atomically',()=>{
  for(const p of [payment('dp',0),payment('dp',400000),payment('dp',500000),payment('full',399999),{...payment(),date:'2026-11-04'},{...payment(),method:undefined},{...payment(),date:undefined},payment('after_return',100000)]){const {d,input}=setup();expect(()=>createBooking(d,{...input,paymentSetup:p})).toThrow();expect(d.bookings).toHaveLength(0);}
 });
 it('makes retries idempotent and rejects a changed payment request',()=>{const {d,input}=setup();const request={...input,paymentSetup:payment()};const b=createBooking(d,request);expect(createBooking(d,request)).toBe(b);expect(d.bookings).toHaveLength(1);expect(()=>createBooking(d,{...request,paymentSetup:payment('dp',200000)})).toThrow('berbeda');expect(b.paid).toBe(100000);});
 it('moves a real payment into the invoice once, then supports final payment and reporting',()=>{
  const {d,input}=setup();const b=createBooking(d,{...input,paymentSetup:payment()});const id=b.initialPayment!.id;const i=invoice(d,b);issueInvoice(d,i.id,i.revision);expect(i.payments).toHaveLength(1);expect(i.payments[0]).toEqual(b.initialPayment);expect(i.payments[0].id).toBe(id);expect(i.payments[0].date).toBe('2026-11-02');expect(invoicePaid(i)).toBe(100000);
  expect(()=>issueInvoice(d,i.id,i.revision)).toThrow();addInvoicePayment(d,i.id,i.revision,{requestId:randomUUID(),amount:300000,method:'cash',date:'2026-11-03',reference:'',notes:'',attachments:[]});expect(b.paid).toBe(400000);expect(reportData(d,{from:'2026-11-01',to:'2026-11-30',branch:'',unitId:b.unitId,category:''}).outstanding).toBe(0);
 });
 it('retains corrections so voiding and reissuing cannot resurrect the initial payment',()=>{
  const {d,input}=setup();const b=createBooking(d,{...input,paymentSetup:payment()});const i=invoice(d,b);issueInvoice(d,i.id,i.revision);reverseInvoicePayment(d,i.id,i.revision,i.payments[0].id,'Salah catat');expect(b.initialPayment?.reversedAt).toBeTruthy();expect(b.paid).toBe(0);voidInvoice(d,i.id,i.revision,'Perbaikan');const next=invoice(d,b);issueInvoice(d,next.id,next.revision);expect(invoicePaid(next)).toBe(0);expect(next.payments).toHaveLength(0);
 });
 it('blocks cancellation of bookings with a received DP',()=>{const {d,input}=setup();const b=createBooking(d,{...input,paymentSetup:payment()});expect(()=>changeBooking(d,b.id,'cancel',0,'Uji')).toThrow('refund');});
});
