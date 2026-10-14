import {env} from 'cloudflare:workers';
/** A separate secret; evaluated only when a future identity operation invokes it. */
export function guestSigningSecret(){return (env as unknown as Record<string,string|undefined>).HOLOCRON_GUEST_SIGNING_SECRET;}
