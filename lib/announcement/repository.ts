import {ANNOUNCEMENT_KEY,AnnouncementError,announcementFields,emptyAnnouncement,validateAnnouncement,type Announcement} from './domain';
async function raw(database:D1Database){return database.prepare('SELECT value FROM settings WHERE key=?').bind(ANNOUNCEMENT_KEY).first<{value:string}>();}
export async function readAnnouncement(database:D1Database):Promise<Announcement>{
 const row=await raw(database);return row?validateAnnouncement(JSON.parse(row.value)):emptyAnnouncement();
}
/** One settings row holds metadata + bounded image. CAS changes both atomically. */
export async function saveAnnouncement(database:D1Database,input:unknown,now=new Date()):Promise<Announcement>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='action,expectedRevision,fields')throw new AnnouncementError('INVALID_ANNOUNCEMENT');
 const v=input as {action:unknown;expectedRevision:unknown;fields:unknown};
 if((v.action!=='save'&&v.action!=='publish')||!Number.isSafeInteger(v.expectedRevision)||Number(v.expectedRevision)<0)throw new AnnouncementError('INVALID_ANNOUNCEMENT');
 const previous=await raw(database),current=previous?validateAnnouncement(JSON.parse(previous.value)):emptyAnnouncement();
 if(v.expectedRevision!==current.revision)throw new AnnouncementError('ANNOUNCEMENT_CONFLICT',409);
 const fields=announcementFields(v.fields);
 if(v.action==='publish')fields.enabled=true;
 const next=validateAnnouncement({...fields,schemaVersion:1,revision:current.revision+1,id:v.action==='publish'?crypto.randomUUID():current.id,updatedAt:now.toISOString()});
 const encoded=JSON.stringify(next);
 const statement=previous?database.prepare('UPDATE settings SET value=? WHERE key=? AND value=?').bind(encoded,ANNOUNCEMENT_KEY,previous.value):database.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(ANNOUNCEMENT_KEY,encoded);
 const result=await statement.run();if(result.meta.changes!==1)throw new AnnouncementError('ANNOUNCEMENT_CONFLICT',409);
 return next;
}
