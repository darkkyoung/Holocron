import { env } from 'cloudflare:workers';
import seed from './seed.json';
import {sourceAdapters} from './collection/sources';
export type ArticleStatus='published'|'excluded'|'review';
export type Article={id:string;topic:string;topicOverride:string|null;title:string;summary:string;image:string;url:string;source:string;published:string;category:string;status:ArticleStatus;statusOverride:ArticleStatus|null;reason:string;franchise:string};
const decodeEntities=(value:string)=>value.replace(/&#(x[0-9a-f]+|\d+);?/gi,(_,code)=>String.fromCodePoint(code.toLowerCase().startsWith('x')?parseInt(code.slice(1),16):parseInt(code,10))).replace(/&ndash;/gi,'–').replace(/&mdash;/gi,'—').replace(/&lsquo;|&rsquo;/gi,"'").replace(/&ldquo;|&rdquo;/gi,'"').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'");
export const sources=sourceAdapters.map(({id,name,description,category,url,endpoint,trusted})=>({id,name,description,category,url,feed:endpoint,trusted}));
export function db(){if(!env.DB)throw new Error('저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');return env.DB;}
export async function list(){const r=await db().prepare('SELECT * FROM articles ORDER BY published DESC').all<Article>();return r.results.map(a=>({...a,title:decodeEntities(a.title),summary:decodeEntities(a.summary)}));}
export async function seedNews(){const statements=(seed as Article[]).map(a=>db().prepare('INSERT OR IGNORE INTO articles (id,topic,title,summary,image,url,source,published,category,status,reason,franchise) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(a.id,a.topic,a.title,a.summary,a.image,a.url,a.source,a.published,a.category,a.status,a.reason,a.franchise));if(statements.length)await db().batch(statements);}
export async function setting(key:string,value:string){await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
export function config(){const e=env as unknown as Record<string,string>;return {key:e.OPENAI_API_KEY,model:e.OPENAI_MODEL||'gpt-4.1-mini'};}
