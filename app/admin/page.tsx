import {requireAdminSession} from '@/lib/admin/session';
import {getManagementState} from '@/lib/admin/service';
import Admin from './panel';
export const dynamic='force-dynamic';
export default async function Page(){
  await requireAdminSession();
  const initialState=await getManagementState();
  return <Admin authorized initialState={initialState} name="관리자"/>;
}
