-- FR7: "GRN: goods receipt note created for all received and QC-passed
-- items" and "Warranty reset: refurbished items carry platform warranty
-- (90 days)." No grn/warranty table is defined anywhere in SRS-29
-- Appendix B, so these are real fields on the existing tables they
-- naturally belong to rather than a fabricated new table.
ALTER TABLE pickups
    ADD COLUMN grn_number VARCHAR(50);

ALTER TABLE restocked_items
    ADD COLUMN warranty_expires_at DATE;
