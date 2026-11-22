import { todayISO } from './format';
import type { DashboardData } from './types';

export function makeEmptyData(): DashboardData {
 return { version: 1, referenceDate: todayISO(), employees: [], units: [], customers: [], bookings: [], notifications: [], activities: [], assets: [], maintenance: [], inspections: [], expenses: [], invoices: [], partners: [], partnerAgreements: [], settlements: [] };
}
