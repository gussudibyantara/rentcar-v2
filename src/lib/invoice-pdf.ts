import { PDFDocument,rgb,type PDFFont,type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Invoice } from './types';
import { invoicePaid,invoiceBalance,invoicePaymentStatus,paymentMethod } from './invoice-shared';
import { money,dateLabel,days } from './format';
import { readAssetBytes } from './store';
export async function generateInvoicePDF(i:Invoice){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const fonts=path.join(process.cwd(),'node_modules','@fontsource','inter','files');
 const regular=await pdf.embedFont(await readFile(path.join(fonts,'inter-latin-400-normal.woff')),{subset:true}),bold=await pdf.embedFont(await readFile(path.join(fonts,'inter-latin-700-normal.woff')),{subset:true});
 const ink=rgb(.13,.13,.13),muted=rgb(.50,.50,.54),accent=rgb(.94,.306,.137),line=rgb(.90,.90,.91);const width=595.28,height=841.89,left=44,right=width-44,content=right-left;let page:PDFPage,y=0;
 const clean=(s:string)=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\u00a0/g,' ');
 function text(value:string,x:number,at:number,size=9,font:PDFFont=regular,color=ink){page.drawText(clean(value),{x,y:at,size,font,color});}
 function wrap(value:string,max:number,size=9,font:PDFFont=regular){const lines:string[]=[];for(const paragraph of clean(value).split('\n')){let current='';for(const word of paragraph.trim().split(/\s+/)){const candidate=current?current+' '+word:word;if(font.widthOfTextAtSize(candidate,size)<=max){current=candidate;continue;}if(current){lines.push(current);current='';}for(const char of word){if(current&&font.widthOfTextAtSize(current+char,size)>max){lines.push(current);current='';}current+=char;}}lines.push(current);}return lines;}

 function addPage(){page=pdf.addPage([width,height]);y=height-46;text(i.company.name.slice(0,75),left,y,9,bold);text(`${i.number||'DRAFT'}  /  ${i.bookingId}`,left,y-16,8,regular,muted);page.drawLine({start:{x:left,y:y-26},end:{x:right,y:y-26},thickness:.6,color:line});y-=48;}
 function ensure(space:number){if(y-space<62)addPage();}
 function paragraph(value:string,max=content,size=9,font:PDFFont=regular){for(const l of wrap(value,max,size,font)){ensure(size+6);text(l,left,y,size,font);y-=size+5;}}
 function section(title:string){ensure(36);y-=12;text(title.toUpperCase(),left,y,8,bold,muted);y-=20;}
 function total(label:string,value:number,strong=false){ensure(25);text(label,left+225,y,strong?11:9,strong?bold:regular);const s=money(value);text(s,right-(strong?bold:regular).widthOfTextAtSize(s,strong?12:9),y,strong?12:9,strong?bold:regular);y-=23;}
 page=pdf.addPage([width,height]);y=height-48;
 const top=y;let companyX=left,companyWidth=300;
 if(i.company.logoId){const bytes=await readAssetBytes(i.company.logoId);const image=bytes[0]===137?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);const scale=Math.min(80/image.width,38/image.height);page.drawImage(image,{x:left,y:top-35,width:image.width*scale,height:image.height*scale});companyX+=96;companyWidth=205;}
 const title='INVOICE';text(title,right-bold.widthOfTextAtSize(title,24),top,24,bold);const docStatus=i.status==='draft'?'DRAFT':i.status==='void'?'DIBATALKAN':invoicePaymentStatus(i).toUpperCase();text(docStatus,right-bold.widthOfTextAtSize(docStatus,9),top-22,9,bold,i.status==='void'?muted:accent);
 for(const l of wrap(i.company.name,companyWidth,12,bold)){text(l,companyX,y,12,bold);y-=17;}
 for(const value of [i.company.address,[i.company.phone,i.company.email].filter(Boolean).join(' | ')].filter(Boolean))for(const l of wrap(value,companyWidth)){text(l,companyX,y);y-=14;}
 y=Math.min(y,top-50)-16;
 paragraph(`Nomor: ${i.number||'Belum diterbitkan'}    |    Booking: ${i.bookingId}`);paragraph(`Terbit: ${i.issueDate}    |    Jatuh tempo: ${i.dueDate}`);
 section('Ditagihkan kepada');paragraph(i.source.customer.name,content,11,bold);if(i.source.customer.address)paragraph(i.source.customer.address);paragraph([i.source.customer.phone,i.source.customer.email,i.source.customer.billingContact].filter(Boolean).join(' | ')||'Kontak belum diisi');
 section('Periode dan kendaraan');paragraph(`${i.source.unit.name} - ${i.source.unit.plate}`);paragraph(`${dateLabel(i.source.start,{year:'numeric',hour:'2-digit',minute:'2-digit'})} s/d ${dateLabel(i.source.end,{year:'numeric',hour:'2-digit',minute:'2-digit'})} WITA`);
 section('Rincian tagihan');
 function heading(){ensure(35);page.drawRectangle({x:left,y:y-10,width:content,height:25,color:rgb(.965,.965,.97)});text('DESKRIPSI',left+8,y,8,bold,muted);text('QTY',left+265,y,8,bold,muted);text('HARGA',left+310,y,8,bold,muted);text('JUMLAH',right-70,y,8,bold,muted);y-=32;}
 heading();const rows=[{description:`Sewa kendaraan (${days(i.source.start,i.source.end)} hari)`,quantity:1,price:i.source.baseTotal},...i.lines];
 for(const row of rows){const lines=wrap(row.description,250);const rowHeight=Math.max(30,lines.length*14+12);if(y-rowHeight<62){addPage();heading();}for(let n=0;n<lines.length;n++)text(lines[n],left+8,y-n*14);text(String(row.quantity),left+270,y);const unitPrice=money(row.price);text(unitPrice,left+395-regular.widthOfTextAtSize(unitPrice,8),y,8);const s=money(row.quantity*row.price);text(s,right-8-regular.widthOfTextAtSize(s,9),y);y-=rowHeight;page.drawLine({start:{x:left,y:y+10},end:{x:right,y:y+10},thickness:.5,color:line});}
 ensure(185);y-=12;total('Subtotal',i.subtotal);total('Diskon',-i.discount||0);total(`Pajak manual (${i.taxRate}%)`,i.tax);total('Total tagihan',i.total,true);total('Sudah dibayar',invoicePaid(i));total('Sisa tagihan',invoiceBalance(i),true);
 section('Pembayaran');const payments=i.payments;if(!payments.length)paragraph('Belum ada pembayaran tercatat.');for(const p of payments){paragraph(`${p.date||'Tanggal kas tidak tersedia'} | ${paymentMethod[p.method]} | ${money(p.amount)}${p.reversedAt?' | DIBALIK':''}`,content,9,bold);if(p.reference)paragraph(`Referensi: ${p.reference}`);if(p.reversedAt)paragraph(`Alasan koreksi: ${p.reversalReason||'-'}`);}
 if(i.company.paymentInstructions){section('Instruksi pembayaran');paragraph(i.company.paymentInstructions);}if(i.notes){section('Catatan');paragraph(i.notes);}if(i.terms){section('Ketentuan');paragraph(i.terms);}y-=8;paragraph('DP mengurangi tagihan sewa. Deposit jaminan tidak termasuk invoice ini.',content,8);if(i.status==='draft')paragraph('Dokumen draft ini belum merupakan tagihan terbit.',content,8);
 for(const [n,p]of pdf.getPages().entries()){p.drawLine({start:{x:left,y:43},end:{x:right,y:43},thickness:.5,color:line});p.drawText('TravelOS | Invoice rental | IDR',{x:left,y:28,size:7,font:regular,color:muted});p.drawText(`${n+1} / ${pdf.getPageCount()}`,{x:right-35,y:28,size:7,font:regular,color:muted});}
 pdf.setTitle(`${i.number||'Draft invoice'} - ${i.source.customer.name}`);pdf.setAuthor(i.company.name);return pdf.save();
}
