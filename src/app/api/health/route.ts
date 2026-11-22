import {assertRuntimeDatabase} from '@/lib/db/runtime-check.cjs';
import {getPool} from '@/lib/db/connection.cjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{if(process.env.DATABASE_URL){await assertRuntimeDatabase(getPool());}else if(process.env.NODE_ENV==='production'&&process.env.TRAVELOS_LOCAL_PREVIEW!=='1')throw Error();return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
