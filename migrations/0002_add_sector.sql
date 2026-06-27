ALTER TABLE asteroid_records ADD COLUMN sector TEXT NOT NULL DEFAULT 'The Edge';

UPDATE asteroid_records
SET sector = CASE
  WHEN ((x - 10000000) * (x - 10000000)) + ((y - 17320000) * (y - 17320000)) + ((z - 7000000) * (z - 7000000)) <= 250000000000 THEN 'Kom Planet'
  WHEN ((x + 10000000) * (x + 10000000)) + ((y - 17320000) * (y - 17320000)) + ((z + 3000000) * (z + 3000000)) <= 62500000000 THEN 'Tellus Planet'
  WHEN (x * x) + (y * y) + (z * z) <= 640000000000 THEN 'Korrath'
  WHEN ((x + 14150000) * (x + 14150000)) + ((y + 14150000) * (y + 14150000)) + ((z + 14150000) * (z + 14150000)) <= 62500000000 THEN 'Trelan Planet'
  WHEN ((x - 14150000) * (x - 14150000)) + ((y + 14150000) * (y + 14150000)) + ((z + 14150000) * (z + 14150000)) <= 40000000000 THEN 'KoTH Sector'
  WHEN ((x - 10000000) * (x - 10000000)) + ((y - 17320000) * (y - 17320000)) + ((z - 7000000) * (z - 7000000)) <= 100000000000000 THEN 'Kom Space'
  WHEN ((x + 10000000) * (x + 10000000)) + ((y - 17320000) * (y - 17320000)) + ((z + 3000000) * (z + 3000000)) <= 100000000000000 THEN 'Tellus Space'
  WHEN (x * x) + (y * y) + (z * z) <= 100000000000000 THEN 'Roach Motel'
  ELSE 'The Edge'
END;

CREATE INDEX IF NOT EXISTS idx_asteroid_records_sector ON asteroid_records (sector);
