import {db} from '@/lib/news';
import {guestSigningSecret} from '@/lib/identity/config';
import {visitGuest} from '@/lib/credit/rewards/service';
import {emptyVisitBody,privateJson,publicError,publicJson} from '@/lib/credit/rewards/http';
import {anonymousSession,withAnonymousSession} from '@/lib/beta/anonymous-session';

export async function POST(request:Request){
  try{
    emptyVisitBody(await publicJson(request));
    const result=await visitGuest(request,db(),guestSigningSecret());
    const response=result.error?publicError(null):privateJson(result.state);
    if(result.setCookie)response.headers.append('Set-Cookie',result.setCookie);
    // Establish the existing Quiz participation cookie under the same browser initialization lock.
    const session=await anonymousSession(request);
    return withAnonymousSession(response,session.setCookie);
  }catch(error){return publicError(error);}
}
