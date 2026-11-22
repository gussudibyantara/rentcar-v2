import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {SettlementForm} from '../src/components/settlement-forms';
import {addDemoData} from '../src/lib/demo-data';
import {makeEmptyData} from '../src/lib/empty-data';
import {todayISO} from '../src/lib/format';
afterEach(()=>vi.unstubAllGlobals());
describe('owner invoice entry',()=>{
 it('keeps the selected current month and owner, shows an estimate, and prevents premature finalization',()=>{vi.stubGlobal('React',React);const data=addDemoData(makeEmptyData()).data,month=todayISO().slice(0,7),partnerId=data.partners![0].id,snapshot=structuredClone(data);const html=renderToStaticMarkup(React.createElement(SettlementForm,{data,month,partnerId,onClose:()=>{},onSaved:async()=>{}}));expect(html).toContain('Buat invoice rekanan');expect(html).toContain('Periode ini masih berjalan');expect(html).toContain(`value="${partnerId}" selected`);expect(html).toContain('Periode tidak diganti otomatis');expect(html).toMatch(/disabled=""[^>]*>Finalisasi &amp; buat invoice/);expect(data).toEqual(snapshot);});
 it('warns about an already-finalized owner/month instead of issuing a duplicate',()=>{vi.stubGlobal('React',React);const data=addDemoData(makeEmptyData()).data,s=data.settlements![0];const html=renderToStaticMarkup(React.createElement(SettlementForm,{data,month:s.month,partnerId:s.partnerId,onClose:()=>{},onSaved:async()=>{}}));expect(html).toContain('Invoice final rekanan untuk bulan ini sudah ada');expect(html).toMatch(/disabled=""[^>]*>Finalisasi &amp; buat invoice/);});
});
