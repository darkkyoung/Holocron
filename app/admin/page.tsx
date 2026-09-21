import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {admin,AdminAuthorizationError} from '@/lib/news';
import {getManagementState} from '@/lib/admin/service';
import Admin from './panel';
export const dynamic='force-dynamic';
export default async function Page(){
  const user=await requireChatGPTUser('/admin');
  let authorized=false;
  let authorizationError:string|undefined;
  let initialState:Awaited<ReturnType<typeof getManagementState>>|undefined;
  try{
    await admin();
    authorized=true;
    initialState=await getManagementState();
  }catch(error){
    authorizationError=error instanceof AdminAuthorizationError
      ?error.message
      :'관리자 권한을 확인할 수 없습니다.';
  }
  return <Admin authorized={authorized} authorizationError={authorizationError} initialState={initialState} name={user.displayName}/>;
}
