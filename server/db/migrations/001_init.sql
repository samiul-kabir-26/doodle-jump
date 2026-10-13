-- 001_init.sql

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  external_user_id TEXT,
  device_id TEXT,
  display_name TEXT NOT NULL,
  banned_at INTEGER,
  ban_reason TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_ext_id ON players(external_user_id) WHERE external_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_device_id ON players(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  seed INTEGER NOT NULL,
  theme_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  score INTEGER,
  max_height INTEGER,
  duration_ms INTEGER,
  end_reason TEXT,
  reject_reason TEXT,
  stats TEXT,
  client_info TEXT,
  client_event_count INTEGER NOT NULL DEFAULT 0,
  end_response TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_player ON game_sessions(player_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON game_sessions(status, started_at);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  session_id TEXT NOT NULL UNIQUE REFERENCES game_sessions(id),
  score INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  day_key TEXT NOT NULL,
  week_key TEXT NOT NULL,
  hidden_at INTEGER,
  hidden_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_scores_day ON scores(day_key, score DESC, achieved_at);
CREATE INDEX IF NOT EXISTS idx_scores_week ON scores(week_key, score DESC, achieved_at);
CREATE INDEX IF NOT EXISTS idx_scores_all ON scores(score DESC, achieved_at);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id, score DESC);

CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  version INTEGER NOT NULL,
  category TEXT NOT NULL,
  trust TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  player_id TEXT REFERENCES players(id),
  external_user_id TEXT,
  session_id TEXT REFERENCES game_sessions(id),
  client_event_id TEXT,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, seq);
CREATE INDEX IF NOT EXISTS idx_events_cat ON events(category, seq);
CREATE INDEX IF NOT EXISTS idx_events_player ON events(player_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_ext ON events(external_user_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON events(occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_client_dedupe ON events(session_id, client_event_id) WHERE client_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  event_seq INTEGER NOT NULL REFERENCES events(seq) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_status_code INTEGER,
  last_error TEXT,
  last_duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS theme_versions (
  version INTEGER PRIMARY KEY,
  theme TEXT NOT NULL,
  note TEXT,
  published_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS theme_draft (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  base_version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS used_launch_tokens (
  jti TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
