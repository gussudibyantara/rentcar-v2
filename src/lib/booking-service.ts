import { employeeIdSchema,bookingStaff,resolveEmployee } from './employee-service';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { assertBooking } from './rules';
import { capturePartnerTerms } from './partner-rules';
import { days,todayISO } from './format';
import { fail,sameRequest } from './api-utils';
import type { Booking,DashboardData,BookingPaymentSetup } from './types';
const paymentSchema=z.object({receivedByEmployeeId:employeeIdSchema,receivedBy:z.string().max(100).optional(),customerKind:z.enum(['consumer','rental_partner']),mode:z.enum(['unpaid','dp','full','after_return']),amount:z.number().int().min(0).max(1000000000000),method:z.enum(['transfer','cash','qris']).optional(),date:z.iso.date().optional(),reference:z.string().trim().max(150).default('')});
const defaultPayment:BookingPaymentSetup={customerKind:'consumer',mode:'unpaid',amount:0,reference:''};
export const bookingSchema=z.object({requestId:z.string().uuid(),customerId:z.string().min(1).max(50),unitId:z.string().min(1).max(50),start:z.iso.datetime({offset:true}),end:z.iso.datetime({offset:true}),picEmployeeId:employeeIdSchema,deliveryEmployeeId:employeeIdSchema,deliveryBy:z.string().max(100).optional(),returnEmployeeId:employeeIdSchema,returnBy:z.string().max(100).optional(),pic:z.string().trim().min(1,'Pilih PIC booking.').max(100),notes:z.string().trim().max(1000).default(''),paymentSetup:paymentSchema.default(defaultPayment)});
export function createBooking(data:DashboardData,raw:z.input<typeof bookingSchema>){
 let input=bookingSchema.parse(raw);input.start=new Date(input.start).toISOString();input.end=new Date(input.end).toISOString();
 const existing=data.bookings.find(b=>b.requestId===input.requestId);
 input={...input,...bookingStaff(data,input,existing)};
 if(input.paymentSetup.mode==='dp'||input.paymentSetup.mode==='full'){const p=input.paymentSetup;input.paymentSetup={...p,receivedBy:resolveEmployee(data,p.receivedByEmployeeId,p.receivedBy,'payment',{id:existing?.paymentSetup?.receivedByEmployeeId,name:existing?.paymentSetup?.receivedBy})};}
 if(existing){sameRequest({...existing,paymentSetup:existing.paymentSetup||defaultPayment},input);return existing;}
 const unit=assertBooking(data,input),total=days(input.start,input.end)*unit.rate,p=input.paymentSetup;
 if(!Number.isSafeInteger(total)||total<=0||total>1000000000000)fail('Total booking tidak valid.',400);
 const received=p.mode==='dp'||p.mode==='full';
 if(received){
  if(!p.method||!p.date)fail('Isi metode dan tanggal pembayaran yang sudah diterima.',400);
  if(p.date>todayISO())fail('Tanggal pembayaran tidak boleh di masa depan.',400);
  if(p.mode==='dp'&&(p.amount<=0||p.amount>=total))fail('DP harus lebih dari nol dan kurang dari total sewa.',400);
  if(p.mode==='full'&&p.amount!==total)fail('Pelunasan harus sama dengan total sewa.',400);
 }else if(p.amount!==0||p.method||p.date||p.reference||p.receivedByEmployeeId||p.receivedBy)fail('Pembayaran belum diterima; nominal harus nol tanpa rincian pembayaran.',400);
 const now=new Date().toISOString(),id=`RN-${Math.max(10499,...data.bookings.map(b=>Number(b.id.slice(3))||0))+1}`;
 const b:Booking={...input,partnerTerms:capturePartnerTerms(data,input),id,status:'confirmed',total,paid:p.amount,createdAt:now};
 if(received)b.initialPayment={...(p.receivedByEmployeeId!==undefined?{receivedByEmployeeId:p.receivedByEmployeeId}:{}),...(p.receivedBy!==undefined?{receivedBy:p.receivedBy}:{}),id:randomUUID(),amount:p.amount,method:p.method!,date:p.date!,reference:p.reference,notes:'Pembayaran diterima saat membuat booking.',attachments:[],createdAt:now,requestId:input.requestId};
 data.bookings.push(b);const customer=data.customers.find(c=>c.id===input.customerId)!;
 data.activities.unshift({id:randomUUID(),title:'Booking baru dikonfirmasi',description:`${customer.name} · ${unit.name}`,at:now,kind:'booking'});
 data.notifications.unshift({id:randomUUID(),title:`Booking ${id} dikonfirmasi`,description:`${customer.name} · ${unit.name}`,read:false,bookingId:id,kind:'booking'});
 if(received)data.activities.unshift({id:randomUUID(),title:'Pembayaran booking diterima',description:`${id} · ${p.mode==='dp'?'DP':'Pelunasan'} · Rp${p.amount} · ${p.method} · ${p.date}`,at:now,kind:'payment'});
 return b;
}
