import VehicleSymbol from './vehicle-symbol';
import { initials } from '@/lib/format';
import type { Booking, Unit } from '@/lib/types';
export const statusText: Record<Booking['status'], string> = { confirmed: 'Dikonfirmasi', running: 'Berjalan', completed: 'Selesai', returned: 'Dikembalikan', cancelled: 'Dibatalkan' };
export const statusTone: Record<Booking['status'], string> = { confirmed: 'blue', running: 'orange', completed: 'green', returned: 'green', cancelled: 'neutral' };
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Avatar({ name, index = 0 }: { name: string; index?: number }) { return <span className={`avatar avatar-${index % 4}`}>{initials(name)}</span>; }
export function VehicleIcon({ unit }: { unit: Unit }) { return <span className="vehicle-icon" style={{ background: unit.color }}><VehicleSymbol unit={unit} size={21} strokeWidth={1.5}/></span>; }
