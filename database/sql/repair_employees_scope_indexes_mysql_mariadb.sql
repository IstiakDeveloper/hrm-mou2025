-- ---------------------------------------------------------------------------
-- Repair `employees` identifier indexes for MariaDB / older MySQL (phpMyAdmin).
-- Replaces MySQL-8 "functional unique index" syntax that breaks import (#1064).
--
-- When to use:
--   A) Import to MariaDB fails on CREATE TABLE `employees` → run this on the
--      SOURCE MySQL database first, export again, then import to MariaDB.
--   B) Import already succeeded on MySQL → deploy Laravel code and run only:
--        php artisan migrate --force
--      (preferred; migrations apply the same fix idempotently.)
--
-- Do NOT use migrate:fresh on production — it wipes all tables.
-- ---------------------------------------------------------------------------

ALTER TABLE `employees` DROP INDEX IF EXISTS `employees_pin_employed_unique`;
ALTER TABLE `employees` DROP INDEX IF EXISTS `employees_nid_employed_unique`;
ALTER TABLE `employees` DROP INDEX IF EXISTS `employees_employee_id_employed_unique`;

ALTER TABLE `employees` DROP COLUMN IF EXISTS `uq_scope_pin`;
ALTER TABLE `employees` DROP COLUMN IF EXISTS `uq_scope_nid`;
ALTER TABLE `employees` DROP COLUMN IF EXISTS `uq_scope_employee_id`;

ALTER TABLE `employees` ADD COLUMN `uq_scope_pin` VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN `status` IN ('active', 'on_leave') AND `pin` IS NOT NULL AND `pin` <> '' THEN `pin` END) VIRTUAL NULL;

ALTER TABLE `employees` ADD COLUMN `uq_scope_nid` VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN `status` IN ('active', 'on_leave') AND `nid` IS NOT NULL AND `nid` <> '' THEN `nid` END) VIRTUAL NULL;

ALTER TABLE `employees` ADD COLUMN `uq_scope_employee_id` VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN `status` IN ('active', 'on_leave') AND `employee_id` IS NOT NULL AND `employee_id` <> '' THEN `employee_id` END) VIRTUAL NULL;

CREATE UNIQUE INDEX `employees_pin_employed_unique` ON `employees` (`uq_scope_pin`);
CREATE UNIQUE INDEX `employees_nid_employed_unique` ON `employees` (`uq_scope_nid`);
CREATE UNIQUE INDEX `employees_employee_id_employed_unique` ON `employees` (`uq_scope_employee_id`);
