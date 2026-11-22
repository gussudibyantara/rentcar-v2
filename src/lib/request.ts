/** Compare the browser origin to the actual Host header, not Next's internal URL.
 * Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
 * This development server is bound to loopback and has no reverse proxy.
 */
export function originAllowed(request: Request) {
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try {const parsed=new URL(origin);if(process.env.APP_URL)return parsed.origin===new URL(process.env.APP_URL).origin;return (parsed.protocol==='http:'||parsed.protocol==='https:')&&parsed.host===(request.headers.get('host')||new URL(request.url).host);}catch{return false;}
}
