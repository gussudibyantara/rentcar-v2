import {NextResponse,type NextRequest} from 'next/server';
import {localPreviewAllowed,nativeAuthEnabled} from './lib/auth/config';
import {NATIVE_COOKIE,nativeUserFromToken} from './lib/auth/native';
const publicPaths=new Set(['/login','/signup','/forgot-password','/reset-password','/welcome','/complete-profile']);
export async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(path==='/api/health'||path.startsWith('/auth/')||path.startsWith('/api/auth/'))return NextResponse.next();
 if(publicPaths.has(path))return NextResponse.next();
 const finish=(r:NextResponse)=>{r.headers.set('Cache-Control','private, no-store');return r;};
 if(nativeAuthEnabled()){
  try{const user=await nativeUserFromToken(request.cookies.get(NATIVE_COOKIE)?.value);if(user)return finish(NextResponse.next());return finish(path.startsWith('/api/')?NextResponse.json({error:'Silakan masuk terlebih dahulu.'},{status:401}):NextResponse.redirect(new URL('/login',request.url)));}
  catch{return finish(path.startsWith('/api/')?NextResponse.json({error:'Layanan akun belum tersedia.'},{status:503}):NextResponse.redirect(new URL('/login',request.url)));}
 }
 if(localPreviewAllowed())return finish(NextResponse.next());
 return finish(path.startsWith('/api/')?NextResponse.json({error:'Autentikasi PostgreSQL belum tersedia.'},{status:503}):NextResponse.redirect(new URL('/login',request.url)));
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|icon.svg|images/vehicles/).*)']};
