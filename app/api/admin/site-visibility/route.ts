import {getAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {handleVisibility} from '@/lib/site-visibility/http';
const deps={database:db,authorized:async()=>!!await getAdminSession()};
export const GET=(request:Request)=>handleVisibility(request,deps);
export const POST=(request:Request)=>handleVisibility(request,deps);
