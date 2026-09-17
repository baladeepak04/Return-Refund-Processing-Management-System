-- FR12: "NPS/customer satisfaction score" — real customer feedback capture,
-- tied to the completed return itself since no separate survey/feedback
-- table exists anywhere in Appendix B's 12-table schema.
ALTER TABLE return_requests
    ADD COLUMN satisfaction_rating INTEGER,
    ADD COLUMN satisfaction_comment VARCHAR(1000),
    ADD COLUMN satisfaction_submitted_at TIMESTAMP;
