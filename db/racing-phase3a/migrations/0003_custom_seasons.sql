-- Isolated D1 only; execute as ONE batch. Preserve existing manifest bytes and FKs.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE racing_season_copy AS SELECT * FROM racing_seasons;
DROP TABLE racing_seasons;
CREATE TABLE racing_seasons (
 id TEXT PRIMARY KEY, monday TEXT UNIQUE, manifest TEXT NOT NULL CHECK(json_valid(manifest)), input_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
 CHECK(json_array_length(manifest,'$.roster') IS 8),
 CHECK(CASE json_extract(manifest,'$.kind')
 WHEN 'regular' THEN monday IS NOT NULL AND json_array_length(manifest,'$.schedule') IS 7
 WHEN 'custom' THEN monday IS NULL AND coalesce(json_array_length(manifest,'$.schedule'),0) BETWEEN 1 AND 7
 ELSE 0 END)
);
INSERT INTO racing_seasons SELECT * FROM racing_season_copy;
DROP TABLE racing_season_copy;
CREATE TRIGGER season_immutable BEFORE UPDATE ON racing_seasons BEGIN SELECT RAISE(ABORT,'SEALED_SEASON'); END;
CREATE TRIGGER season_no_delete BEFORE DELETE ON racing_seasons BEGIN SELECT RAISE(ABORT,'SEALED_SEASON'); END;
CREATE TRIGGER season_roster_guard BEFORE INSERT ON racing_seasons WHEN
 (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.manifest,'$.roster'))!=8 OR
 EXISTS(SELECT 1 FROM json_each(NEW.manifest,'$.roster') WHERE json_extract(value,'$.id') NOT IN ('r1','r2','r3','r4','r5','r6','r7','r8'))
 BEGIN SELECT RAISE(ABORT,'INVALID_ROSTER'); END;
-- Directory identity and engine slot are separate; old sealed snapshots remain unchanged.
CREATE TABLE racing_directory_next (
 racer_id TEXT PRIMARY KEY CHECK(racer_id IN ('r1','r2','r3','r4','r5','r6','r7','r8') OR (racer_id GLOB 'reserve-[a-z0-9]*' AND length(racer_id) BETWEEN 9 AND 30)),
 display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),bio TEXT NOT NULL CHECK(length(bio)<=500),
 revision INTEGER NOT NULL CHECK(revision>0)
);
INSERT INTO racing_directory_next SELECT * FROM racing_profile_directory;
DROP TABLE racing_profile_directory;
ALTER TABLE racing_directory_next RENAME TO racing_profile_directory;
