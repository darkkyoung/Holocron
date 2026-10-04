export const BACKUP_FORMAT='holocron-d1-backup' as const;
export const BACKUP_VERSION=1 as const;
export const BACKUP_APPLICATION='holocron' as const;
export const BACKUP_MIGRATION='0013_loving_silver_fox' as const;

export const BACKUP_TABLES=[
  'articles','works','quizzes','quiz_options','quiz_responses','settings','beta_analytics_daily_sessions','feedback_sessions',
] as const;
export type BackupTable=typeof BACKUP_TABLES[number];

export const BACKUP_SETTINGS_KEYS=[
  'beta_analytics_start_at','collection_schedule_v1','collection_sources_v1','public_roadmap_copy_v1','public_site_copy_v1',
] as const;

export const EPHEMERAL_TABLES=['collection_locks','admin_login_rate_limits','feedback_rate_limits'] as const;

export type BackupScalar=string|number|null;
export type BackupRow=Record<string,BackupScalar>;
export type BackupTables={ [K in BackupTable]:BackupRow[] };
export type BackupCounts={ [K in BackupTable]:number };

export type HolocronBackup={
  format:typeof BACKUP_FORMAT;
  version:typeof BACKUP_VERSION;
  createdAt:string;
  application:typeof BACKUP_APPLICATION;
  schema:{migration:typeof BACKUP_MIGRATION};
  tableList:BackupTable[];
  counts:BackupCounts;
  tables:BackupTables;
};

export function backupFilename(createdAt:string){
  const safe=createdAt.replace(/\.[0-9]{3}Z$/,'Z').replace(/:/g,'-');
  return `holocron-backup-${safe}.json`;
}
