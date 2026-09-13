import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import seed from './seed.json';
export type Article={id:string;topic:string;title:string;summary:string;image:string;url:string;source:string;published:string;category:string;status:string;reason:string;franchise:string};
export const sources=[{name:'StarWars.com',url:'https://www.starwars.com/news',feed:'https://www.starwars.com/feed'},{name:'Star Wars News Net',url:'https://www.starwarsnewsnet.com',feed:'https://www.starwarsnewsnet.com/feed'},{name:'Collider',url:'https://collider.com/tag/star-wars/',feed:'https://collider.com/feed/tag/star-wars/'}];
export function db(){if(!env.DB)throw new Error('저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');return env.DB;}
export async function list(){const r=await db().prepare('SELECT * FROM articles ORDER BY published DESC').all<Article>();return r.results;}
export async function seedNews(){const statements=(seed as Article[]).map(a=>db().prepare('INSERT OR IGNORE INTO articles (id,topic,title,summary,image,url,source,published,category,status,reason,franchise) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(a.id,a.topic,a.title,a.summary,a.image,a.url,a.source,a.published,a.category,a.status,a.reason,a.franchise));if(statements.length)await db().batch(statements);}
export async function admin(claim=false){const u=await getChatGPTUser();if(!u)throw new Error('로그인이 필요합니다.');if(claim)await db().prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('admin',?)").bind(u.userId).run();const r=await db().prepare("SELECT value FROM settings WHERE key='admin'").first<{value:string}>();if(r?.value!==u.userId)throw new Error('관리자 권한이 없습니다.');return u;}
export async function setting(key:string,value:string){await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
export function config(){const e=env as unknown as Record<string,string>;return {key:e.OPENAI_API_KEY,model:e.OPENAI_MODEL||'gpt-4.1-mini'};}
