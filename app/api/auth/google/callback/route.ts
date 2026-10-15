import {db} from '@/lib/news';
import {googleCredentials,guestSigningSecret} from '@/lib/identity/config';
import {completeGoogleLogin} from '@/lib/identity/google/service';
import {clearOAuthCookie,GoogleCallbackError} from '@/lib/identity/google/flow';
import {GoogleProtocolError} from '@/lib/identity/google/protocol';
import {loginRedirect} from '@/lib/identity/google/http';
export async function GET(request:Request){
  try{const result=await completeGoogleLogin(request,db(),googleCredentials(),guestSigningSecret());return loginRedirect(result.location,[...result.cookies,clearOAuthCookie()]);}
  catch(error){
    // Fixed stage only: never log errors, requests, cookies, provider responses or identity values.
    console.warn('google_callback_failed',error instanceof GoogleCallbackError||error instanceof GoogleProtocolError?error.stage:'account_completion');
    return loginRedirect('/?login=failed',[clearOAuthCookie()]);}
}
