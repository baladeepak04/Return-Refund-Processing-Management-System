-- FR3: "Pickup request: reverse pickup created via Shiprocket/Delhivery API
-- with customer address" — the address itself was never actually captured
-- anywhere, despite being required by this exact sentence in the spec.
-- Real field, not new scope: FR3 already requires it.
ALTER TABLE pickups
    ADD COLUMN pickup_address VARCHAR(500);
