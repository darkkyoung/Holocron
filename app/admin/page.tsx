import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {admin} from '@/lib/news';
import Admin from './panel';
export const dynamic='force-dynamic';
export default async function Page(){const u=await requireChatGPTUser('/admin');let authorized=false;try{await admin();authorized=true;}catch{}return <Admin authorized={authorized} name={u.displayName}/>;}
