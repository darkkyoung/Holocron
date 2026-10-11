import {BACKUP_SETTINGS_KEYS,BACKUP_TABLES,EXCLUDED_SETTINGS,EXCLUDED_TABLES} from './format';
import {validateBackup} from './validator';

// Pure description only: no database dependency, SQL statements or execution capability.
export function buildRestorePlan(input:unknown){
  const backup=validateBackup(input);
  return {
    mode:'FULL_DURABLE_STATE_REPLACE',dryRun:true,executable:false,
    createdAt:backup.createdAt,schema:backup.schema,
    targetTables:[...BACKUP_TABLES],
    deleteOrder:['quiz_responses','quiz_options','quizzes','articles','works','beta_analytics_daily_sessions','feedback_sessions','settings'],
    insertOrder:[...BACKUP_TABLES],
    counts:{...backup.counts},
    settings:{replacementScope:[...BACKUP_SETTINGS_KEYS],presentKeys:backup.tables.settings.map(row=>row.key),rows:backup.counts.settings},
    excludedTables:{...EXCLUDED_TABLES},excludedSettings:{...EXCLUDED_SETTINGS},
    requirements:['Validate target schema and backup again','Explicit operator confirmation','Replace only allowlisted durable state, including absence of allowlisted settings','Do not replay operational state; establish fresh leases/cursors/security state via a separately reviewed procedure','Invalidate runtime caches and verify restored relationships'],
  };
}
