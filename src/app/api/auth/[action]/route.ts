import {NextResponse} from 'next/server';
import {nativeAuthPost,currentNativeUser} from '@/lib/auth/native';
import {nativeAuthEnabled,localPreviewAllowed} from '@/lib/auth/config';
import {originAllowed} from '@/lib/request';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 let response:Response;
 const {action}=await params;
 if(!request.headers.get('origin')||!originAllowed(request))response=NextResponse.json({error:'Permintaan tidak diizinkan.'},{status:403});
 else if(!['login','signup','forgot','update-password','signout'].includes(action))response=NextResponse.json({error:'Halaman tidak ditemukan.'},{status:404});
 else if(nativeAuthEnabled())response=await nativeAuthPost(request,action);
 else if(action==='signout'&&localPreviewAllowed())response=NextResponse.json({redirect:'/login'});
 else response=NextResponse.json({error:'Autentikasi PostgreSQL belum tersedia.'},{status:503});
 response.headers.set('Cache-Control','private, no-store');response.headers.set('Pragma','no-cache');return response;
}
export async function GET(_request:Request,{params}:{params:Promise<{action:string}>}){
 if((await params).action!=='me')return NextResponse.json({error:'Tidak ditemukan.'},{status:404});
 if(!nativeAuthEnabled())return NextResponse.json({error:'Autentikasi PostgreSQL belum tersedia.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
 try{const user=await currentNativeUser();return NextResponse.json(user?{user}:{error:'Silakan masuk terlebih dahulu.'},{status:user?200:401,headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Layanan akun belum tersedia.'},{status:503});}
}
