import {Suspense} from 'react';
import Dashboard from '@/components/dashboard';
export default function Page(){return <Suspense fallback={<p role="status">Memuat invoice…</p>}><Dashboard page="invoices"/></Suspense>;}
