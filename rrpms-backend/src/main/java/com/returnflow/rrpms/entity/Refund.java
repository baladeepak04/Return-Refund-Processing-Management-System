package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.RefundMethod;
import com.returnflow.rrpms.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refunds")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Refund {
    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "return_id", nullable = false, unique = true)
    private ReturnRequest returnRequest;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RefundMethod method;

    private String razorpayRefundId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING;

    @Builder.Default
    private boolean approvalRequired = false;

    private Boolean approved;

    @Builder.Default
    private Instant initiatedAt = Instant.now();

    private Instant creditedAt;

    private String failureReason;
}
