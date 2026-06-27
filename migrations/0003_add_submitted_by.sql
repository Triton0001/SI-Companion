ALTER TABLE asteroid_records ADD COLUMN submitted_by TEXT NOT NULL DEFAULT 'Unknown';

CREATE INDEX IF NOT EXISTS idx_asteroid_records_submitted_by ON asteroid_records (submitted_by);
