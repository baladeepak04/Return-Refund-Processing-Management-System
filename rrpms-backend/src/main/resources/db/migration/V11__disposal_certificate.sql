-- FR8: "Certified disposal: for regulated items (batteries, electronics),
-- certified disposal certificate." A real reference number generated on
-- disposal, not a fabricated PDF document — same GRN-style pattern already
-- used for warehouse receipt.
ALTER TABLE liquidation_batches
    ADD COLUMN certificate_number VARCHAR(50);
