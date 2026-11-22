import {cookies} from 'next/headers';
import {z} from 'zod';
import {getPool} from '../db/connection.cjs';
import {login,sessionUser,signout,registerCompany,SESSION_SECONDS} from '../db/auth.cjs';
import {signupEnabled} from './config';
export const NATIVE_COOKIE='travelos_session';
export function nativeUserFromToken(token:string|undefined){return sessionUser(getPool(),null,token);}
export async function currentNativeUser(){return nativeUserFromToken((await cookies()).get(NATIVE_COOKIE)?.value);}
function cookieOptions(){
 const configured=process.env.APP_URL;let secure=false;
 if(configured){
  const url=new URL(configured);
  secure=url.protocol==='https:';
 }
 else if(process.env.NODE_ENV==='production')throw Error('APP_URL belum diisi.');
 return {httpOnly:true,sameSite:'lax' as const,secure,path:'/'};
}
export async function nativeAuthPost(request:Request,action:string){
 try{
  if(action==='signout'){const jar=await cookies();await signout(getPool(),jar.get(NATIVE_COOKIE)?.value);jar.set(NATIVE_COOKIE,'',{...cookieOptions(),maxAge:0});return Response.json({redirect:'/login'});}
  const ip=process.env.TRAVELOS_TRUST_PROXY==='1'?(request.headers.get('x-real-ip')||'unknown').slice(0,100):'direct';
  if(action==='signup'){
   if(!signupEnabled())return Response.json({error:'Pendaftaran perusahaan belum dibuka.'},{status:403});
   const input=z.object({name:z.string().trim().min(2).max(150),companyName:z.string().trim().min(2).max(150),email:z.email().max(254),phone:z.string().regex(/^\+62[1-9]\d{7,12}$/),password:z.string().min(12).max(128)}).strict().parse(await request.json());
   const options=cookieOptions();const result=await registerCompany(getPool(),input,ip);
   (await cookies()).set(NATIVE_COOKIE,result.token,{...options,maxAge:SESSION_SECONDS,expires:result.expires});
   return Response.json({redirect:'/'},{status:201});
  }
  if(action!=='login')return Response.json({error:'Hubungi pengelola untuk memulihkan akun atau mengganti kata sandi.'},{status:403});
  const input=z.object({email:z.email().max(254),password:z.string().min(1).max(128)}).strict().parse(await request.json());
  const options=cookieOptions();

  const result=await login(getPool(),null,input.email,input.password,ip);
  if(!result)return Response.json({error:'Email atau kata sandi tidak sesuai.'},{status:401});
  (await cookies()).set(NATIVE_COOKIE,result.token,{...options,maxAge:SESSION_SECONDS,expires:result.expires});
  return Response.json({redirect:'/'});
 }catch(error){if(error instanceof z.ZodError||error instanceof SyntaxError)return Response.json({error:'Periksa isian akun. Kata sandi pendaftaran minimal 12 karakter.'},{status:400});if((error as {code?:string}).code==='23505')return Response.json({error:'Email tidak dapat digunakan. Coba masuk atau hubungi pengelola.'},{status:409});if((error as {status?:number}).status===429)return Response.json({error:'Terlalu banyak percobaan. Coba lagi setelah 15 menit.'},{status:429,headers:{'Retry-After':'900'}});return Response.json({error:'Layanan akun belum tersedia. Hubungi pengelola.'},{status:503});}
}
