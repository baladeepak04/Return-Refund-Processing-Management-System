package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.RtmBatchStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "rtm_batches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RtmBatch {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID supplierId;

    @Column(nullable = false)
    private String supplierName;

    @Column(columnDefinition = "TEXT")
    private String itemsJson;

    private String awbNumber;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal creditNoteValue = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RtmBatchStatus status = RtmBatchStatus.ACCUMULATED;

    private java.time.LocalDate dispatchDate;

    @Builder.Default
    private boolean disputed = false;

    @Column(columnDefinition = "TEXT")
    private String disputeNotes;
}
