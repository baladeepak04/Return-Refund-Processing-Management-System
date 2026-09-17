-- SRS-29 Return & Refund Processing Management System — initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    department VARCHAR(100),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE return_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_ref VARCHAR(255),
    return_window_days INTEGER NOT NULL,
    free_return BOOLEAN NOT NULL DEFAULT FALSE,
    exchange_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE return_policy_non_returnable_skus (
    return_policy_id UUID NOT NULL REFERENCES return_policies(id) ON DELETE CASCADE,
    non_returnable_skus UUID
);

CREATE TABLE return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    return_type VARCHAR(20) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    preferred_refund_method VARCHAR(20) NOT NULL,
    policy_id UUID REFERENCES return_policies(id),
    initiated_at TIMESTAMP NOT NULL DEFAULT now(),
    support_override BOOLEAN NOT NULL DEFAULT FALSE,
    support_override_reason TEXT
);

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_line_id UUID,
    sku_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    return_reason VARCHAR(100),
    exchange_sku_id UUID
);

CREATE TABLE return_item_evidence_urls (
    return_item_id UUID NOT NULL REFERENCES return_items(id) ON DELETE CASCADE,
    evidence_urls VARCHAR(500)
);

CREATE TABLE pickups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    logistics_partner VARCHAR(20) NOT NULL,
    awb_number VARCHAR(100),
    pickup_date DATE NOT NULL,
    pickup_slot VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    pickup_otp VARCHAR(6),
    reschedule_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE qc_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL UNIQUE REFERENCES return_requests(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id),
    condition_grade VARCHAR(20) NOT NULL,
    functional_test VARCHAR(10) NOT NULL,
    complaint_validated BOOLEAN NOT NULL,
    disposition VARCHAR(20) NOT NULL,
    notes TEXT,
    inspected_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE qc_inspection_images (
    qc_inspection_id UUID NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
    images VARCHAR(500)
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL UNIQUE REFERENCES return_requests(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL,
    razorpay_refund_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    approved BOOLEAN,
    initiated_at TIMESTAMP NOT NULL DEFAULT now(),
    credited_at TIMESTAMP,
    failure_reason VARCHAR(200)
);

CREATE TABLE fraud_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    flag_type VARCHAR(100) NOT NULL,
    return_id UUID REFERENCES return_requests(id),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    risk_score INTEGER,
    return_count INTEGER,
    return_rate_percent DECIMAL(5,2),
    flagged_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE rtm_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    items_json TEXT,
    awb_number VARCHAR(100),
    credit_note_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACCUMULATED',
    dispatch_date DATE
);

CREATE TABLE supplier_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    qc_id UUID REFERENCES qc_inspections(id),
    product VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    value DECIMAL(10,2),
    condition_grade VARCHAR(20),
    disposition VARCHAR(20),
    rtm_batch_id UUID REFERENCES rtm_batches(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ACCUMULATED'
);

CREATE TABLE liquidation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name VARCHAR(100) NOT NULL,
    items_json TEXT,
    batch_date DATE NOT NULL,
    payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PREPARED'
);

CREATE TABLE restocked_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qc_id UUID NOT NULL REFERENCES qc_inspections(id),
    sku_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    restock_type VARCHAR(20) NOT NULL,
    new_listing_price DECIMAL(8,2),
    restocked_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE customer_return_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_returns INTEGER NOT NULL DEFAULT 0,
    return_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    mind_change_returns INTEGER NOT NULL DEFAULT 0,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE return_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT now(),
    status VARCHAR(20) NOT NULL DEFAULT 'SENT'
);

CREATE INDEX idx_return_requests_customer ON return_requests(customer_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX idx_rtm_batches_status ON rtm_batches(status);
