import {db} from '@/lib/news';
import {googleCredentials,guestSigningSecret} from '@/lib/identity/config';
import {completeGoogleLogin} from '@/lib/identity/google/service';
import {clearOAuthCookie} from '@/lib/identity/google/flow';
import {loginRedirect} from '@/lib/identity/google/http';
export async function GET(request:Request){
  try{const result=await completeGoogleLogin(request,db(),googleCredentials(),guestSigningSecret());return loginRedirect(result.location,[...result.cookies,clearOAuthCookie()]);}
  catch{return loginRedirect('/?login=failed',[clearOAuthCookie()]);}
}
