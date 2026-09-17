-- FR2: "Draft save: customer can save draft return request and complete
-- within 24 hours." No draft mechanism existed at all.
ALTER TABLE return_requests
    ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN draft_expires_at TIMESTAMP;
