import type {Metadata} from 'next';
import AuthShell from '@/components/auth/auth-shell';
import AuthForm from '@/components/auth/auth-form';
export const metadata:Metadata={title:'Kata sandi baru — TravelOS'};
export const dynamic='force-dynamic';
export default async function Page(){return <AuthShell><AuthForm mode="reset" configured={Boolean(process.env.DATABASE_URL)}/></AuthShell>;}
