/** PostgreSQL is the only authentication backend. JSON is local preview only. */
export function localPreviewAllowed(){return process.env.NODE_ENV!=='production'||process.env.TRAVELOS_LOCAL_PREVIEW==='1';}
export function nativeAuthEnabled(){return Boolean(process.env.DATABASE_URL)||process.env.TRAVELOS_AUTH_PROVIDER==='postgres';}

export function signupEnabled(){return Boolean(process.env.DATABASE_URL)&&process.env.TRAVELOS_ALLOW_SIGNUP==='1';}
