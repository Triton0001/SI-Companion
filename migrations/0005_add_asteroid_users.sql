CREATE TABLE IF NOT EXISTS asteroid_users (
  username_key TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
