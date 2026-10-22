import {defaultVisibility,SITE_VISIBILITY_KEY,validateVisibility,visibilityFields,VisibilityError} from './domain';
export async function readVisibility(db:D1Database){
 // Always primary, no isolate cache or client-derived mode. Missing row alone means PUBLIC.
 const row=await db.withSession('first-primary').prepare('SELECT value FROM settings WHERE key=?').bind(SITE_VISIBILITY_KEY).first<{value:string}>();
 return row?validateVisibility(JSON.parse(row.value)):defaultVisibility();
}
export async function saveVisibility(db:D1Database,raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).sort().join(',')!=='expectedRevision,fields')throw new VisibilityError('INVALID_VISIBILITY');
 const input=raw as {expectedRevision:unknown;fields:unknown},fields=visibilityFields(input.fields);
 if(!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<0)throw new VisibilityError('INVALID_VISIBILITY');
 const row=await db.withSession('first-primary').prepare('SELECT value FROM settings WHERE key=?').bind(SITE_VISIBILITY_KEY).first<{value:string}>();
 // Authenticated administrator may repair corrupt settings through explicit revision0 save.
 // The visitor gate remains CLOSED while malformed/read-failed state exists.
 let current;try{current=row?validateVisibility(JSON.parse(row.value)):defaultVisibility();}catch{current=defaultVisibility();}
 if(input.expectedRevision!==current.revision)throw new VisibilityError('VISIBILITY_CONFLICT',409);
 const next=validateVisibility({...fields,schemaVersion:1,revision:current.revision+1}),value=JSON.stringify(next);
 const result=await (row?db.prepare('UPDATE settings SET value=? WHERE key=? AND value=?').bind(value,SITE_VISIBILITY_KEY,row.value):db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(SITE_VISIBILITY_KEY,value)).run();
 if(result.meta.changes!==1)throw new VisibilityError('VISIBILITY_CONFLICT',409);
 return next;
}
