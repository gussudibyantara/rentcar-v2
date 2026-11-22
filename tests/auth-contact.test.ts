import { describe,it,expect } from 'vitest';
import { normalizeWhatsApp,contactSchema } from '../src/lib/auth/contact';
describe('WhatsApp contact normalization',()=>{
 it.each(['081234567890','6281234567890','+6281234567890','0812 3456-7890','(+62) 812-3456-7890'])('normalizes Indonesian contact %s',value=>{expect(normalizeWhatsApp(value)).toBe('+6281234567890');});
 it('accepts explicit international dialing codes',()=>{expect(normalizeWhatsApp('+60 12-345 6789')).toBe('+60123456789');});
 it.each([null,undefined,123,'','abc','+62081234567890','0812+34567890','+1234567890123456'])('rejects malformed contact %s',value=>{expect(normalizeWhatsApp(value)).toBeNull();});
 it('defaults feature updates to false and validates explicit boolean choices',()=>{expect(contactSchema.parse({whatsapp:'081234567890'}).updatesOptIn).toBe(false);expect(contactSchema.safeParse({whatsapp:'081234567890',updatesOptIn:'yes'}).success).toBe(false);});
});
