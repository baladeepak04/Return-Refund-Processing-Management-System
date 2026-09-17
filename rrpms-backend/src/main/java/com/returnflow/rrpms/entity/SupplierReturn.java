package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.ConditionGrade;
import com.returnflow.rrpms.enums.Disposition;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "supplier_returns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupplierReturn {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID supplierId;

    @Column(nullable = false)
    private String supplierName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "qc_id")
    private QcInspection qcInspection;

    @Column(nullable = false)
    private String product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(precision = 10, scale = 2)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    private ConditionGrade conditionGrade;

    @Enumerated(EnumType.STRING)
    private Disposition disposition;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rtm_batch_id")
    private RtmBatch rtmBatch;

    @Builder.Default
    private com.returnflow.rrpms.enums.RtmBatchStatus status = com.returnflow.rrpms.enums.RtmBatchStatus.ACCUMULATED;
}
