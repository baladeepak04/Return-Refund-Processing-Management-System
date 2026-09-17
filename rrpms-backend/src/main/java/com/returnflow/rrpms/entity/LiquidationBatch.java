package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.LiquidationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "liquidation_batches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LiquidationBatch {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String partnerName;

    @Column(columnDefinition = "TEXT")
    private String itemsJson;

    @Column(nullable = false)
    private LocalDate batchDate;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal payoutAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LiquidationStatus status = LiquidationStatus.PREPARED;

    @Builder.Default
    private boolean writtenOff = false;

    private BigDecimal writeOffAmount;

    private String certificateNumber;
}
