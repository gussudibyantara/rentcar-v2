/** Compare the browser origin to the actual Host header or APP_URL.
 * Adjusted to safely validate hostname behind a reverse proxy (Coolify/Traefik).
 */
export function originAllowed(request: Request) {
 const origin = request.headers.get('origin');
 if (!origin) return true;
 try {
  const parsed = new URL(origin);
  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  const hostOnly = hostHeader.split(':')[0];

  if (process.env.APP_URL) {
   const appUrlObj = new URL(process.env.APP_URL);
   if (parsed.hostname === appUrlObj.hostname) return true;
  }

  return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && (parsed.host === hostHeader || parsed.hostname === hostOnly);
 } catch {
  return false;
 }
}
