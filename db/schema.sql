-- Cloudflare D1. One row per (report, change). No IP, no account, no free text.
-- code_hash is SHA-256 of a random code shown once to the contributor, so they
-- can delete their own report later. Rows cannot be linked to a person.
-- week is the Monday of the week the report arrived (not the exact day).
CREATE TABLE IF NOT EXISTS results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash     TEXT    NOT NULL,
  week          TEXT    NOT NULL,
  age_band      TEXT    NOT NULL,
  region        TEXT    NOT NULL,
  car_age       TEXT    NOT NULL,
  ncd           TEXT    NOT NULL,
  cover         TEXT    NOT NULL,
  site          TEXT    NOT NULL,
  change_key    TEXT    NOT NULL,
  pct           REAL    NOT NULL,           -- % change vs the contributor's own baseline
  repeats       INTEGER NOT NULL,
  noise_pct     REAL    NOT NULL,
  baseline_runs INTEGER NOT NULL
);
-- Circuit breaker: counts accepted reports per hour and per day. No IPs, no identifiers.
CREATE TABLE IF NOT EXISTS limits (
  bucket TEXT PRIMARY KEY,   -- 'h:2026-10-19T09' or 'd:2026-10-19'
  n      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_change ON results (change_key);
CREATE INDEX IF NOT EXISTS idx_results_code   ON results (code_hash);
CREATE INDEX IF NOT EXISTS idx_results_week   ON results (week);
