CREATE TABLE IF NOT EXISTS trading_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  open_date VARCHAR(50) NOT NULL,
  close_date VARCHAR(50) DEFAULT NULL,
  open_price DECIMAL(18, 8) NOT NULL,
  close_price DECIMAL(18, 8) DEFAULT NULL,
  notes TEXT,
  source VARCHAR(255) DEFAULT NULL,
  order_type ENUM('scaping', 'swing') DEFAULT NULL,
  type ENUM('long', 'short') NOT NULL,
  level INT NOT NULL,
  volume DOUBLE NOT NULL,
  stratery_id BIGINT UNSIGNED DEFAULT NULL,
  reference_images JSON,
  PRIMARY KEY (id)
);
