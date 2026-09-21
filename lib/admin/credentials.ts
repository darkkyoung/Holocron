async function digest(value:string){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}

/** Compare credentials without exposing which field failed. */
export async function verifyAdminCredentials(username:string,password:string,expectedUsername:string|undefined,expectedPassword:string|undefined){
  if(!expectedUsername||!expectedPassword)return false;
  const [actualUser,expectedUser,actualPassword,expectedPasswordDigest]=await Promise.all([
    digest(username),digest(expectedUsername),digest(password),digest(expectedPassword),
  ]);
  return constantTimeEqual(actualUser,expectedUser)&&constantTimeEqual(actualPassword,expectedPasswordDigest);
}

function constantTimeEqual(left:Uint8Array,right:Uint8Array){
  let difference=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let index=0;index<length;index++)difference|=(left[index%left.length]??0)^(right[index%right.length]??0);
  return difference===0;
}
