import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {invoiceFeaturesEnabled} from '../src/lib/invoice-access';
import {LockedInvoiceButton,InvoiceLockedPanel} from '../src/components/invoice-lock';
const storage=vi.hoisted(()=>({mutate:vi.fn(),readDashboard:vi.fn()}));
vi.mock('../src/lib/store',()=>storage);
import {POST as createInvoice} from '../src/app/api/invoices/route';
import {PATCH as updateInvoice} from '../src/app/api/invoices/[id]/route';
import {GET as invoicePDF} from '../src/app/api/invoices/[id]/pdf/route';
import {POST as createOwnerInvoice} from '../src/app/api/settlements/route';
import {GET as ownerPDF} from '../src/app/api/settlements/[id]/pdf/route';
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
describe('invoice release lock',()=>{
 it('renders a disabled PRO action without a link or upgrade promise',()=>{
  vi.stubGlobal('React',React);
  expect(invoiceFeaturesEnabled()).toBe(false);
  const html=renderToStaticMarkup(React.createElement(LockedInvoiceButton));
  expect(html).toContain('disabled=""');expect(html).toContain('PRO');expect(html).not.toContain('href=');
  expect(renderToStaticMarkup(React.createElement(InvoiceLockedPanel))).toContain('belum tersedia');
 });
 it.each([
  ['create rental invoice',createInvoice],['edit / issue / pay rental invoice',updateInvoice],['rental PDF',invoicePDF],['create owner invoice',createOwnerInvoice],['owner PDF',ownerPDF],
 ] as const)('blocks %s before reading request or touching data',async(_,handler)=>{
  const response=await handler(new Request('http://localhost/api/invoices',{method:'POST',body:'invalid-json'}),{params:Promise.resolve({id:'any-id'})});
  expect(response.status).toBe(403);expect(await response.json()).toMatchObject({code:'INVOICE_LOCKED',requiredPlan:'pro'});
  expect(storage.mutate).not.toHaveBeenCalled();expect(storage.readDashboard).not.toHaveBeenCalled();
 });
});
