import {createGuestToken,verifyGuestToken,guestCookie,readGuestCookie,IdentityError} from './guest-crypto';
import {ensureGuestWallet,findGuestOwner} from './repository';

/** Explicit server mutation. Never invoke from a public GET/render path. No rewards are granted. */
export async function createGuest(database:D1Database,secret:string|undefined,now=Date.now()){
  const identity=await createGuestToken(secret,now);
  const owner=await ensureGuestWallet(database,identity.guestKeyHash,new Date(now));
  return {owner,setCookie:guestCookie(identity.token)};
}
/** Read-only resolution: never creates a wallet or silently adopts the Beta cookie. */
export async function resolveGuest(request:Request,database:D1Database,secret:string|undefined,now=Date.now()){
  const token=readGuestCookie(request);
  const verified=await verifyGuestToken(token,secret,now);
  if(!token)return null;
  if(!verified)throw new IdentityError('INVALID_IDENTITY');
  const owner=await findGuestOwner(database,verified.guestKeyHash);
  if(!owner)throw new IdentityError('INVALID_IDENTITY');
  return owner;
}
