// Isolated schema only. Not imported by db/schema.ts or the production migration journal.
// Cross-row invariants and append-only triggers live in migrations/0001_foundation.sql.
import {sqliteTable,text,integer,primaryKey,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const seasons=sqliteTable('racing_seasons',{
 id:text('id').primaryKey(),monday:text('monday').unique(),manifest:text('manifest').notNull(),inputHash:text('input_hash').notNull(),createdAt:integer('created_at').notNull(),
});
export const racers=sqliteTable('racing_racers',{id:text('id').primaryKey(),profile:text('profile').notNull()});
export const entries=sqliteTable('racing_season_entries',{
 seasonId:text('season_id').notNull().references(()=>seasons.id),slot:integer('slot').notNull(),racerId:text('racer_id').notNull().references(()=>racers.id),profileSnapshot:text('profile_snapshot').notNull(),
},t=>[primaryKey({columns:[t.seasonId,t.slot]}),uniqueIndex('racing_entry_identity').on(t.seasonId,t.racerId)]);
export const engines=sqliteTable('racing_engine_versions',{sourceHash:text('source_hash').primaryKey(),version:text('version').notNull(),contract:text('contract').notNull()});
export const races=sqliteTable('racing_races',{
 id:text('id').primaryKey(),seasonId:text('season_id').notNull().references(()=>seasons.id),roundNo:integer('round_no').notNull(),qualifyingAt:integer('qualifying_at').notNull().unique(),startsAt:integer('starts_at').notNull().unique(),state:text('state').notNull().default('SEALED'),revision:integer('revision').notNull().default(0),finishAt:integer('finish_at'),finalAt:integer('final_at'),
},t=>[uniqueIndex('racing_round_identity').on(t.seasonId,t.roundNo)]);
export const generations=sqliteTable('racing_generations',{
 raceId:text('race_id').notNull().references(()=>races.id),stage:text('stage').notNull(),inputHash:text('input_hash').notNull(),commitment:text('commitment').notNull(),secretCipher:text('secret_cipher').notNull(),entropyRef:text('entropy_ref').notNull(),state:text('state').notNull().default('SEALED'),owner:text('owner'),leaseUntil:integer('lease_until'),attempt:integer('attempt').notNull().default(0),outputHash:text('output_hash'),outputRef:text('output_ref'),entropyHash:text('entropy_hash'),candidateHash:text('candidate_hash'),
},t=>[primaryKey({columns:[t.raceId,t.stage]})]);
export const results=sqliteTable('racing_results',{raceId:text('race_id').primaryKey().references(()=>races.id),outputHash:text('output_hash').notNull(),official:text('official').notNull()});
export const audit=sqliteTable('racing_audit',{id:integer('id').primaryKey(),raceId:text('race_id').references(()=>races.id),actor:text('actor').notNull(),command:text('command').notNull(),at:integer('at').notNull(),detail:text('detail').notNull()});
export const atomicGuard=sqliteTable('racing_atomic_guard',{id:integer('id').primaryKey(),ok:integer('ok').notNull()});
export const adminGrants=sqliteTable('racing_admin_grants',{sessionHash:text('session_hash').primaryKey(),operator:text('operator').notNull(),role:text('role').notNull(),expiresAt:integer('expires_at').notNull()});
export const profileDirectory=sqliteTable('racing_profile_directory',{racerId:text('racer_id').primaryKey(),displayName:text('display_name').notNull(),bio:text('bio').notNull(),revision:integer('revision').notNull()});
