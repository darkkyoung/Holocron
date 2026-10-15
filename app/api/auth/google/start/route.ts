import {googleCredentials} from '@/lib/identity/config';
import {startGoogleLogin,clearOAuthCookie} from '@/lib/identity/google/flow';
import {loginRedirect} from '@/lib/identity/google/http';
export async function GET(request:Request){
  try{const result=await startGoogleLogin(request,googleCredentials());return loginRedirect(result.location,[result.setCookie]);}
  catch{return loginRedirect('/?login=unavailable',[clearOAuthCookie()]);}
}
