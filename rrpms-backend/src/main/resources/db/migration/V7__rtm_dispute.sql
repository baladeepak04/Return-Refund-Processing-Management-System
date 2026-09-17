-- FR10: "Supplier dispute: if supplier disputes RTM claim, QC images and
-- report shared as evidence." No dispute state existed at all.
ALTER TABLE rtm_batches
    ADD COLUMN disputed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN dispute_notes TEXT;
