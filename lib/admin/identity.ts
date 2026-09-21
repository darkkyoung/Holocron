export type AdminPrincipal={userId:string|null;email:string|null};
export type StoredAdminIdentity={version:1;userId:string|null;email:string|null};
export type AdminMatch='stored'|'legacy'|'configured-owner'|null;

export function normalizeEmail(value:string|null|undefined){
  const email=value?.trim().toLowerCase()??'';
  return email&&email.includes('@')?email:null;
}

export function parseStoredAdminIdentity(value:string|null|undefined):StoredAdminIdentity|null{
  if(!value)return null;
  try{
    const parsed=JSON.parse(value) as Partial<StoredAdminIdentity>;
    if(parsed.version!==1)return null;
    const userId=typeof parsed.userId==='string'&&parsed.userId?parsed.userId:null;
    const email=normalizeEmail(parsed.email);
    return userId||email?{version:1,userId,email}:null;
  }catch{return null;}
}

export function serializeAdminIdentity(principal:AdminPrincipal){
  return JSON.stringify({version:1,userId:principal.userId||null,email:normalizeEmail(principal.email)} satisfies StoredAdminIdentity);
}

export function matchAdminIdentity(principal:AdminPrincipal,stored:StoredAdminIdentity|null,legacyValue:string|null,configuredOwnerEmail:string|null):AdminMatch{
  const email=normalizeEmail(principal.email);
  if(stored&&((principal.userId&&stored.userId===principal.userId)||(email&&stored.email===email)))return 'stored';
  if(legacyValue&&((principal.userId&&legacyValue===principal.userId)||(email&&normalizeEmail(legacyValue)===email)))return 'legacy';
  if(email&&normalizeEmail(configuredOwnerEmail)===email)return 'configured-owner';
  return null;
}

export function preferredLegacyIdentity(principal:AdminPrincipal){
  return principal.userId||normalizeEmail(principal.email);
}
