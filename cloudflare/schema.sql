CREATE TABLE IF NOT EXISTS media (
  token TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'booth',
  collection TEXT NOT NULL DEFAULT 'booth',
  caption TEXT NOT NULL DEFAULT '',
  live_wall INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at);
CREATE INDEX IF NOT EXISTS idx_media_kind_live_wall ON media(kind, live_wall, sort_order, created_at);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
