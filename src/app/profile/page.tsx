import type {Metadata} from 'next';
import Dashboard from '@/components/dashboard';
export const metadata:Metadata={title:'Profile — TravelOS'};
export default function Page(){return <Dashboard page="profile"/>;}
