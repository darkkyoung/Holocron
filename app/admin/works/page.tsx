import {requireAdminSession} from '@/lib/admin/session';
import {getWorksManagementState} from '@/lib/works/service';
import WorksAdmin from '@/components/works/works-admin';

export const dynamic='force-dynamic';
export default async function AdminWorksPage(){
  await requireAdminSession();
  return <WorksAdmin initialState={await getWorksManagementState()}/>;
}
