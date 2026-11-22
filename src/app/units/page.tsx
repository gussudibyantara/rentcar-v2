import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard';
export const metadata: Metadata = { title: 'Kendaraan — TravelOS' };
export default function Page() { return <Dashboard page="units" />; }
