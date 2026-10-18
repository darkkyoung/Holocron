import {getAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {handlePolicy} from '@/lib/credit/policy-settings/http';
const deps={authorized:async()=>!!await getAdminSession(),database:db};
export const GET=(request:Request)=>handlePolicy(request,deps);
export const POST=(request:Request)=>handlePolicy(request,deps);
