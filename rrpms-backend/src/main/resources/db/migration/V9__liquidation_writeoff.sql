-- FR8: "Write-off: unrecoverable items written off; accounted in finance
-- as reverse logistics cost." No write-off state existed at all.
ALTER TABLE liquidation_batches
    ADD COLUMN written_off BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN write_off_amount DECIMAL(10,2);
