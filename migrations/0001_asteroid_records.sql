CREATE TABLE IF NOT EXISTS asteroid_records (
  id TEXT PRIMARY KEY,
  gps_name TEXT NOT NULL,
  gps_line TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  color TEXT,
  size TEXT NOT NULL DEFAULT 'Unknown',
  node_type TEXT,
  node_number INTEGER,
  rock_count INTEGER NOT NULL DEFAULT 1,
  materials TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  raw_detail TEXT,
  fingerprint TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'The Edge',
  submitted_by TEXT NOT NULL DEFAULT 'Unknown',
  note_entries TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_asteroid_records_fingerprint ON asteroid_records (fingerprint);
CREATE INDEX IF NOT EXISTS idx_asteroid_records_coords ON asteroid_records (x, y, z);
CREATE INDEX IF NOT EXISTS idx_asteroid_records_sector ON asteroid_records (sector);
CREATE INDEX IF NOT EXISTS idx_asteroid_records_submitted_by ON asteroid_records (submitted_by);

CREATE TABLE IF NOT EXISTS asteroid_users (
  username_key TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
