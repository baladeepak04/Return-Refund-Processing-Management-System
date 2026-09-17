-- Appendix C/F.1: COD bank details (IFSC + account number), collected at
-- return initiation per §2.7 assumptions. Encrypted at rest (Appendix D) via
-- EncryptedStringConverter, so these are VARCHAR-sized for ciphertext, not
-- plaintext IFSC/account-number lengths.
ALTER TABLE return_requests
    ADD COLUMN bank_account_number VARCHAR(255),
    ADD COLUMN bank_ifsc VARCHAR(255);
