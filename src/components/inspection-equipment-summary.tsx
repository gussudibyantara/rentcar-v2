import type {Inspection} from '@/lib/types';
import {Badge} from './rental-ui';
export default function InspectionEquipmentSummary({inspection}:{inspection:Inspection}){
 if(!inspection.equipment?.length)return null;
 const returned=inspection.type==='checkin';
 return <section className="detail-section equipment-summary"><h3>{returned?'Pengembalian perlengkapan':'Perlengkapan diserahkan'}</h3><div>{inspection.equipment.map(item=><article key={item.id}><span><strong>{item.name}</strong><small>{returned?'Saat keluar':'Standar tersedia'}: {item.expected} · {returned?'Kembali':'Diserahkan'}: {item.quantity}</small></span><Badge tone={returned&&item.quantity<item.expected?'yellow':'green'}>{returned&&item.quantity<item.expected?`Kurang ${item.expected-item.quantity}`:`${item.quantity} item`}</Badge></article>)}</div>{returned&&inspection.equipment.some(e=>e.quantity<e.expected)&&<p className="field-hint">Selisih dicatat untuk ditindaklanjuti. Tidak ada tagihan atau potongan deposit otomatis.</p>}</section>;
}
