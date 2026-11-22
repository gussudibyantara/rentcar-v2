import {CarFront} from 'lucide-react';
import type {Unit} from '@/lib/types';
export default function VehicleSymbol({unit,size=21,strokeWidth=1.5}:{unit:Pick<Unit,'category'>;size?:number;strokeWidth?:number}){
 if(unit.category!=='Motor')return <CarFront size={size} strokeWidth={strokeWidth}/>;
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="M5 17l4-7h5l5 7M8 9H4M11 17H5m6 0 3-7M14 6h3l2 11M8 13h6l-3 4"/></svg>;
}
