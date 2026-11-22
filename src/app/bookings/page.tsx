import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard';
export const metadata: Metadata = { title: 'Bookings — TravelOS' };
export default function Bookings() { return <Dashboard page="bookings" />; }
