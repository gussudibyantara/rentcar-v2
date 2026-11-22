import Link from 'next/link';
import {BarChart3,ChartPie,ArrowUpRight} from 'lucide-react';
import type {MonthlyReport} from '@/lib/monthly-report';
import {reportComposition} from '@/lib/monthly-report';
import {money} from '@/lib/format';

export default function ReportCharts({report:r}:{report:MonthlyReport}){
 const top=r.vehicles.filter(v=>v.departures>0).slice(0,5),maximum=Math.max(1,...top.map(v=>v.departures));
 const composition=reportComposition(r),colors=['#12b54f','#ff1400','#ffca58'],labels=['Keuntungan','Pengeluaran','Hak rekanan'];
 const circumference=2*Math.PI*44;let offset=0;
 return <div className="report-chart-grid">
  <section className="panel report-activity"><header className="report-panel-heading"><div><h2><BarChart3 size={17}/>Kendaraan paling sering keluar</h2><p>Jumlah pengantaran pada bulan pilihan.</p></div><span className="badge blue">{r.departures.length} kali keluar</span></header>
   {top.length?<div className="report-bar-chart" role="group" aria-label="Peringkat kendaraan berdasarkan jumlah pengantaran"><div className="report-chart-scale" aria-hidden="true">{[maximum,maximum*.75,maximum*.5,maximum*.25,0].map((n,i)=><span key={i}>{Number.isInteger(n)?n:n.toFixed(1)}</span>)}</div><div className="report-bars">{top.map((v,index)=><Link key={v.unit.id} href={'/units?record='+encodeURIComponent(v.unit.id)} className="report-bar-column" aria-label={`${v.unit.name}, ${v.unit.plate}, ${v.departures} kali keluar`}><div className="report-bar-track"><span className={'report-bar '+(index===0?'leading':'')} style={{height:`${v.departures/maximum*100}%`}}/><span className="report-bar-tooltip">{v.departures} kali keluar</span></div><strong>{v.unit.name}</strong><small>{v.unit.plate}</small></Link>)}</div></div>:<div className="report-chart-empty">Belum ada kendaraan keluar pada bulan ini.</div>}
  </section>
  <section className="panel report-income"><header className="report-panel-heading"><div><h2><ChartPie size={17}/>Total Pendapatan</h2><p>Pembagian pendapatan sewa bulan pilihan.</p></div>{r.provisional&&<span className="badge yellow">Estimasi</span>}</header>
   <div className="report-income-body"><div className="report-donut"><svg viewBox="0 0 120 120" role="img" aria-label={r.incomplete?'Komposisi belum tersedia; skema rekanan belum lengkap.':`Pendapatan ${money(r.revenue)}, keuntungan ${money(r.profit||0)}, pengeluaran ${money(r.expenses)}, hak rekanan ${money(r.partnerIncome)}.`}><circle cx="60" cy="60" r="44" fill="none" stroke="var(--border)" strokeWidth="13"/>{composition.map((part,i)=>{const position=offset;offset+=part.share*circumference;return <circle key={labels[i]} cx="60" cy="60" r="44" fill="none" stroke={colors[i]} strokeWidth="13" strokeDasharray={`${part.share*circumference} ${circumference}`} strokeDashoffset={-position} transform="rotate(-90 60 60)"/>;})}</svg><div><strong title={money(r.revenue)}>{money(r.revenue,true)}</strong><span>Total pendapatan</span></div></div>
    <dl className="report-income-legend">{labels.map((label,i)=><div key={label}><dt><i style={{background:colors[i]}}/>{label}</dt><dd><strong>{(i===0&&r.profit===null||i===2&&r.incomplete)?'Belum lengkap':money([r.profit||0,r.expenses,r.partnerIncome][i])}</strong><span>{composition.length?`${(composition[i].share*100).toLocaleString('id-ID',{maximumFractionDigits:1})}%`:'—'}</span></dd></div>)}</dl>
   </div>
   {r.incomplete?<p className="report-chart-note">Lengkapi skema rekanan untuk melihat keuntungan. <Link href="/partners">Kelola skema <ArrowUpRight size={12}/></Link></p>:r.profit!==null&&r.profit<0?<p className="report-chart-note danger-text">Rugi operasional {money(-r.profit)}. Persentase menunjukkan pembagian biaya dan hak rekanan.</p>:r.partnerIncome<0?<p className="report-chart-note">Hak rekanan bernilai kredit; komposisi persentase belum ditampilkan.</p>:null}
  </section>
 </div>;
}
