-- Storage limitation: delete raw rows older than 24 months. Run monthly:
--   npx wrangler d1 execute quote-guide --remote --file db/purge.sql
DELETE FROM results WHERE week < date('now', '-730 days');
DELETE FROM limits  WHERE substr(bucket, 3, 10) < date('now', '-3 days');

-- Moderation helpers (run by hand with --command):
--   Remove a suspected spam burst:   DELETE FROM results WHERE week = '2026-10-19' AND change_key = 'add_named_driver';
--   Remove one contributor on request: DELETE FROM results WHERE code_hash = '<sha256 of their code>';
