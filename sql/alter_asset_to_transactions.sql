-- Migrate legacy `asset` rows to transaction-style schema.
-- Run once on MySQL 8+.

START TRANSACTION;

ALTER TABLE asset
  ADD COLUMN quantity DECIMAL(24, 8) NULL AFTER name,
  ADD COLUMN price_per_coin DECIMAL(24, 8) NULL AFTER quantity,
  ADD COLUMN transaction_type ENUM('buy', 'sell') NULL AFTER price_per_coin,
  ADD COLUMN transaction_date DATE NULL AFTER transaction_type;

UPDATE asset
SET
  quantity = amount,
  price_per_coin = CASE
    WHEN status = 'sold' AND sell_price IS NOT NULL THEN sell_price
    ELSE buy_price
  END,
  transaction_type = CASE
    WHEN status = 'sold' THEN 'sell'
    ELSE 'buy'
  END,
  transaction_date = CASE
    WHEN status = 'sold' THEN DATE(COALESCE(NULLIF(sell_date, ''), NULLIF(buy_date, '')))
    ELSE DATE(NULLIF(buy_date, ''))
  END;

ALTER TABLE asset
  MODIFY COLUMN quantity DECIMAL(24, 8) NOT NULL,
  MODIFY COLUMN price_per_coin DECIMAL(24, 8) NOT NULL,
  MODIFY COLUMN transaction_type ENUM('buy', 'sell') NOT NULL,
  MODIFY COLUMN transaction_date DATE NOT NULL;

ALTER TABLE asset
  DROP COLUMN amount,
  DROP COLUMN buy_price,
  DROP COLUMN sell_price,
  DROP COLUMN buy_date,
  DROP COLUMN sell_date,
  DROP COLUMN status;

CREATE INDEX idx_asset_name ON asset (name);
CREATE INDEX idx_asset_date ON asset (transaction_date);

COMMIT;
