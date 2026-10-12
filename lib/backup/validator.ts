import {BACKUP_DEFINITIONS,BACKUP_FORMAT,BACKUP_MIGRATION,BACKUP_V1_MIGRATION,BACKUP_SETTINGS_KEYS,backupTables,MAX_BACKUP_BYTES,type BackupRow,type HolocronBackup} from './format';

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function exactKeys(value:Record<string,unknown>,keys:readonly string[]){return Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
export class BackupValidationError extends Error{}
const fail=(message:string):never=>{throw new BackupValidationError(message);};

// Error messages contain dataset/field names only, never row values or payloads.
export function validateBackup(input:unknown):HolocronBackup{
  if(typeof input==='string'){
    if(new TextEncoder().encode(input).byteLength>MAX_BACKUP_BYTES)fail('Backup exceeds the supported size.');
    try{input=JSON.parse(input);}catch{fail('Invalid backup JSON.');}
  }
  if(!object(input)||!exactKeys(input,['format','version','application','createdAt','schema','consistency','tables','counts']))fail('Invalid backup envelope.');
  const root=input as Record<string,unknown>;
  if(root.format!==BACKUP_FORMAT||![1,2].includes(Number(root.version))||typeof root.version!=='number'||root.application!=='HOLOCRON')fail('Unsupported backup format/version/application.');
  const datasets=backupTables(root.version as 1|2);
  if(typeof root.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(root.createdAt)||!Number.isFinite(Date.parse(root.createdAt))||new Date(root.createdAt).toISOString()!==root.createdAt)fail('Invalid createdAt.');
  if(!object(root.schema)||!exactKeys(root.schema,['latestMigration'])||root.schema.latestMigration!==(root.version===1?BACKUP_V1_MIGRATION:BACKUP_MIGRATION))fail('Unsupported schema marker.');
  if(root.consistency!=='d1-read-batch')fail('Unsupported consistency marker.');
  if(!object(root.tables)||!exactKeys(root.tables,datasets)||!object(root.counts)||!exactKeys(root.counts,datasets))fail('Missing or forbidden dataset/count.');
  const tables=root.tables as Record<string,unknown>,counts=root.counts as Record<string,unknown>;
  for(const name of datasets){
    const rows=tables[name],definition=BACKUP_DEFINITIONS[name];
    if(!Array.isArray(rows))fail(`Invalid dataset: ${name}.`);
    const items=rows as unknown[];
    if(!Number.isSafeInteger(counts[name])||counts[name]!==items.length)fail(`Count mismatch: ${name}.`);
    const constraints=[definition.primaryKey,...definition.unique??[]],seen=constraints.map(()=>new Set<string>());
    for(const item of items){
      if(!object(item)||!exactKeys(item,Object.keys(definition.columns)))fail(`Invalid row shape: ${name}.`);
      const row=item as Record<string,unknown>;
      for(const [column,type] of Object.entries(definition.columns)){
        const value=row[column];
        if(type==='integer'?!Number.isSafeInteger(value):type==='nullable-text'?(value!==null&&typeof value!=='string'):typeof value!=='string')fail(`Invalid field: ${name}.${column}.`);
      }
      if(definition.primaryKey.some(key=>typeof row[key]!=='string'||!row[key]))fail(`Missing primary key: ${name}.`);
      constraints.forEach((keys,index)=>{
        const key=JSON.stringify(keys.map(column=>row[column]));
        if(seen[index].has(key))fail(`Duplicate key: ${name}.${keys.join('+')}.`);
        seen[index].add(key);
      });
      if(name==='settings'&&!(BACKUP_SETTINGS_KEYS as readonly unknown[]).includes(row.key))fail('Forbidden settings key.');
    }
  }
  const backup=root as unknown as HolocronBackup;
  const quizIds=new Set(backup.tables.quizzes.map(row=>row.id));
  const options=new Map(backup.tables.quiz_options.map(row=>[row.id,row]));
  for(const row of backup.tables.quiz_options)if(!quizIds.has(row.quiz_id))fail('Orphan quiz option.');
  for(const row of backup.tables.quiz_responses){
    if(!quizIds.has(row.quiz_id))fail('Orphan quiz response.');
    if(options.get(row.option_id)?.quiz_id!==row.quiz_id)fail('Missing or cross-quiz response option.');
  }
  const articleIds=new Set(backup.tables.articles.map(row=>row.id)),workIds=new Set(backup.tables.works.map(row=>row.id));
  for(const row of backup.tables.article_work_relations??[]){
    if(!articleIds.has(row.article_id))fail('Orphan article-work article.');
    if(!workIds.has(row.work_id))fail('Orphan article-work work.');
    if(!['linked','excluded'].includes(String(row.state))||!['automatic','manual'].includes(String(row.origin))||(row.state==='excluded'&&row.origin!=='manual'))fail('Invalid article-work state/origin.');
  }
  return backup;
}

// Serializes in the documented column/table order without mutating the validated input.
export function serializeBackup(input:unknown){
  const backup=validateBackup(input);
  const datasets=backupTables(backup.version);
  const tables=Object.fromEntries(datasets.map(name=>{
    const {columns,order}=BACKUP_DEFINITIONS[name];
    const rows=backup.tables[name]!.map(row=>Object.fromEntries(Object.keys(columns).map(key=>[key,row[key]])) as BackupRow);
    rows.sort((a,b)=>{for(const key of order){const x=a[key],y=b[key];if(x!==y)return (x as string|number)<(y as string|number)?-1:1;}return 0;});
    return [name,rows];
  }));
  const json=JSON.stringify({format:backup.format,version:backup.version,application:backup.application,createdAt:backup.createdAt,schema:backup.schema,consistency:backup.consistency,tables,counts:Object.fromEntries(datasets.map(name=>[name,backup.counts[name]]))});
  if(new TextEncoder().encode(json).byteLength>MAX_BACKUP_BYTES)fail('Backup exceeds the supported size.');
  return json;
}
