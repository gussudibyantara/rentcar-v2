import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard';
export const metadata:Metadata={title:'Pengeluaran — TravelOS'};
export default function Page(){return <Dashboard page="expenses"/>;}
