export type AdminAuthorizationResult=
  |{authorized:true}
  |{authorized:false;reason:'configuration-missing'|'email-missing'|'forbidden'};

export function normalizeEmail(value:string|null|undefined){
  const email=value?.trim().toLowerCase()??'';
  return email&&email.includes('@')?email:null;
}

export function authorizeAdminEmail(authenticatedEmail:string|null|undefined,configuredEmail:string|null|undefined):AdminAuthorizationResult{
  const ownerEmail=normalizeEmail(configuredEmail);
  if(!ownerEmail)return {authorized:false,reason:'configuration-missing'};
  const userEmail=normalizeEmail(authenticatedEmail);
  if(!userEmail)return {authorized:false,reason:'email-missing'};
  return userEmail===ownerEmail?{authorized:true}:{authorized:false,reason:'forbidden'};
}
