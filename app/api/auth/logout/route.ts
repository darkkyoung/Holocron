import {emptyVisitBody,privateJson,publicError,publicJson} from '@/lib/credit/rewards/http';
import {clearAccountSession} from '@/lib/identity/account-session';
import {clearLoginNotice} from '@/lib/identity/login-notice';
export async function POST(request:Request){
  try{
    emptyVisitBody(await publicJson(request));const response=privateJson({ok:true});
    response.headers.append('Set-Cookie',clearAccountSession());response.headers.append('Set-Cookie',clearLoginNotice());
    return response;
  }catch(error){return publicError(error);}
}
