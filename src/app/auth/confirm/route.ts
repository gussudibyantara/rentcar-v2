import {NextResponse} from 'next/server';
/** Retired external-auth links never establish a session. */
export async function GET(request:Request){const response=NextResponse.redirect(new URL('/login?error=callback',request.url));response.headers.set('Cache-Control','private, no-store');return response;}
