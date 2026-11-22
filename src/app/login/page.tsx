import type {Metadata} from 'next';
import {signupEnabled} from '@/lib/auth/config';
import AuthShell from '@/components/auth/auth-shell';
import AuthForm from '@/components/auth/auth-form';
export const metadata:Metadata={title:'Masuk — TravelOS'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){const params=await searchParams;return <AuthShell><AuthForm mode="login" allowSignup={signupEnabled()} configured={Boolean(process.env.DATABASE_URL)} initialError={params.error==='callback'?'Tautan login lama tidak berlaku. Gunakan email dan kata sandi akun workspace.':''}/></AuthShell>;}
