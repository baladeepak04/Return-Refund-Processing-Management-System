package com.returnflow.rrpms.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.returnflow.rrpms.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "return_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReturnRequest {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID orderId;

    @Column(nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnType returnType;

    @Column(nullable = false, length = 50)
    private String reasonCode;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.INITIATED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PreferredRefundMethod preferredRefundMethod;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "policy_id")
    private ReturnPolicy policy;

    @Builder.Default
    private Instant initiatedAt = Instant.now();

    @Builder.Default
    private boolean supportOverride = false;

    private String supportOverrideReason;

    @Convert(converter = com.returnflow.rrpms.security.EncryptedStringConverter.class)
    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    @Convert(converter = com.returnflow.rrpms.security.EncryptedStringConverter.class)
    @Column(name = "bank_ifsc")
    private String bankIfsc;

    @Column(precision = 10, scale = 2)
    private java.math.BigDecimal priceDifferenceAmount;

    private Boolean customerPaysDifference;

    @Column(precision = 10, scale = 2)
    private java.math.BigDecimal refundAmount;

    @Builder.Default
    private boolean isDraft = false;

    private Instant draftExpiresAt;

    @OneToMany(mappedBy = "returnRequest", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<ReturnItem> items;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private com.returnflow.rrpms.enums.SalesChannel salesChannel = com.returnflow.rrpms.enums.SalesChannel.WEB;

    private Integer satisfactionRating;

    @Column(length = 1000)
    private String satisfactionComment;

    private Instant satisfactionSubmittedAt;
 
    @Transient
    private String customerName;

    @Transient
    private String customerEmail;
}
