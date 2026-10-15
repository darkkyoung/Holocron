import {env} from 'cloudflare:workers';
/** A separate secret; evaluated only when a future identity operation invokes it. */
export function guestSigningSecret(){return (env as unknown as Record<string,string|undefined>).HOLOCRON_GUEST_SIGNING_SECRET;}
export function accountSessionSecret(){return (env as unknown as Record<string,string|undefined>).HOLOCRON_ACCOUNT_SESSION_SECRET;}
export function googleCredentials(){
  const values=env as unknown as Record<string,string|undefined>;
  return {clientId:values.HOLOCRON_GOOGLE_CLIENT_ID,clientSecret:values.HOLOCRON_GOOGLE_CLIENT_SECRET,sessionSecret:values.HOLOCRON_ACCOUNT_SESSION_SECRET};
}
