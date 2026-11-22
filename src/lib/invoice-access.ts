/** Temporary release lock. Replace with verified server-side plan entitlements when ready. */
export function invoiceFeaturesEnabled():boolean { return false; }
export const INVOICE_LOCK_MESSAGE='Fitur invoice PRO sedang disiapkan dan belum tersedia.';
export function invoiceLockedResponse(){return Response.json({error:INVOICE_LOCK_MESSAGE,code:'INVOICE_LOCKED',feature:'invoices',requiredPlan:'pro'},{status:403});}
