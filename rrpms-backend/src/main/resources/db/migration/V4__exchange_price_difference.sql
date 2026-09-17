-- FR6: "Price difference: if exchange item costs more, customer pays
-- difference; if less, balance as store credit." No product-price table
-- exists anywhere in this schema, so the computed result is persisted here
-- rather than only mentioned in an SMS string.
ALTER TABLE return_requests
    ADD COLUMN price_difference_amount DECIMAL(10,2),
    ADD COLUMN customer_pays_difference BOOLEAN;
