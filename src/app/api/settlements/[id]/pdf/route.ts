import {invoiceFeaturesEnabled,invoiceLockedResponse} from '@/lib/invoice-access';
import { readDashboard } from '@/lib/store';
import { generateSettlementPDF } from '@/lib/settlement-pdf';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(r:Request,ctx:{params:Promise<{id:string}>}){if(!invoiceFeaturesEnabled())return invoiceLockedResponse();try{const {id}=await ctx.params,d=await readDashboard(),s=d.settlements?.find(s=>s.id===id);if(!s)return Response.json({error:'Rekap tidak ditemukan.'},{status:404});const bytes=await generateSettlementPDF(s),inline=new URL(r.url).searchParams.get('inline')==='1';return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`${inline?'inline':'attachment'}; filename="${s.number}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'PDF rekap belum dapat dibuat. Coba lagi.'},{status:500});}}
