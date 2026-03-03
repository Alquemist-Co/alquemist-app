-- =============================================================
-- Migration 16: Batches FK + audit fixes (PRD 24 review)
-- =============================================================

-- Fix 6: Add FK on batches.schedule_id → cultivation_schedules(id)
ALTER TABLE batches
  ADD CONSTRAINT fk_batches_schedule_id
  FOREIGN KEY (schedule_id) REFERENCES cultivation_schedules(id);

-- Fix 7: Add created_at audit column to batch_lineage
ALTER TABLE batch_lineage
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
