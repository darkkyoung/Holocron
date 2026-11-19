-- ISOLATED Phase 3-A only. Not part of the production Drizzle journal.
PRAGMA foreign_keys=ON;
CREATE TABLE racing_seasons (
 id TEXT PRIMARY KEY, monday TEXT NOT NULL UNIQUE, manifest TEXT NOT NULL CHECK(json_valid(manifest)), input_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
 CHECK(json_array_length(manifest,'$.roster')=8), CHECK(json_array_length(manifest,'$.schedule')=7)
);
CREATE TABLE racing_races (
 id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES racing_seasons(id), round_no INTEGER NOT NULL CHECK(round_no BETWEEN 1 AND 7),
 qualifying_at INTEGER NOT NULL UNIQUE, starts_at INTEGER NOT NULL UNIQUE,
 state TEXT NOT NULL DEFAULT 'SEALED' CHECK(state IN ('SEALED','GENERATING','READY','RUNNING','PROVISIONAL','FINAL','QUARANTINED','CANCELLED')),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), finish_at INTEGER, final_at INTEGER,
 UNIQUE(season_id,round_no), CHECK(typeof(starts_at)='integer' AND typeof(qualifying_at)='integer' AND starts_at=qualifying_at+3600000),
 CHECK((finish_at IS NULL AND final_at IS NULL) OR (typeof(finish_at)='integer' AND typeof(final_at)='integer' AND finish_at>starts_at AND final_at>=finish_at))
);
CREATE TABLE racing_generations (
 race_id TEXT NOT NULL REFERENCES racing_races(id), stage TEXT NOT NULL CHECK(stage IN ('qualifying','main')),
 input_hash TEXT NOT NULL, commitment TEXT NOT NULL, secret_cipher TEXT NOT NULL, entropy_ref TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'SEALED' CHECK(state IN ('SEALED','GENERATING','READY','FAILED','QUARANTINED')),
 owner TEXT, lease_until INTEGER, attempt INTEGER NOT NULL DEFAULT 0,
 output_hash TEXT, output_ref TEXT, entropy_hash TEXT, candidate_hash TEXT,
 PRIMARY KEY(race_id,stage), CHECK((state='READY')=(output_hash IS NOT NULL AND output_ref IS NOT NULL AND entropy_hash IS NOT NULL))
);
CREATE TABLE racing_results (
 race_id TEXT PRIMARY KEY REFERENCES racing_races(id), output_hash TEXT NOT NULL, official TEXT NOT NULL CHECK(json_valid(official)),
 CHECK(json_array_length(official)=8)
);
CREATE TABLE racing_audit (
 id INTEGER PRIMARY KEY, race_id TEXT REFERENCES racing_races(id), actor TEXT NOT NULL, command TEXT NOT NULL, at INTEGER NOT NULL, detail TEXT NOT NULL
);
CREATE INDEX racing_due ON racing_races(state,starts_at);
CREATE TRIGGER season_immutable BEFORE UPDATE ON racing_seasons BEGIN SELECT RAISE(ABORT,'SEALED_SEASON'); END;
CREATE TRIGGER season_no_delete BEFORE DELETE ON racing_seasons BEGIN SELECT RAISE(ABORT,'SEALED_SEASON'); END;
CREATE TRIGGER race_no_delete BEFORE DELETE ON racing_races BEGIN SELECT RAISE(ABORT,'SEALED_RACE'); END;
CREATE TRIGGER race_immutable BEFORE UPDATE ON racing_races WHEN NEW.id!=OLD.id OR NEW.season_id!=OLD.season_id OR NEW.round_no!=OLD.round_no OR NEW.qualifying_at!=OLD.qualifying_at OR NEW.starts_at!=OLD.starts_at OR (OLD.finish_at IS NOT NULL AND (NEW.finish_at IS NOT OLD.finish_at OR NEW.final_at IS NOT OLD.final_at)) BEGIN SELECT RAISE(ABORT,'SEALED_RACE'); END;
CREATE TRIGGER race_transition BEFORE UPDATE ON racing_races WHEN NEW.revision!=OLD.revision+1 OR NOT (
 (OLD.state='SEALED' AND NEW.state IN ('GENERATING','CANCELLED','QUARANTINED')) OR
 (OLD.state='GENERATING' AND NEW.state IN ('READY','QUARANTINED','CANCELLED')) OR
 (OLD.state='READY' AND NEW.state IN ('RUNNING','QUARANTINED')) OR
 (OLD.state='RUNNING' AND NEW.state='PROVISIONAL') OR
 (OLD.state='PROVISIONAL' AND NEW.state='FINAL')) BEGIN SELECT RAISE(ABORT,'INVALID_TRANSITION'); END;
CREATE TRIGGER generation_immutable BEFORE UPDATE ON racing_generations WHEN NEW.race_id!=OLD.race_id OR NEW.stage!=OLD.stage OR NEW.input_hash!=OLD.input_hash OR NEW.commitment!=OLD.commitment OR NEW.secret_cipher!=OLD.secret_cipher OR NEW.entropy_ref!=OLD.entropy_ref OR (OLD.entropy_hash IS NOT NULL AND NEW.entropy_hash IS NOT OLD.entropy_hash) OR (OLD.candidate_hash IS NOT NULL AND NEW.candidate_hash IS NOT OLD.candidate_hash) OR OLD.state IN ('READY','QUARANTINED') BEGIN SELECT RAISE(ABORT,'SEALED_GENERATION'); END;
CREATE TRIGGER generation_no_delete BEFORE DELETE ON racing_generations BEGIN SELECT RAISE(ABORT,'SEALED_GENERATION'); END;
CREATE TRIGGER results_immutable BEFORE UPDATE ON racing_results BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RESULT'); END;
CREATE TRIGGER results_no_delete BEFORE DELETE ON racing_results BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RESULT'); END;
CREATE TRIGGER result_guard BEFORE INSERT ON racing_results WHEN (SELECT state FROM racing_races WHERE id=NEW.race_id)!='GENERATING' OR NOT EXISTS(SELECT 1 FROM racing_generations WHERE race_id=NEW.race_id AND stage='main' AND state='READY' AND output_hash=NEW.output_hash) OR (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.official))!=8 OR EXISTS(SELECT 1 FROM json_each(NEW.official) WHERE json_extract(value,'$.id') NOT IN ('r1','r2','r3','r4','r5','r6','r7','r8') OR (json_extract(value,'$.status')='DSQ' AND json_extract(value,'$.points')!=0)) BEGIN SELECT RAISE(ABORT,'INVALID_RESULT'); END;
CREATE TRIGGER audit_immutable BEFORE UPDATE ON racing_audit BEGIN SELECT RAISE(ABORT,'IMMUTABLE_AUDIT'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON racing_audit BEGIN SELECT RAISE(ABORT,'IMMUTABLE_AUDIT'); END;
CREATE TABLE racing_atomic_guard (id INTEGER PRIMARY KEY CHECK(id=1), ok INTEGER NOT NULL CHECK(ok=1));
CREATE TRIGGER race_ready_guard BEFORE UPDATE ON racing_races WHEN NEW.state IN ('READY','RUNNING','PROVISIONAL','FINAL') AND (NOT EXISTS(SELECT 1 FROM racing_results WHERE race_id=NEW.id) OR NEW.finish_at IS NULL OR NEW.final_at<NEW.finish_at) BEGIN SELECT RAISE(ABORT,'MISSING_RESULT'); END;

CREATE TABLE racing_racers (id TEXT PRIMARY KEY, profile TEXT NOT NULL CHECK(json_valid(profile)));
CREATE TABLE racing_season_entries (season_id TEXT NOT NULL REFERENCES racing_seasons(id),slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 8),racer_id TEXT NOT NULL REFERENCES racing_racers(id),profile_snapshot TEXT NOT NULL CHECK(json_valid(profile_snapshot)),PRIMARY KEY(season_id,slot),UNIQUE(season_id,racer_id));
CREATE TABLE racing_engine_versions (source_hash TEXT PRIMARY KEY,version TEXT NOT NULL,contract TEXT NOT NULL);
CREATE TRIGGER racing_racers_update BEFORE UPDATE ON racing_racers BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SNAPSHOT'); END;
CREATE TRIGGER racing_racers_delete BEFORE DELETE ON racing_racers BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SNAPSHOT'); END;
CREATE TRIGGER racing_season_entries_update BEFORE UPDATE ON racing_season_entries BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SNAPSHOT'); END;
CREATE TRIGGER racing_season_entries_delete BEFORE DELETE ON racing_season_entries BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SNAPSHOT'); END;
CREATE TRIGGER racing_engine_versions_update BEFORE UPDATE ON racing_engine_versions BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SNAPSHOT'); END;
CREATE TRIGGER racing_engine_versions_delete BEFORE DELETE ON racing_engine_versions BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SNAPSHOT'); END;
CREATE TRIGGER generation_transition BEFORE UPDATE ON racing_generations WHEN NOT (
 (OLD.state IN ('SEALED','FAILED') AND NEW.state='GENERATING') OR
 (OLD.state='GENERATING' AND NEW.state IN ('GENERATING','FAILED','READY','QUARANTINED'))) BEGIN SELECT RAISE(ABORT,'INVALID_GENERATION_TRANSITION'); END;
CREATE TRIGGER season_roster_guard BEFORE INSERT ON racing_seasons WHEN
 (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.manifest,'$.roster'))!=8 OR
 EXISTS(SELECT 1 FROM json_each(NEW.manifest,'$.roster') WHERE json_extract(value,'$.id') NOT IN ('r1','r2','r3','r4','r5','r6','r7','r8'))
 BEGIN SELECT RAISE(ABORT,'INVALID_ROSTER'); END;
CREATE TRIGGER result_classification_guard BEFORE INSERT ON racing_results WHEN
 (SELECT count(DISTINCT json_extract(value,'$.position')) FROM json_each(NEW.official))!=8 OR
 EXISTS(SELECT 1 FROM json_each(NEW.official) WHERE
 json_type(value,'$.position') IS NOT 'integer' OR json_type(value,'$.status') IS NOT 'text' OR json_type(value,'$.points') IS NOT 'integer' OR json_extract(value,'$.position') NOT BETWEEN 1 AND 8 OR
 json_extract(value,'$.status') NOT IN ('FINISHED','DNF','DSQ') OR
 json_extract(value,'$.points') IS NOT CASE WHEN json_extract(value,'$.status')='FINISHED' THEN
 CASE json_extract(value,'$.position') WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12 WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4 END ELSE 0 END)
 BEGIN SELECT RAISE(ABORT,'INVALID_CLASSIFICATION'); END;
CREATE TRIGGER generation_ready_guard BEFORE UPDATE ON racing_generations WHEN NEW.state='READY' AND (
 NEW.output_hash IS NOT NEW.candidate_hash OR NOT EXISTS(SELECT 1 FROM racing_races WHERE id=NEW.race_id AND state IN ('SEALED','GENERATING')))
 BEGIN SELECT RAISE(ABORT,'INVALID_COMPLETION'); END;
