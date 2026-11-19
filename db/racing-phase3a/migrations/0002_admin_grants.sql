-- Isolated racing binding only. Provision out-of-band after authenticating the operator.
CREATE TABLE racing_admin_grants(
 session_hash TEXT PRIMARY KEY, operator TEXT NOT NULL CHECK(length(operator) BETWEEN 1 AND 80),
 role TEXT NOT NULL CHECK(role IN ('viewer','scheduler','incident')), expires_at INTEGER NOT NULL
);
-- Mutable directory for future presentation only. Never updates a sealed roster.
CREATE TABLE racing_profile_directory(
 racer_id TEXT PRIMARY KEY CHECK(racer_id IN ('r1','r2','r3','r4','r5','r6','r7','r8')),
 display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
 bio TEXT NOT NULL CHECK(length(bio)<=500), revision INTEGER NOT NULL CHECK(revision>0)
);
