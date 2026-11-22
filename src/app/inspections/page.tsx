import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard';
export const metadata: Metadata = { title: 'Inspeksi — TravelOS' };
export default function Page() { return <Dashboard page="inspections" />; }
