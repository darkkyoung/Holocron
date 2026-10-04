const encoder=new TextEncoder();
export const MISSING_ADMIN_CLIENT_ADDRESS='missing-client-address';

export function adminLoginClientAddress(headers:Headers){
  const address=headers.get('cf-connecting-ip')?.trim();
  return address&&address.length<=128?address:MISSING_ADMIN_CLIENT_ADDRESS;
}

export async function hashAdminLoginClient(address:string,secret:string){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(address)));
  return Array.from(signature,byte=>byte.toString(16).padStart(2,'0')).join('');
}
