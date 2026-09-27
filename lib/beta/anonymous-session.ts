export const BETA_SESSION_COOKIE='holocron_beta_session';
const SESSION_MAX_AGE=60*60*24*30;

function cookieValue(request:Request){
  const cookies=request.headers.get('cookie')??'';
  const match=cookies.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${BETA_SESSION_COOKIE}=`));
  const value=match?.slice(BETA_SESSION_COOKIE.length+1)??'';
  return /^[a-f0-9-]{36}$/.test(value)?value:null;
}

async function hash(value:string){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function anonymousSession(request:Request){
  const existing=cookieValue(request);
  const id=existing??crypto.randomUUID();
  return {
    sessionHash:await hash(id),
    setCookie:existing?null:`${BETA_SESSION_COOKIE}=${id}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
  };
}

export function withAnonymousSession(response:Response,setCookie:string|null){
  if(setCookie)response.headers.append('Set-Cookie',setCookie);
  return response;
}
