package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.FraudFlagStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fraud_flags")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudFlag {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID customerId;

    @Column(nullable = false, length = 100)
    private String flagType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "return_id")
    private ReturnRequest returnRequest;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FraudFlagStatus status = FraudFlagStatus.OPEN;

    private Integer riskScore;
    private Integer returnCount;
    private java.math.BigDecimal returnRatePercent;

    @Builder.Default
    private Instant flaggedAt = Instant.now();

    @Transient
    private String customerName;

    @Transient
    private String customerEmail;

    @Transient
    private String productName;

    @Transient
    private String caseSummary;
}
