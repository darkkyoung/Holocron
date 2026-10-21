import {requireAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {readAnnouncement} from '@/lib/announcement/repository';
import AnnouncementEditor from '@/components/announcement/announcement-editor';
export const dynamic='force-dynamic';
export default async function AnnouncementPage(){await requireAdminSession();return <AnnouncementEditor initial={await readAnnouncement(db())}/>;}
