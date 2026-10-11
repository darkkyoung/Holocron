export const BACKUP_FORMAT='holocron-d1-backup';
export const BACKUP_VERSION=1;
export const BACKUP_MIGRATION='0013_loving_silver_fox.sql';
export const BACKUP_TABLES=['articles','works','quizzes','quiz_options','quiz_responses','beta_analytics_daily_sessions','feedback_sessions','settings'] as const;
export type BackupTable=typeof BACKUP_TABLES[number];
export type BackupRow=Record<string,string|number|null>;
export type BackupTables=Record<BackupTable,BackupRow[]>;
export type BackupCounts=Record<BackupTable,number>;
export const BACKUP_SETTINGS_KEYS=['beta_analytics_start_at','collection_schedule_v1','collection_sources_v1','public_roadmap_copy_v1','public_site_copy_v1'] as const;
export const EXCLUDED_TABLES={collection_locks:'Temporary collection lease',admin_login_rate_limits:'Temporary authentication security state',feedback_rate_limits:'Temporary feedback cooldown'} as const;
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
export const BACKUP_DEFINITIONS:Record<BackupTable,TableDefinition>={
  articles:{columns:{...textColumns('id topic title summary image url source published category status reason franchise'),...nullableColumns('topic_override title_override status_override')},primaryKey:['id'],unique:[['url']],order:['id']},
  works:{columns:{...textColumns('id title original_title type status poster_url release_precision franchise'),...nullableColumns('poster_source poster_reference_url poster_tmdb_path release_date official_url series_key season_number tmdb_media_type tmdb_id tmdb_season_number')},primaryKey:['id'],order:['id']},
  quizzes:{columns:{...textColumns('id title question explanation status created_at updated_at'),...nullableColumns('hero_image_url hero_link_url publish_at'),...integerColumns('hero_crop_x hero_crop_y hero_crop_zoom')},primaryKey:['id'],order:['id']},
  quiz_options:{columns:{...textColumns('id quiz_id label'),...nullableColumns('image_url'),...integerColumns('position is_correct image_crop_x image_crop_y image_crop_zoom')},primaryKey:['id'],order:['quiz_id','position','id']},
  quiz_responses:{columns:textColumns('quiz_id session_hash option_id created_at'),primaryKey:['quiz_id','session_hash'],order:['quiz_id','session_hash']},
  beta_analytics_daily_sessions:{columns:{...textColumns('period day route session_hash first_seen_at last_seen_at'),...integerColumns('page_views')},primaryKey:['period','day','route','session_hash'],order:['period','day','route','session_hash']},
  feedback_sessions:{columns:{...textColumns('session_hash display_tag nickname first_seen_at last_seen_at'),...nullableColumns('banned_at'),...integerColumns('message_count banned')},primaryKey:['session_hash'],unique:[['display_tag']],order:['session_hash']},
  settings:{columns:textColumns('key value'),primaryKey:['key'],order:['key']},
};

export type HolocronBackup={
  format:typeof BACKUP_FORMAT;version:typeof BACKUP_VERSION;application:'HOLOCRON';createdAt:string;
  schema:{latestMigration:typeof BACKUP_MIGRATION};
  consistency:'d1-read-batch';tables:BackupTables;counts:BackupCounts;
};
export function backupFilename(createdAt:string){return `holocron-backup-${new Date(createdAt).toISOString().replace(/[:.]/g,'-')}.json`;}
