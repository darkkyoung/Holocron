export const SITE_VISIBILITY_KEY='site_visibility_v1';
export type SiteVisibility={schemaVersion:1;revision:number;mode:'PUBLIC'|'MAINTENANCE';title:string;body:string};
export const defaultVisibility=():SiteVisibility=>({schemaVersion:1,revision:0,mode:'PUBLIC',title:'은하계 기록 보수 중',body:'새로운 항로를 준비하고 있습니다.\n더 나은 모습으로 다시 찾아뵙겠습니다.'});
export class VisibilityError extends Error{constructor(public code:string,public status=400){super(code);}}
export function visibilityFields(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='body,mode,title')throw new VisibilityError('INVALID_VISIBILITY');
 const v=input as Record<string,unknown>;
 if(v.mode!=='PUBLIC'&&v.mode!=='MAINTENANCE')throw new VisibilityError('INVALID_VISIBILITY');
 for(const [field,max] of [['title',80],['body',1200]] as const)if(typeof v[field]!=='string'||!v[field].trim()||v[field].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v[field]))throw new VisibilityError('INVALID_VISIBILITY');
 return {mode:v.mode as SiteVisibility['mode'],title:v.title as string,body:v.body as string};
}
export function validateVisibility(input:unknown):SiteVisibility{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='body,mode,revision,schemaVersion,title')throw new VisibilityError('INVALID_VISIBILITY');
 const v=input as SiteVisibility;
 if(v.schemaVersion!==1||!Number.isSafeInteger(v.revision)||v.revision<0||v.revision>=Number.MAX_SAFE_INTEGER)throw new VisibilityError('INVALID_VISIBILITY');
 return {...visibilityFields({mode:v.mode,title:v.title,body:v.body}),schemaVersion:1,revision:v.revision};
}
