import type {Metadata} from 'next';
import Dashboard from '@/components/dashboard';
export const metadata:Metadata={title:'Billing — TravelOS'};
export default function Page(){return <Dashboard page="billing"/>;}
