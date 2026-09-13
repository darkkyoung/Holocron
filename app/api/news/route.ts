import { list } from '@/lib/news';
export async function GET(){try{return Response.json((await list()).filter(a=>a.status==='published'));}catch{return Response.json({error:'기사를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:503});}}
