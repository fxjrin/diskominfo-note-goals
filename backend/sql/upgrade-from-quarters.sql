-- Converts the earlier quarter-based layout (goal_quarters + tasks.month) into
-- named periods with date ranges and tasks with due dates. Safe to run once.
INSERT INTO goal_periods (goal_id, name, start_date, end_date, weight, position)
SELECT gq.goal_id,
       CONCAT('Q', gq.quarter),
       MAKEDATE(g.year, 1) + INTERVAL (gq.quarter - 1) * 3 MONTH,
       MAKEDATE(g.year, 1) + INTERVAL gq.quarter * 3 MONTH - INTERVAL 1 DAY,
       gq.weight,
       gq.quarter
FROM goal_quarters gq
JOIN goals g ON g.id = gq.goal_id;

ALTER TABLE tasks
  ADD COLUMN period_id INT UNSIGNED NULL AFTER goal_id,
  ADD COLUMN due_date DATE NULL AFTER title;

UPDATE tasks t
JOIN goals g ON g.id = t.goal_id
JOIN goal_periods p ON p.goal_id = t.goal_id AND p.position = CEIL(t.month / 3)
SET t.period_id = p.id,
    t.due_date = MAKEDATE(g.year, 1) + INTERVAL (t.month - 1) MONTH;

ALTER TABLE tasks
  MODIFY COLUMN period_id INT UNSIGNED NOT NULL,
  MODIFY COLUMN due_date DATE NOT NULL,
  DROP INDEX idx_tasks_goal_month,
  DROP CHECK chk_tasks_month,
  DROP COLUMN month,
  ADD KEY idx_tasks_goal_due (goal_id, due_date),
  ADD KEY idx_tasks_period (period_id),
  ADD CONSTRAINT fk_tasks_period FOREIGN KEY (period_id) REFERENCES goal_periods (id) ON DELETE CASCADE;

DROP TABLE goal_quarters;
