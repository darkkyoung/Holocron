import {getAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {handleAdminAnnouncement} from '@/lib/announcement/http';
const deps={authorized:async()=>!!await getAdminSession(),database:db};
export const GET=(request:Request)=>handleAdminAnnouncement(request,deps);
export const POST=(request:Request)=>handleAdminAnnouncement(request,deps);
