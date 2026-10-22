export const BACKUP_FORMAT='holocron-d1-backup';
export const BACKUP_VERSION=9;
export const BACKUP_V1_MIGRATION='0013_loving_silver_fox.sql';
export const BACKUP_V2_MIGRATION='0014_article_work_relations.sql';
export const BACKUP_V3_MIGRATION='0015_featured_work_metadata.sql';
export const BACKUP_V4_MIGRATION='0016_account_credit_foundation.sql';
export const BACKUP_V5_MIGRATION='0017_assistant_admissions.sql';
export const BACKUP_V6_MIGRATION='0018_account_partial_refund.sql';
export const BACKUP_V8_MIGRATION='0019_credit_policy_budget.sql';
export const BACKUP_MIGRATION='0020_account_assistant_access.sql';
export type BackupVersion=1|2|3|4|5|6|7|8|9;
export const backupMigration=(version:BackupVersion)=>version===1?BACKUP_V1_MIGRATION:version===2?BACKUP_V2_MIGRATION:version===3?BACKUP_V3_MIGRATION:version===4?BACKUP_V4_MIGRATION:version===5?BACKUP_V5_MIGRATION:version===6?BACKUP_V6_MIGRATION:version<=8?BACKUP_V8_MIGRATION:BACKUP_MIGRATION;
export const BACKUP_V1_TABLES=['articles','works','quizzes','quiz_options','quiz_responses','beta_analytics_daily_sessions','feedback_sessions','settings'] as const;
export const BACKUP_V3_TABLES=[...BACKUP_V1_TABLES,'article_work_relations'] as const;
export const CREDIT_BACKUP_TABLES=['users','auth_accounts','credit_principals','credit_wallets','credit_ledger'] as const;
export const BACKUP_V6_TABLES=[...BACKUP_V3_TABLES,...CREDIT_BACKUP_TABLES] as const;
export const POLICY_BACKUP_TABLES=['credit_policy_revisions','assistant_monthly_costs'] as const;
export const BACKUP_TABLES=[...BACKUP_V6_TABLES,...POLICY_BACKUP_TABLES] as const;
export function backupTables(version:BackupVersion){return version===1?BACKUP_V1_TABLES:version<4?BACKUP_V3_TABLES:version<7?BACKUP_V6_TABLES:BACKUP_TABLES;}
export type BackupTable=typeof BACKUP_TABLES[number];
export type BackupRow=Record<string,string|number|null>;
export type BackupTables=Record<typeof BACKUP_V1_TABLES[number],BackupRow[]>&Partial<Record<Exclude<BackupTable,typeof BACKUP_V1_TABLES[number]>,BackupRow[]>>;
export type BackupCounts=Record<typeof BACKUP_V1_TABLES[number],number>&Partial<Record<Exclude<BackupTable,typeof BACKUP_V1_TABLES[number]>,number>>;
export const BACKUP_V7_SETTINGS_KEYS=['beta_analytics_start_at','collection_schedule_v1','collection_sources_v1','public_roadmap_copy_v1','public_site_copy_v1'] as const;
// v1–v7 retain their exact historical allowlist; v8 adds one bounded setting.
export const BACKUP_SETTINGS_KEYS=[...BACKUP_V7_SETTINGS_KEYS.slice(0,3),'homepage_announcement_v1',...BACKUP_V7_SETTINGS_KEYS.slice(3)] as const;
export const backupSettingsKeys=(version:BackupVersion):readonly string[]=>version<8?BACKUP_V7_SETTINGS_KEYS:BACKUP_SETTINGS_KEYS;
export const EXCLUDED_TABLES={assistant_searches:'Temporary encrypted retrieval responses and request recovery; never restore',assistant_admissions:'Temporary AI quotas, leases, keyed abuse identifiers and settlement state; never restore',collection_locks:'Temporary collection lease',admin_login_rate_limits:'Temporary authentication security state',feedback_rate_limits:'Temporary feedback cooldown'} as const;
export const EXCLUDED_SETTINGS={
  collection_schedule_state_v1:'Operational execution state',
  metadata_recovery_cursor_v1:'Operational recovery cursor',
  collection_maintenance_editorial_v1:'Operational maintenance marker',
  collection_source_health_v1:'Regeneratable observability',
  last_collection:'Regeneratable observability',
  admin:'Legacy authentication configuration; never export',
  admin_identity_v2:'Legacy authentication identity; never export',
} as const;
export const MAX_TABLE_ROWS=5000;
export const MAX_TABLE_BYTES=1024*1024;
export const MAX_BACKUP_BYTES=16*1024*1024;

type ColumnType='text'|'integer'|'nullable-text';
type TableDefinition={columns:Record<string,ColumnType>;primaryKey:string[];unique?:string[][];order:string[]};
const textColumns=(names:string)=>Object.fromEntries(names.split(' ').map(name=>[name,'text' as const]));
const nullableColumns=(names:string)=>Object.fromEntries(names.split(' ').map(name=>[name,'nullable-text' as const]));
const integerColumns=(names:string)=>Object.fromEntries(names.split(' ').map(name=>[name,'integer' as const]));

// Explicit raw SQL column names, not presentation aliases. New schema fields require review here.
const HISTORICAL_DEFINITIONS:Record<typeof BACKUP_V3_TABLES[number],TableDefinition>={
  articles:{columns:{...textColumns('id topic title summary image url source published category status reason franchise'),...nullableColumns('topic_override title_override status_override')},primaryKey:['id'],unique:[['url']],order:['id']},
  works:{columns:{...textColumns('id title original_title type status poster_url release_precision franchise'),...nullableColumns('poster_source poster_reference_url poster_tmdb_path release_date official_url series_key season_number tmdb_media_type tmdb_id tmdb_season_number')},primaryKey:['id'],order:['id']},
  quizzes:{columns:{...textColumns('id title question explanation status created_at updated_at'),...nullableColumns('hero_image_url hero_link_url publish_at'),...integerColumns('hero_crop_x hero_crop_y hero_crop_zoom')},primaryKey:['id'],order:['id']},
  quiz_options:{columns:{...textColumns('id quiz_id label'),...nullableColumns('image_url'),...integerColumns('position is_correct image_crop_x image_crop_y image_crop_zoom')},primaryKey:['id'],order:['quiz_id','position','id']},
  quiz_responses:{columns:textColumns('quiz_id session_hash option_id created_at'),primaryKey:['quiz_id','session_hash'],order:['quiz_id','session_hash']},
  beta_analytics_daily_sessions:{columns:{...textColumns('period day route session_hash first_seen_at last_seen_at'),...integerColumns('page_views')},primaryKey:['period','day','route','session_hash'],order:['period','day','route','session_hash']},
  feedback_sessions:{columns:{...textColumns('session_hash display_tag nickname first_seen_at last_seen_at'),...nullableColumns('banned_at'),...integerColumns('message_count banned')},primaryKey:['session_hash'],unique:[['display_tag']],order:['session_hash']},
  settings:{columns:textColumns('key value'),primaryKey:['key'],order:['key']},
  article_work_relations:{columns:textColumns('article_id work_id state origin'),primaryKey:['article_id','work_id'],order:['article_id','work_id']},
};

export const WORK_METADATA_DEFAULTS={creator_credit:null,principal_cast:null,synopsis:null,release_context:null};
const V3_DEFINITIONS={...HISTORICAL_DEFINITIONS,works:{...HISTORICAL_DEFINITIONS.works,columns:{...HISTORICAL_DEFINITIONS.works.columns,...nullableColumns('creator_credit principal_cast synopsis release_context')}}};
export const BACKUP_DEFINITIONS:Record<BackupTable,TableDefinition>={...V3_DEFINITIONS,
  credit_policy_revisions:{columns:{...textColumns('id policy_json changed_at actor'),...nullableColumns('previous_json'),...integerColumns('version')},primaryKey:['id'],unique:[['version']],order:['version']},
  assistant_monthly_costs:{columns:{...textColumns('month'),...integerColumns('reserved_micros reconciled_reserved_micros actual_micros attempts known_attempts')},primaryKey:['month'],order:['month']},
  users:{columns:textColumns('id created_at'),primaryKey:['id'],order:['id']},
  auth_accounts:{columns:textColumns('provider provider_subject user_id created_at'),primaryKey:['provider','provider_subject'],order:['provider','provider_subject']},
  credit_principals:{columns:{...textColumns('id type created_at'),...nullableColumns('guest_key_hash user_id retired_at')},primaryKey:['id'],unique:[['guest_key_hash'],['user_id']],order:['id']},
  credit_wallets:{columns:{...textColumns('principal_id created_at updated_at'),...integerColumns('balance version')},primaryKey:['principal_id'],order:['principal_id']},
  credit_ledger:{columns:{...textColumns('id wallet_id operation kind idempotency_key created_at'),...nullableColumns('reference_type reference_id original_entry_id'),...integerColumns('sequence requested_amount applied_amount resulting_balance')},primaryKey:['id'],unique:[['wallet_id','idempotency_key'],['wallet_id','sequence']],order:['wallet_id','sequence']},
};
export const backupDefinitions=(version:BackupVersion):Partial<Record<BackupTable,TableDefinition>>=>version>=4?BACKUP_DEFINITIONS:version===3?V3_DEFINITIONS:HISTORICAL_DEFINITIONS;

export type HolocronBackup={
  format:typeof BACKUP_FORMAT;version:BackupVersion;application:'HOLOCRON';createdAt:string;
  schema:{latestMigration:typeof BACKUP_MIGRATION|typeof BACKUP_V8_MIGRATION|typeof BACKUP_V6_MIGRATION|typeof BACKUP_V5_MIGRATION|typeof BACKUP_V4_MIGRATION|typeof BACKUP_V1_MIGRATION|typeof BACKUP_V2_MIGRATION|typeof BACKUP_V3_MIGRATION};
  consistency:'d1-read-batch';tables:BackupTables;counts:BackupCounts;
};
export function backupFilename(createdAt:string){return `holocron-backup-${new Date(createdAt).toISOString().replace(/[:.]/g,'-')}.json`;}
