import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import seed from './seed.json';
import {sourceAdapters} from './collection/sources';
import {matchAdminIdentity,normalizeEmail,parseStoredAdminIdentity,preferredLegacyIdentity,serializeAdminIdentity} from './admin/identity';
export type ArticleStatus='published'|'excluded'|'review';
export type Article={id:string;topic:string;topicOverride:string|null;title:string;summary:string;image:string;url:string;source:string;published:string;category:string;status:ArticleStatus;statusOverride:ArticleStatus|null;reason:string;franchise:string};
const decodeEntities=(value:string)=>value.replace(/&#(x[0-9a-f]+|\d+);?/gi,(_,code)=>String.fromCodePoint(code.toLowerCase().startsWith('x')?parseInt(code.slice(1),16):parseInt(code,10))).replace(/&ndash;/gi,'–').replace(/&mdash;/gi,'—').replace(/&lsquo;|&rsquo;/gi,"'").replace(/&ldquo;|&rdquo;/gi,'"').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'");
export const sources=sourceAdapters.map(({name,url,endpoint, trusted})=>({name,url,feed:endpoint,trusted}));
export function db(){if(!env.DB)throw new Error('저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');return env.DB;}
export async function list(){const r=await db().prepare('SELECT * FROM articles ORDER BY published DESC').all<Article>();return r.results.map(a=>({...a,title:decodeEntities(a.title),summary:decodeEntities(a.summary)}));}
export async function seedNews(){const statements=(seed as Article[]).map(a=>db().prepare('INSERT OR IGNORE INTO articles (id,topic,title,summary,image,url,source,published,category,status,reason,franchise) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(a.id,a.topic,a.title,a.summary,a.image,a.url,a.source,a.published,a.category,a.status,a.reason,a.franchise));if(statements.length)await db().batch(statements);}
export async function admin(claim=false){
  const user=await getChatGPTUser();
  if(!user)throw new Error('로그인이 필요합니다.');
  const [legacyRow,identityRow]=await Promise.all([
    db().prepare("SELECT value FROM settings WHERE key='admin'").first<{value:string}>(),
    db().prepare("SELECT value FROM settings WHERE key='admin_identity_v2'").first<{value:string}>(),
  ]);
  const principal={userId:user.userId,email:normalizeEmail(user.email)};
  const configuredOwnerEmail=normalizeEmail(config().adminEmail);
  const existing=parseStoredAdminIdentity(identityRow?.value);
  const match=matchAdminIdentity(principal,existing,legacyRow?.value??null,configuredOwnerEmail);
  const unclaimed=!legacyRow&&!identityRow;
  const mayClaim=claim&&unclaimed&&(!configuredOwnerEmail||configuredOwnerEmail===principal.email);
  if(!match&&!mayClaim)throw new Error('관리자 권한이 없습니다.');
  const legacyIdentity=preferredLegacyIdentity(principal);
  if(!legacyIdentity)throw new Error('관리자 식별 정보를 확인할 수 없습니다.');
  const serialized=serializeAdminIdentity(principal);
  if(!identityRow||identityRow.value!==serialized||match==='configured-owner'){
    const statements=[db().prepare("INSERT INTO settings (key,value) VALUES ('admin_identity_v2',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(serialized)];
    if(unclaimed||match==='configured-owner')statements.push(db().prepare("INSERT INTO settings (key,value) VALUES ('admin',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(legacyIdentity));
    await db().batch(statements);
  }
  return user;
}
export async function setting(key:string,value:string){await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
export function config(){const e=env as unknown as Record<string,string>;return {key:e.OPENAI_API_KEY,model:e.OPENAI_MODEL||'gpt-4.1-mini',adminEmail:e.HOLOCRON_ADMIN_EMAIL};}
