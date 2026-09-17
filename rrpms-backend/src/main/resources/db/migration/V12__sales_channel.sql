-- FR12: "Custom reports: date range, category, seller, and channel
-- filters." Real field, defaulting to WEB for any pre-existing rows.
ALTER TABLE return_requests
    ADD COLUMN sales_channel VARCHAR(20) NOT NULL DEFAULT 'WEB';
