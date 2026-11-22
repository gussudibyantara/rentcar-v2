import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard';
export const metadata: Metadata = { title: 'Maintenance — TravelOS' };
export default function Page() { return <Dashboard page="maintenance" />; }
