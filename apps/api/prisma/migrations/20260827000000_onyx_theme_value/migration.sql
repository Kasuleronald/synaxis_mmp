-- AlterEnum
-- Split into its own migration (not combined with the default change below)
-- because Postgres won't let a newly-added enum value be used -- including
-- as a column DEFAULT -- within the same transaction that added it.
ALTER TYPE "Theme" ADD VALUE 'ONYX' BEFORE 'GROWTH';
