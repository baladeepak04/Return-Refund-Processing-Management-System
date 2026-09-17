package com.returnflow.rrpms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "customer_return_stats")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerReturnStats {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID customerId;

    @Builder.Default
    private Integer totalOrders = 0;

    @Builder.Default
    private Integer totalReturns = 0;

    @Builder.Default
    private BigDecimal returnRate = BigDecimal.ZERO;

    @Builder.Default
    private Integer mindChangeReturns = 0;

    @Builder.Default
    private boolean isFlagged = false;
}
