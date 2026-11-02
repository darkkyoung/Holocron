/** Local demonstration metadata. Never imported by a simulator or sent to a server. */
export interface RacerProfile {id:string;name:string;image:string;birth:string;species:string;home:string;affiliation:string;description:string}
export const PROFILE_KEY='holocron-racing-local-profiles-v1';
const limits={name:80,image:2048,birth:80,species:80,home:120,affiliation:120,description:1600} as const;
export function safeProfileImage(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:'';}catch{return '';}}
export function validateProfiles(value:unknown):RacerProfile[]{
 if(!Array.isArray(value)||value.length>256)throw Error('프로필은 최대 256개까지 저장할 수 있습니다.');
 const seen=new Set<string>();return value.map(raw=>{
  if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(raw.id)||seen.has(raw.id))throw Error('선수 ID가 올바르지 않거나 중복됩니다.');
  seen.add(raw.id);const p={id:raw.id} as RacerProfile;
  for(const key of Object.keys(limits) as (keyof typeof limits)[]){if(typeof raw[key]!=='string'||raw[key].length>limits[key])throw Error(key+' 입력이 너무 길거나 형식이 잘못되었습니다.');p[key]=raw[key].trim();}
  if(!p.name)throw Error('이름을 입력해 주세요.');
  if(p.image&&!safeProfileImage(p.image))throw Error('인증 정보 없는 HTTPS 이미지 URL만 사용할 수 있습니다.');
  return p;
 });
}
export function readProfiles(storage:Pick<Storage,'getItem'>){
 try{const text=storage.getItem(PROFILE_KEY);if(!text)return {profiles:[] as RacerProfile[],error:''};if(text.length>1000000)throw Error();return {profiles:validateProfiles(JSON.parse(text)),error:''};}
 catch{return {profiles:[] as RacerProfile[],error:'저장된 로컬 프로필을 읽지 못했습니다. 기본 정보를 표시합니다.'};}
}
export function defaultProfile(id:string,name:string):RacerProfile{return {id,name,image:'',birth:'',species:'',home:'',affiliation:'',description:''};}
