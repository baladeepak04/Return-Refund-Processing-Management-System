-- FR11: "Communication preference: customer selects preferred channel
-- (WhatsApp/SMS/email)." Was hardcoded to SMS everywhere.
ALTER TABLE users
    ADD COLUMN preferred_channel VARCHAR(20) NOT NULL DEFAULT 'SMS';
