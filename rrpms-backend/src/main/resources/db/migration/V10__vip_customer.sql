-- FR6: "Express exchange: VIP customers eligible for 'exchange first,
-- return after'." No customer-tier concept existed at all.
ALTER TABLE users
    ADD COLUMN is_vip BOOLEAN NOT NULL DEFAULT FALSE;
