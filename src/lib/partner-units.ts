import type { DashboardData, Unit } from './types';
import { isPartnerUnit } from './partner-rules';

// Current fleet ownership is independent of historical payment agreements.
export function unitPartnerId(data: DashboardData, unit: Unit): string | undefined {
 if (!isPartnerUnit(unit)) return undefined;
 if (unit.partnerId) return data.partners?.find(p=>p.id===unit.partnerId)?.id;
 const name=unit.owner.trim().toLocaleLowerCase('id');
 const matches=(data.partners||[]).filter(p=>p.name.trim().toLocaleLowerCase('id')===name);
 return matches.length===1?matches[0].id:undefined;
}
export function partnerUnits(data: DashboardData, partnerId: string): Unit[] {
 return data.units.filter(unit=>!unit.archivedAt&&unitPartnerId(data,unit)===partnerId);
}
