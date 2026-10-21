import {validateImage,type AnnouncementImage} from './image';
export const ANNOUNCEMENT_KEY='homepage_announcement_v1';
export const MAX_ANNOUNCEMENT_BODY=240*1024;
export type Crop={x:number;y:number;zoom:number};
export type AnnouncementFields={enabled:boolean;title:string;body:string;alt:string;decorative:boolean;crop:Crop;image:AnnouncementImage|null};
export type Announcement=AnnouncementFields&{schemaVersion:1;revision:number;id:string|null;updatedAt:string|null};
export type PublicAnnouncement=Omit<AnnouncementFields,'enabled'|'image'>&{id:string;revision:number;imageUrl:string};
export class AnnouncementError extends Error{constructor(public code:string,public status=400){super(code);}}
const bad=():never=>{throw new AnnouncementError('INVALID_ANNOUNCEMENT');};
export const emptyAnnouncement=():Announcement=>({schemaVersion:1,revision:0,id:null,updatedAt:null,enabled:false,title:'',body:'',alt:'',decorative:true,crop:{x:50,y:50,zoom:100},image:null});
export const validAnnouncementId=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
function text(v:unknown,max:number){if(typeof v!=='string'||v.length>max||/<\/?[a-z][^>]*>/i.test(v)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v))return bad();return v.trim();}
export function announcementFields(value:unknown):AnnouncementFields{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='alt,body,crop,decorative,enabled,image,title')return bad();
 const v=value as AnnouncementFields,c=v.crop;
 if(typeof v.enabled!=='boolean'||typeof v.decorative!=='boolean'||!c||Object.keys(c).sort().join(',')!=='x,y,zoom'||![c.x,c.y,c.zoom].every(Number.isInteger)||c.x<0||c.x>100||c.y<0||c.y>100||c.zoom<100||c.zoom>300)return bad();
 let image;try{image=validateImage(v.image);}catch{return bad();}
 const fields={enabled:v.enabled,title:text(v.title,120),body:text(v.body,4000),alt:text(v.alt,240),decorative:v.decorative,crop:{...c},image};
 if(fields.enabled&&(!fields.title||!fields.body||!fields.image||(!fields.decorative&&!fields.alt)))return bad();
 return fields;
}
export function validateAnnouncement(value:unknown):Announcement{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='alt,body,crop,decorative,enabled,id,image,revision,schemaVersion,title,updatedAt')return bad();
 const {schemaVersion,revision,id,updatedAt,...fields}=value as Announcement;
 if(schemaVersion!==1||!Number.isSafeInteger(revision)||revision<1||(id!==null&&!validAnnouncementId(id))||typeof updatedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(updatedAt)||!Number.isFinite(Date.parse(updatedAt))||new Date(updatedAt).toISOString()!==updatedAt)return bad();
 const checked=announcementFields(fields);if(checked.enabled&&!id)return bad();
 return {...checked,schemaVersion:1,revision,id,updatedAt};
}
export function publicAnnouncement(value:Announcement):PublicAnnouncement|null{
 if(!value.enabled||!value.id||!value.image)return null;
 const {id,revision,title,body,alt,decorative,crop}=value;
 return {id,revision,title,body,alt,decorative,crop,imageUrl:`/api/announcement/image?id=${id}&revision=${revision}`};
}
