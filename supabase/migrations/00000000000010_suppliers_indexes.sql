-- PRD 18 — Suppliers: unique constraint + search indexes
-- Prevents duplicate supplier names per company
-- Adds functional indexes for JSONB search performance

-- Unique constraint: no duplicate supplier names per company
CREATE UNIQUE INDEX idx_suppliers_company_name ON suppliers (company_id, LOWER(name));

-- Functional btree indexes for ilike search on JSONB fields (RF-02, RNF-05)
CREATE INDEX idx_suppliers_contact_name ON suppliers ((contact_info->>'contact_name'));
CREATE INDEX idx_suppliers_contact_email ON suppliers ((contact_info->>'email'));
