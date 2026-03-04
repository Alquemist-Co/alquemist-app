-- Migration 19: Convert phytosanitary_agents type/category to ENUMs
-- These were VARCHAR(50) in migration 18; converting for type safety

-- =============================================================
-- Create ENUMs
-- =============================================================
CREATE TYPE agent_type AS ENUM ('pest', 'disease', 'deficiency', 'abiotic');
CREATE TYPE agent_category AS ENUM (
  'insect', 'mite', 'fungus', 'bacteria', 'virus',
  'nematode', 'mollusk', 'nutrient', 'environmental', 'other'
);

-- =============================================================
-- Convert columns
-- =============================================================
ALTER TABLE phytosanitary_agents
  ALTER COLUMN type TYPE agent_type USING type::agent_type;

ALTER TABLE phytosanitary_agents
  ALTER COLUMN category TYPE agent_category USING category::agent_category;
