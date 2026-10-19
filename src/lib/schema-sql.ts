// The database tables, created on first use so there is no manual "run the schema" step.
// Keep in step with db/schema.sql (a test compares them).
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS results (
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
  pct           REAL    NOT NULL,
  repeats       INTEGER NOT NULL,
  noise_pct     REAL    NOT NULL,
  baseline_runs INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS limits (
  bucket TEXT PRIMARY KEY,
  n      INTEGER NOT NULL
)`,
  'CREATE INDEX IF NOT EXISTS idx_results_change ON results (change_key)',
  'CREATE INDEX IF NOT EXISTS idx_results_code   ON results (code_hash)',
  'CREATE INDEX IF NOT EXISTS idx_results_week   ON results (week)',
];
