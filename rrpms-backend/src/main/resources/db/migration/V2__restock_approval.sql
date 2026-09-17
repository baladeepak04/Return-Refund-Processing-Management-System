-- FR7: "Restock approval: high-value items (> 5,000) require QC supervisor
-- approval" — restocked_items had no way to represent this gate at all.
ALTER TABLE restocked_items
    ADD COLUMN supervisor_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN approved BOOLEAN NOT NULL DEFAULT TRUE;
