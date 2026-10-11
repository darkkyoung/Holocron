import {BACKUP_DEFINITIONS,BACKUP_FORMAT,BACKUP_MIGRATION,BACKUP_SETTINGS_KEYS,BACKUP_TABLES,BACKUP_VERSION,MAX_TABLE_BYTES,MAX_TABLE_ROWS,type BackupCounts,type BackupRow,type BackupTables,type HolocronBackup} from './format';
import {validateBackup} from './validator';

export class BackupExportError extends Error{}

// All SQL identifiers originate in the reviewed definitions above, never request input.
// Counts, size guards and row reads share ONE D1 batch transaction (no paginated snapshots).
export async function exportBackup(database:D1Database,now=new Date()):Promise<HolocronBackup>{
  const statements=BACKUP_TABLES.flatMap(name=>{
    const {columns,order}=BACKUP_DEFINITIONS[name];
    const names=Object.keys(columns),filter=name==='settings'?` WHERE key IN (${BACKUP_SETTINGS_KEYS.map(()=>'?').join(',')})`:'';
    const source=`SELECT ${names.join(',')} FROM ${name}${filter}`;
    const json=`json_object(${names.map(key=>`'${key}',${key}`).join(',')})`;
    const stats=`SELECT COUNT(*) AS row_count,COALESCE(SUM(length(CAST(${json} AS BLOB))),0) AS byte_count FROM data`;
    const prefix=`WITH data AS (${source}), budget AS (${stats})`;
    const sql=[`${prefix} SELECT * FROM budget`,`${prefix} SELECT ${names.join(',')} FROM data WHERE (SELECT row_count<=${MAX_TABLE_ROWS} AND byte_count<=${MAX_TABLE_BYTES} FROM budget) ORDER BY ${order.join(',')} LIMIT ${MAX_TABLE_ROWS+1}`];
    return sql.map(query=>name==='settings'?database.prepare(query).bind(...BACKUP_SETTINGS_KEYS):database.prepare(query));
  });
  let result:D1Result<BackupRow>[];
  try{result=await database.batch<BackupRow>(statements);}catch{throw new BackupExportError('D1 백업 읽기에 실패했습니다. 파일을 만들지 않았습니다. 다시 시도해 주세요.');}
  if(result.length!==statements.length||result.some(item=>!item.success))throw new BackupExportError('D1 백업 읽기가 완료되지 않았습니다.');
  const tables={} as BackupTables,counts={} as BackupCounts;
  BACKUP_TABLES.forEach((name,index)=>{
    const stats=result[index*2].results[0],rows=result[index*2+1].results;
    if(!stats||typeof stats.row_count!=='number'||typeof stats.byte_count!=='number')throw new BackupExportError('D1 백업 개수를 확인할 수 없습니다.');
    if(stats.row_count>MAX_TABLE_ROWS||stats.byte_count>MAX_TABLE_BYTES)throw new BackupExportError(`백업 크기 한도 초과: ${name}. 테이블당 ${MAX_TABLE_ROWS}행 / 1 MiB까지 지원합니다. 부분 백업은 생성하지 않습니다.`);
    if(rows.length!==stats.row_count)throw new BackupExportError(`불완전한 백업 읽기: ${name}. 파일을 만들지 않았습니다.`);
    tables[name]=rows;counts[name]=rows.length;
  });
  return validateBackup({format:BACKUP_FORMAT,version:BACKUP_VERSION,application:'HOLOCRON',createdAt:now.toISOString(),schema:{latestMigration:BACKUP_MIGRATION},consistency:'d1-read-batch',tables,counts});
}
