import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard';
export const metadata: Metadata = { title: 'Kalender — TravelOS' };
export default function Calendar() { return <Dashboard page="calendar" />; }
