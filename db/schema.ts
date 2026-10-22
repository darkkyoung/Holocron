import { sqliteTable,text,integer,index,primaryKey,check,uniqueIndex,type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const articles=sqliteTable('articles',{id:text('id').primaryKey(),topic:text('topic').notNull(),topicOverride:text('topic_override'),title:text('title').notNull(),titleOverride:text('title_override'),summary:text('summary').notNull(),image:text('image').notNull(),url:text('url').notNull().unique(),source:text('source').notNull(),published:text('published').notNull(),category:text('category').notNull(),status:text('status').notNull().default('published'),statusOverride:text('status_override'),reason:text('reason').notNull().default(''),franchise:text('franchise').notNull().default('star-wars')},t=>[index('idx_articles_status_topic').on(t.status,t.topic),index('idx_articles_status_published').on(t.status,t.published)]);
export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const collectionLocks=sqliteTable('collection_locks',{name:text('name').primaryKey(),owner:text('owner').notNull(),trigger:text('trigger').notNull(),acquiredAt:text('acquired_at').notNull(),expiresAt:text('expires_at').notNull()});
export const works=sqliteTable('works',{id:text('id').primaryKey(),title:text('title').notNull(),originalTitle:text('original_title').notNull(),type:text('type').notNull(),status:text('status').notNull(),posterUrl:text('poster_url').notNull(),posterSource:text('poster_source'),posterReferenceUrl:text('poster_reference_url'),posterTmdbPath:text('poster_tmdb_path'),releaseDate:text('release_date'),releasePrecision:text('release_precision').notNull().default('unknown'),officialUrl:text('official_url'),franchise:text('franchise').notNull().default('star-wars'),seriesKey:text('series_key'),seasonNumber:text('season_number'),tmdbMediaType:text('tmdb_media_type'),tmdbId:text('tmdb_id'),tmdbSeasonNumber:text('tmdb_season_number'),creatorCredit:text('creator_credit'),principalCast:text('principal_cast'),synopsis:text('synopsis'),releaseContext:text('release_context')},t=>[index('idx_works_status_release_date').on(t.status,t.releaseDate),index('idx_works_series_season').on(t.seriesKey,t.seasonNumber),index('idx_works_tmdb_reference').on(t.tmdbMediaType,t.tmdbId,t.tmdbSeasonNumber)]);
export const betaAnalyticsDailySessions=sqliteTable('beta_analytics_daily_sessions',{period:text('period').notNull(),day:text('day').notNull(),route:text('route').notNull(),sessionHash:text('session_hash').notNull(),pageViews:integer('page_views').notNull().default(1),firstSeenAt:text('first_seen_at').notNull(),lastSeenAt:text('last_seen_at').notNull()},t=>[primaryKey({columns:[t.period,t.day,t.route,t.sessionHash]}),index('idx_beta_analytics_period_day_route').on(t.period,t.day,t.route)]);
export const feedbackRateLimits=sqliteTable('feedback_rate_limits',{sessionHash:text('session_hash').primaryKey(),nextAllowedAt:text('next_allowed_at').notNull()});
export const feedbackSessions=sqliteTable('feedback_sessions',{sessionHash:text('session_hash').primaryKey(),displayTag:text('display_tag').notNull().unique(),nickname:text('nickname').notNull(),messageCount:integer('message_count').notNull().default(0),firstSeenAt:text('first_seen_at').notNull(),lastSeenAt:text('last_seen_at').notNull(),banned:integer('banned').notNull().default(0),bannedAt:text('banned_at')},t=>[index('idx_feedback_sessions_last_seen').on(t.lastSeenAt)]);
export const adminLoginRateLimits=sqliteTable('admin_login_rate_limits',{clientHash:text('client_hash').primaryKey(),failedCount:integer('failed_count').notNull().default(0),windowStartedAt:integer('window_started_at').notNull(),blockedUntil:integer('blocked_until'),updatedAt:integer('updated_at').notNull()},t=>[index('idx_admin_login_rate_limits_updated_at').on(t.updatedAt)]);

export const quizzes=sqliteTable('quizzes',{id:text('id').primaryKey(),title:text('title').notNull(),question:text('question').notNull(),heroImageUrl:text('hero_image_url'),heroCropX:integer('hero_crop_x').notNull().default(50),heroCropY:integer('hero_crop_y').notNull().default(50),heroCropZoom:integer('hero_crop_zoom').notNull().default(100),heroLinkUrl:text('hero_link_url'),explanation:text('explanation').notNull().default(''),status:text('status').notNull().default('draft'),publishAt:text('publish_at'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('idx_quizzes_status_publish_at').on(t.status,t.publishAt)]);
export const quizOptions=sqliteTable('quiz_options',{id:text('id').primaryKey(),quizId:text('quiz_id').notNull(),position:integer('position').notNull(),label:text('label').notNull(),imageUrl:text('image_url'),imageCropX:integer('image_crop_x').notNull().default(50),imageCropY:integer('image_crop_y').notNull().default(50),imageCropZoom:integer('image_crop_zoom').notNull().default(100),isCorrect:integer('is_correct').notNull().default(0)},t=>[index('idx_quiz_options_quiz_position').on(t.quizId,t.position)]);
export const quizResponses=sqliteTable('quiz_responses',{quizId:text('quiz_id').notNull(),sessionHash:text('session_hash').notNull(),optionId:text('option_id').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.quizId,t.sessionHash]}),index('idx_quiz_responses_quiz_option').on(t.quizId,t.optionId)]);

export const articleWorkRelations=sqliteTable('article_work_relations',{
  articleId:text('article_id').notNull().references(()=>articles.id,{onDelete:'cascade'}),
  workId:text('work_id').notNull().references(()=>works.id,{onDelete:'cascade'}),
  state:text('state',{enum:['linked','excluded']}).notNull(),
  origin:text('origin',{enum:['automatic','manual']}).notNull(),
},t=>[primaryKey({columns:[t.articleId,t.workId]}),index('idx_article_work_work_state').on(t.workId,t.state,t.articleId),
  check('article_work_state',sql`${t.state} IN ('linked','excluded')`),
  check('article_work_origin',sql`${t.origin} IN ('automatic','manual')`),
  check('article_work_exclusion_manual',sql`${t.state} <> 'excluded' OR ${t.origin} = 'manual'`)]);

// Credit foundation: no public route/reward is enabled by these tables.
export const users=sqliteTable('users',{id:text('id').primaryKey(),createdAt:text('created_at').notNull()});
export const authAccounts=sqliteTable('auth_accounts',{
  provider:text('provider').notNull(),providerSubject:text('provider_subject').notNull(),
  userId:text('user_id').notNull().references(()=>users.id),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.provider,t.providerSubject]}),index('idx_auth_accounts_user').on(t.userId)]);
export const creditPrincipals=sqliteTable('credit_principals',{
  id:text('id').primaryKey(),type:text('type',{enum:['guest','account']}).notNull(),
  guestKeyHash:text('guest_key_hash'),userId:text('user_id').references(()=>users.id),
  createdAt:text('created_at').notNull(),retiredAt:text('retired_at'),
},t=>[uniqueIndex('idx_credit_guest_key').on(t.guestKeyHash),uniqueIndex('idx_credit_user').on(t.userId),
  check('credit_principal_identity',sql`(${t.type}='guest' AND ${t.guestKeyHash} IS NOT NULL AND length(${t.guestKeyHash})=64 AND ${t.userId} IS NULL) OR (${t.type}='account' AND ${t.userId} IS NOT NULL AND ${t.guestKeyHash} IS NULL)`)]);
export const creditWallets=sqliteTable('credit_wallets',{
  principalId:text('principal_id').primaryKey().references(()=>creditPrincipals.id),
  balance:integer('balance').notNull().default(0),version:integer('version').notNull().default(0),
  createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[check('credit_balance_safe',sql`typeof(${t.balance})='integer' AND ${t.balance} BETWEEN 0 AND 9007199254740991`),
  check('credit_version_safe',sql`typeof(${t.version})='integer' AND ${t.version} BETWEEN 0 AND 9007199254740991`)]);
export const creditLedger=sqliteTable('credit_ledger',{
  id:text('id').primaryKey(),walletId:text('wallet_id').notNull().references(()=>creditWallets.principalId),
  sequence:integer('sequence').notNull(),operation:text('operation').notNull(),kind:text('kind').notNull(),
  idempotencyKey:text('idempotency_key').notNull(),requestedAmount:integer('requested_amount').notNull(),
  appliedAmount:integer('applied_amount').notNull(),resultingBalance:integer('resulting_balance').notNull(),
  referenceType:text('reference_type'),referenceId:text('reference_id'),
  originalEntryId:text('original_entry_id').references(():AnySQLiteColumn=>creditLedger.id),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_credit_ledger_key').on(t.walletId,t.idempotencyKey),uniqueIndex('idx_credit_ledger_sequence').on(t.walletId,t.sequence),
  index('idx_credit_ledger_original').on(t.originalEntryId),index('idx_credit_ledger_reference').on(t.referenceType,t.referenceId),
  check('credit_ledger_bounds',sql`typeof(${t.sequence})='integer' AND ${t.sequence} BETWEEN 1 AND 9007199254740991 AND typeof(${t.requestedAmount})='integer' AND ${t.requestedAmount} BETWEEN -9007199254740991 AND 9007199254740991 AND typeof(${t.appliedAmount})='integer' AND ${t.appliedAmount} BETWEEN -9007199254740991 AND 9007199254740991 AND typeof(${t.resultingBalance})='integer' AND ${t.resultingBalance} BETWEEN 0 AND 9007199254740991`),
  check('credit_ledger_direction',sql`(${t.operation}='credit' AND ${t.requestedAmount}>0 AND ${t.appliedAmount} BETWEEN 0 AND ${t.requestedAmount} AND ${t.originalEntryId} IS NULL) OR (${t.operation}='debit' AND ${t.requestedAmount}<0 AND ${t.appliedAmount}=${t.requestedAmount} AND ${t.originalEntryId} IS NULL) OR (${t.operation}='refund' AND ${t.requestedAmount}>0 AND ${t.appliedAmount} BETWEEN 0 AND ${t.requestedAmount} AND ${t.originalEntryId} IS NOT NULL) OR (${t.operation}='claim' AND ${t.requestedAmount}=0 AND ${t.appliedAmount}=0 AND ${t.originalEntryId} IS NULL)`),
  check('credit_ledger_metadata',sql`length(${t.kind}) BETWEEN 1 AND 64 AND length(${t.idempotencyKey}) BETWEEN 1 AND 200 AND ((${t.referenceType} IS NULL AND ${t.referenceId} IS NULL) OR (${t.referenceType} IS NOT NULL AND ${t.referenceId} IS NOT NULL AND length(${t.referenceType}) BETWEEN 1 AND 64 AND length(${t.referenceId}) BETWEEN 1 AND 200))`)]);

// Temporary, content-free AI operations. Credit remains exclusively in the ledger.
export const assistantAdmissions=sqliteTable('assistant_admissions',{
  securityPolicy:text('security_policy').notNull().default('edge-v1'),
  requestId:text('request_id').primaryKey(),action:text('action').notNull(),sessionHash:text('session_hash').notNull(),
  networkHash:text('network_hash').notNull(),inputHmac:text('input_hmac').notNull(),ownerToken:text('owner_token').notNull(),
  principalId:text('principal_id').references(()=>creditPrincipals.id),debitEntryId:text('debit_entry_id'),
  weight:integer('weight').notNull(),reservedCostMicros:integer('reserved_cost_micros').notNull(),actualCostMicros:integer('actual_cost_micros'),
  state:text('state').notNull(),createdAt:integer('created_at').notNull(),leaseExpiresAt:integer('lease_expires_at').notNull(),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_assistant_created').on(t.createdAt),index('idx_assistant_session').on(t.sessionHash,t.createdAt),
  index('idx_assistant_network').on(t.networkHash,t.createdAt),index('idx_assistant_expiry').on(t.expiresAt),
  check('assistant_hashes',sql`length(${t.sessionHash})=64 AND length(${t.networkHash})=64 AND length(${t.inputHmac})=64`),
  check('assistant_cost',sql`typeof(${t.reservedCostMicros})='integer' AND ${t.reservedCostMicros} BETWEEN 0 AND 2000000 AND (${t.actualCostMicros} IS NULL OR (typeof(${t.actualCostMicros})='integer' AND ${t.actualCostMicros} BETWEEN 0 AND ${t.reservedCostMicros}))`),
  check('assistant_action',sql`(${t.action}='retrieve' AND ${t.weight}=0 AND ${t.principalId} IS NULL AND ${t.debitEntryId} IS NULL AND ${t.state}='completed' AND ${t.reservedCostMicros}=0) OR (${t.action} IN ('qa','planner','draft') AND ${t.weight}=IIF(${t.action}='qa',1,4) AND ${t.principalId} IS NOT NULL AND ${t.debitEntryId} IS NOT NULL)`),
  check('assistant_state',sql`${t.state} IN ('started','completed','failed','refund_pending')`),
  check('assistant_time',sql`typeof(${t.createdAt})='integer' AND typeof(${t.leaseExpiresAt})='integer' AND typeof(${t.expiresAt})='integer' AND ${t.createdAt}>=0 AND ${t.expiresAt}>${t.createdAt}`)]);

// Additive 0019: credit_policy_revisions; guards are in the versioned migration.
export const creditPolicyRevisions=sqliteTable('credit_policy_revisions',{
  id:text('id').primaryKey().notNull(),
  version:integer('version').notNull().unique(),
  policyJson:text('policy_json').notNull(),
  previousJson:text('previous_json'),
  changedAt:text('changed_at').notNull(),
  actor:text('actor').notNull(),
},()=>[check('policy_version_safe',sql`typeof(version)='integer' AND version BETWEEN 1 AND 9007199254740991`),check('policy_values_valid',sql`COALESCE(json_valid(policy_json) AND json_type(policy_json)='object' AND json_type(policy_json,'$.qaCredits')='integer' AND json_extract(policy_json,'$.qaCredits') BETWEEN 1 AND 100 AND json_type(policy_json,'$.plannerCredits')='integer' AND json_extract(policy_json,'$.plannerCredits') BETWEEN 1 AND 100 AND json_type(policy_json,'$.guestFirst')='integer' AND json_extract(policy_json,'$.guestFirst') BETWEEN 1 AND 10 AND json_type(policy_json,'$.opening')='integer' AND json_extract(policy_json,'$.opening') BETWEEN 1 AND 10 AND json_type(policy_json,'$.attendanceDaily')='integer' AND json_extract(policy_json,'$.attendanceDaily') BETWEEN 1 AND 10 AND json_type(policy_json,'$.attendanceDay7')='integer' AND json_extract(policy_json,'$.attendanceDay7') BETWEEN 1 AND 10 AND json_type(policy_json,'$.quizCorrect')='integer' AND json_extract(policy_json,'$.quizCorrect') BETWEEN 1 AND 10 AND json_type(policy_json,'$.accountFirst')='integer' AND json_extract(policy_json,'$.accountFirst') BETWEEN 1 AND 10 AND json_type(policy_json,'$.monthlyLimitUsd')='integer' AND json_extract(policy_json,'$.monthlyLimitUsd') BETWEEN 1 AND 1000 AND json_type(policy_json,'$.monthlyWarningUsd')='integer' AND json_extract(policy_json,'$.monthlyWarningUsd') BETWEEN 1 AND 1000 AND json_extract(policy_json,'$.monthlyWarningUsd')<=json_extract(policy_json,'$.monthlyLimitUsd'),0)`),check('policy_actor_valid',sql`actor IN ('system','admin')`)]);
// Additive 0019: assistant_monthly_costs; guards are in the versioned migration.
export const assistantMonthlyCosts=sqliteTable('assistant_monthly_costs',{
  month:text('month').primaryKey().notNull(),
  reservedMicros:integer('reserved_micros').notNull(),
  reconciledReservedMicros:integer('reconciled_reserved_micros').notNull(),
  actualMicros:integer('actual_micros').notNull(),
  attempts:integer('attempts').notNull(),
  knownAttempts:integer('known_attempts').notNull(),
},()=>[check('monthly_period_valid',sql`length(month)=7 AND month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(month,6,2) BETWEEN '01' AND '12'`),check('monthly_reserved_micros_safe',sql`typeof(reserved_micros)='integer' AND reconciled_reserved_micros BETWEEN 0 AND reserved_micros`),check('monthly_actual_micros_safe',sql`typeof(actual_micros)='integer' AND actual_micros BETWEEN 0 AND reconciled_reserved_micros`),check('monthly_attempts_safe',sql`typeof(attempts)='integer' AND known_attempts BETWEEN 0 AND attempts`)]);

// Operational recovery state, excluded from backup; Credit ledger remains durable.
export const assistantSearches=sqliteTable('assistant_searches',{
 requestId:text('request_id').primaryKey().notNull(),principalId:text('principal_id').notNull().references(()=>creditPrincipals.id),
 inputHmac:text('input_hmac').notNull(),ownerToken:text('owner_token').notNull(),state:text('state').notNull(),
 resultCipher:text('result_cipher'),charged:integer('charged').notNull().default(0),debitEntryId:text('debit_entry_id'),
 createdAt:integer('created_at').notNull(),leaseExpiresAt:integer('lease_expires_at').notNull(),resultExpiresAt:integer('result_expires_at').notNull(),
});
