CREATE DATABASE IF NOT EXISTS fajrin_firmana
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fajrin_firmana;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS goals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  progress DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user_year (user_id, year),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_goals_progress CHECK (progress BETWEEN 0 AND 100)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS goal_periods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_id INT UNSIGNED NOT NULL,
  name VARCHAR(60) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  weight DECIMAL(5, 2) NOT NULL,
  position TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_goal_periods_goal (goal_id, position),
  CONSTRAINT fk_goal_periods_goal FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
  CONSTRAINT chk_goal_periods_range CHECK (start_date <= end_date),
  CONSTRAINT chk_goal_periods_weight CHECK (weight BETWEEN 0 AND 100)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_id INT UNSIGNED NOT NULL,
  period_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('pending', 'done') NOT NULL DEFAULT 'pending',
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_goal_due (goal_id, due_date),
  KEY idx_tasks_period (period_id),
  CONSTRAINT fk_tasks_goal FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_period FOREIGN KEY (period_id) REFERENCES goal_periods (id) ON DELETE CASCADE
) ENGINE = InnoDB;
