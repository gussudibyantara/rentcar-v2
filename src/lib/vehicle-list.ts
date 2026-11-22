import type {DashboardData,Unit} from './types';
import {unitState} from './calendar';
/** Counts and list filters share exactly the same membership, including overdue rentals. */
export function vehicleMatchesStatus(data:DashboardData,unit:Unit,status:string,from:string,to:string){
 if(status==='archived')return Boolean(unit.archivedAt);
 if(unit.archivedAt)return false;
 if(status==='all')return true;
 if(status==='running')return data.bookings.some(b=>b.unitId===unit.id&&b.status==='running');
 return unitState(data,unit,from,to)===status;
}
export function vehicleStatCounts(data:DashboardData,from:string,to:string){return Object.fromEntries(['all','available','running','maintenance'].map(status=>[status,data.units.filter(u=>vehicleMatchesStatus(data,u,status,from,to)).length]));}
export function vehicleOwnerLabel(unit:Unit){return unit.ownership==='owned'||(!unit.ownership&&unit.owner==='Armada sendiri')?'Armada Sendiri':unit.owner|| (unit.ownership==='leased'?'Sewa':'Rekanan');}

export function partnerKind(name:string,kind?:'individual'|'company'):'individual'|'company'{return kind||(/^(?:PT\.?|CV\.?|UD\.?|Koperasi|Persero)\s/i.test(name)?'company':'individual');}
export function vehicleOwnerIdentity(data:DashboardData,unit:Unit){const own=unit.ownership==='owned'||(!unit.ownership&&unit.owner==='Armada sendiri');const partner=data.partners?.find(p=>p.id===unit.partnerId);const label=own?'Armada Sendiri':partner?.name||vehicleOwnerLabel(unit);return {label,kind:own?'owned' as const:partnerKind(label,partner?.kind)};}
