import {verifyAdminSessionToken} from '../admin/session-crypto';
import {readCookie} from '../identity/signed-cookie';
import {authorizeScheduler} from '../collection/scheduler-auth';
import {defaultVisibility} from './domain';
import {readVisibility} from './repository';
import {maintenanceHtml} from './maintenance';
type Environment={DB?:D1Database;HOLOCRON_ADMIN_SESSION_SECRET?:string;HOLOCRON_SCHEDULER_SECRET?:string};
const recover=new Set(['/admin/login','/api/admin/login','/api/admin/logout']);
const headers={'Cache-Control':'private, no-store, max-age=0','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow','Retry-After':'300','X-Content-Type-Options':'nosniff'};
function staticAsset(path:string){return (path.startsWith('/assets/')||path.startsWith('/_next/static/'))&&/\.(?:js|css|woff2?)$/.test(path);}
export async function siteVisibilityGate(request:Request,env:Environment):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 // Login/logout handlers retain their original auth/Origin/rate protections.
 if(recover.has(path)||(['GET','HEAD'].includes(request.method)&&staticAsset(path)))return null;
 let admin=false;try{admin=!!await verifyAdminSessionToken(readCookie(request,'holocron_admin_session'),env.HOLOCRON_ADMIN_SESSION_SECRET);}catch{/* Duplicate/malformed cookies never grant bypass. */}
 if(admin)return null;
 if(path==='/api/scheduled/collect'&&request.method==='POST'&&authorizeScheduler(request.headers.get('authorization'),env.HOLOCRON_SCHEDULER_SECRET)==='authorized')return null;
 let value;try{if(!env.DB)throw Error();value=await readVisibility(env.DB);if(value.mode==='PUBLIC')return null;}
 catch{value={...defaultVisibility(),mode:'MAINTENANCE' as const};}
 const api=path.startsWith('/api/'),rsc=request.headers.has('rsc')||path.startsWith('/_next/data/')||path.endsWith('.rsc')||new URL(request.url).searchParams.has('_rsc');
 if(api||rsc)return new Response(request.method==='HEAD'?null:JSON.stringify({error:'SITE_MAINTENANCE'}),{status:503,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
 return new Response(request.method==='HEAD'?null:maintenanceHtml(value),{status:503,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"}});
}
/** Gate runs BEFORE framework SSR/cache/router/reward handlers. Do not cache public
 * documents or authenticated previews across visibility transitions. */
export async function withSiteVisibility(request:Request,env:Environment,next:()=>Promise<Response>){
 const blocked=await siteVisibilityGate(request,env);if(blocked)return blocked;
 const response=await next();if(staticAsset(new URL(request.url).pathname))return response;
 const result=new Response(response.body,response);
 result.headers.append('Vary','Cookie');
 for(const name of ['Cache-Control','CDN-Cache-Control','Cloudflare-CDN-Cache-Control'])result.headers.set(name,headers[name as keyof typeof headers]);
 return result;
}
