-- V15: Expand image and evidence URL columns to TEXT to allow full data URLs and high-res evidence
ALTER TABLE qc_inspection_images ALTER COLUMN images TYPE TEXT;
ALTER TABLE return_item_evidence_urls ALTER COLUMN evidence_urls TYPE TEXT;
