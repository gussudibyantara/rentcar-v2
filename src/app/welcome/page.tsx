import {redirect} from 'next/navigation';
import {nativeAuthEnabled} from '@/lib/auth/config';
import {currentNativeUser} from '@/lib/auth/native';
export const dynamic='force-dynamic';
export default async function Page(){if(nativeAuthEnabled()&&await currentNativeUser())redirect('/profile');redirect('/login');}
