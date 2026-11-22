import { z } from 'zod';
/** Normalize a supplied contact number; this does not verify WhatsApp ownership. */
export function normalizeWhatsApp(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const compact=value.trim().replace(/[\s().-]/g,'');
 const number=compact.startsWith('0')?'+62'+compact.slice(1):compact.startsWith('62')?'+'+compact:compact;
 if(!/^\+[1-9]\d{7,14}$/.test(number)||number.startsWith('+620'))return null;
 return number;
}
export const contactSchema=z.object({
 whatsapp:z.string().trim().min(1,'Nomor WhatsApp wajib diisi.').max(30).transform((value,ctx)=>{const normalized=normalizeWhatsApp(value);if(!normalized){ctx.addIssue({code:'custom',message:'Gunakan nomor WhatsApp valid, misalnya 081234567890 atau +6281234567890.'});return z.NEVER;}return normalized;}),
 updatesOptIn:z.boolean().default(false),
});
export function contactMetadata(contact:z.infer<typeof contactSchema>){
 return {whatsapp_number:contact.whatsapp,whatsapp_updates_opt_in:contact.updatesOptIn,whatsapp_updates_consent_at:contact.updatesOptIn?new Date().toISOString():null,whatsapp_updates_consent_version:'feature-updates-v1'};
}
