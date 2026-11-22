import {LockKeyhole} from 'lucide-react';
import {INVOICE_LOCK_MESSAGE} from '@/lib/invoice-access';
export function InvoiceProBadge(){return <span className="invoice-pro"><LockKeyhole size={15} aria-hidden="true"/><span>PRO</span></span>;}
export function LockedInvoiceButton({children='Buat invoice',className='button'}:{children?:React.ReactNode;className?:string}){return <button type="button" disabled className={`${className} invoice-locked`} title={INVOICE_LOCK_MESSAGE}><span>{children}</span><InvoiceProBadge/></button>;}
export function InvoiceLockedPanel(){return <section className="panel invoice-locked-panel"><InvoiceProBadge/><h2>Invoice adalah fitur PRO</h2><p>{INVOICE_LOCK_MESSAGE}</p><p>Data invoice yang sudah tersimpan tetap dipertahankan.</p></section>;}
