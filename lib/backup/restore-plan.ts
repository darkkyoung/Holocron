import {CREDIT_BACKUP_TABLES,WORK_METADATA_DEFAULTS,BACKUP_MIGRATION,BACKUP_SETTINGS_KEYS,BACKUP_TABLES,EXCLUDED_SETTINGS,EXCLUDED_TABLES} from './format';
import {validateBackup} from './validator';

// Pure description only: no database dependency, SQL statements or execution capability.
export function buildRestorePlan(input:unknown){
  const backup=validateBackup(input);
  return {
    mode:'FULL_DURABLE_STATE_REPLACE',dryRun:true,executable:false,
    createdAt:backup.createdAt,schema:backup.schema,
    sourceVersion:backup.version,targetSchema:{latestMigration:BACKUP_MIGRATION},
    compatibility:backup.version===1?'v1 predates article-work relations; full replacement plans ZERO relations, including removal of any target relations.':'relations preserved',
    workMetadataDefaults:backup.version<3?{...WORK_METADATA_DEFAULTS}:null,
    creditCompatibility:backup.version<4?'Historical backup predates Account/Credit. Full replacement plans ZERO Account/Credit rows, including removal of current target owners, balances and ledger.':'Account/Credit history preserved',
    refundCompatibility:backup.version===6?'v6 Account refunds are capacity-limited; requested entitlement is consumed even for partial/zero effects':'Historical refund effects retain their original audit contract; no reinterpretation or top-up',
    targetTables:[...BACKUP_TABLES],
    deleteOrder:['credit_ledger','credit_wallets','credit_principals','auth_accounts','users','article_work_relations','quiz_responses','quiz_options','quizzes','articles','works','beta_analytics_daily_sessions','feedback_sessions','settings'],
    insertOrder:[...BACKUP_TABLES],
    counts:{...Object.fromEntries(CREDIT_BACKUP_TABLES.map(name=>[name,backup.counts[name]??0])),...backup.counts,article_work_relations:backup.counts.article_work_relations??0},
    settings:{replacementScope:[...BACKUP_SETTINGS_KEYS],presentKeys:backup.tables.settings.map(row=>row.key),rows:backup.counts.settings},
    excludedTables:{...EXCLUDED_TABLES},excludedSettings:{...EXCLUDED_SETTINGS},
    requirements:['Validate target schema and backup again','Quiesce AI and resolve all unsettled spends before any future restore; assistant admission state is excluded and must never be replayed','Credit append-only triggers require a separately reviewed exclusive restore procedure: recreate zero wallets, replay validated ledger in sequence, verify balances; never disable guards in normal runtime','Explicit operator confirmation','Replace only allowlisted durable state, including absence of allowlisted settings','Do not replay operational state; establish fresh leases/cursors/security state via a separately reviewed procedure','Invalidate runtime caches and verify restored relationships'],
  };
}
