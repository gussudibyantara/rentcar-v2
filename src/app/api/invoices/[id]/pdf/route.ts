import {invoiceFeaturesEnabled,invoiceLockedResponse} from '@/lib/invoice-access';
import { readDashboard } from '@/lib/store';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,ctx:{params:Promise<{id:string}>}){if(!invoiceFeaturesEnabled())return invoiceLockedResponse();try{const {id}=await ctx.params;const data=await readDashboard(),invoice=data.invoices?.find(i=>i.id===id);if(!invoice)return Response.json({error:'Invoice tidak ditemukan.'},{status:404});const bytes=await generateInvoicePDF(invoice);const inline=new URL(request.url).searchParams.get('inline')==='1';return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`${inline?'inline':'attachment'}; filename="${invoice.number||'DRAFT-'+invoice.id}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'PDF gagal dibuat. Periksa logo dan rincian invoice, lalu coba lagi.'},{status:500});}}
