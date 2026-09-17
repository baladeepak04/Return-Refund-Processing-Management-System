package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.RestockType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "restocked_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RestockedItem {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "qc_id", nullable = false)
    private QcInspection qcInspection;

    @Column(nullable = false)
    private UUID skuId;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RestockType restockType;

    private BigDecimal newListingPrice;

    @Builder.Default
    private boolean supervisorApprovalRequired = false;

    @Builder.Default
    private boolean approved = true;

    private java.time.LocalDate warrantyExpiresAt;

    @Builder.Default
    private Instant restockedAt = Instant.now();
}
