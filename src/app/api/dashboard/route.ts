import {readDashboard} from '@/lib/store';
import {currentAccountIdentity} from '@/lib/auth/identity';
import {accountView} from '@/lib/account-service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{const data=await readDashboard();const identity=await currentAccountIdentity();const view=accountView(data,identity);const {accountProfiles:privateProfiles,...publicData}=data;void privateProfiles;return Response.json({...publicData,runtime:{storage:process.env.DATABASE_URL?'postgresql':'local',user:{name:view.profile.name,email:identity.email}}},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Data dashboard tidak dapat dibaca. Coba lagi atau periksa koneksi penyimpanan.'},{status:500});}}
