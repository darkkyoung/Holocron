import {db} from '@/lib/news';
import {handlePublicAnnouncement} from '@/lib/announcement/http';
export const GET=(request:Request)=>handlePublicAnnouncement(request,db);
