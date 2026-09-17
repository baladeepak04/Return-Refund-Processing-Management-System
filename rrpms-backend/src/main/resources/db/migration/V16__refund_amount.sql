-- Persist computed or requested refund valuation directly on return_requests
-- and product_name on return_items so portals show actual valuations and product titles
ALTER TABLE return_requests
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);

ALTER TABLE return_items
    ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
