import {requireAdminSession} from '@/lib/admin/session';
import {listFeedbackUsers} from '@/lib/feedback/users-repository';
import FeedbackUsersAdmin from '@/components/admin/feedback-users-admin';

export const dynamic='force-dynamic';

export default async function FeedbackUsersPage(){
  await requireAdminSession();
  return <FeedbackUsersAdmin initialUsers={await listFeedbackUsers()}/>;
}
