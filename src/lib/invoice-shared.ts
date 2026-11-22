import type { Invoice, InvoiceLine, InvoicePayment } from './types';
import { todayISO } from './format';
export const invoiceStates={draft:'Draft',issued:'Terbit',void:'Dibatalkan'};
export function invoiceTotals(base:number,lines:InvoiceLine[],discount:number,taxRate:number){const subtotal=base+lines.reduce((n,l)=>n+l.quantity*l.price,0);const tax=Math.round((subtotal-discount)*taxRate/100);return {subtotal,tax,total:subtotal-discount+tax};}
export const invoicePaid=(i:Invoice)=>i.payments.filter(p=>!p.reversedAt).reduce((n,p)=>n+p.amount,0);
export const invoiceBalance=(i:Invoice)=>Math.max(0,i.total-invoicePaid(i));
export const invoicePaymentStatus=(i:Invoice)=>invoicePaid(i)>=i.total?'Lunas':invoicePaid(i)>0?'Sebagian':'Belum dibayar';
export const invoiceOverdue=(i:Invoice,day=todayISO())=>i.status==='issued'&&i.dueDate<day&&invoiceBalance(i)>0;
export const paymentMethod:Record<InvoicePayment['method'],string>={opening:'Saldo awal booking',transfer:'Transfer',cash:'Tunai',qris:'QRIS'};

/** Single source for invoice visibility in Bookings, detail and invoice picker. */
export function activeBookingInvoice(data:Pick<import('./types').DashboardData,'invoices'>,bookingId:string){return data.invoices?.find(i=>i.bookingId===bookingId&&i.status!=='void');}
export function invoiceBookingOptions(data:import('./types').DashboardData){
 return data.bookings.map(booking=>{
  const invoice=activeBookingInvoice(data,booking.id),customer=data.customers.find(c=>c.id===booking.customerId),unit=data.units.find(u=>u.id===booking.unitId);
  const status=booking.status==='cancelled'?'Booking dibatalkan':invoice?invoice.status==='draft'?'Draft tersimpan':`${invoice.number} · ${invoicePaymentStatus(invoice)}`:'Belum ada invoice';
  return {booking,invoice,label:`${booking.id} · ${customer?.name||'Pelanggan tidak tersedia'} · ${unit?.plate||'Kendaraan tidak tersedia'} — ${status}`,disabled:booking.status==='cancelled'&&!invoice};
 });
}
