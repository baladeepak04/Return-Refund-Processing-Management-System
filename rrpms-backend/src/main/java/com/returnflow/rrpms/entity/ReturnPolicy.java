package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.PolicyEntityType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "return_policies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReturnPolicy {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PolicyEntityType entityType;

    private String entityRef; // category name or seller id

    @Column(nullable = false)
    private Integer returnWindowDays;

    @Builder.Default
    private boolean freeReturn = false;

    @Builder.Default
    private boolean exchangeEligible = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "return_policy_non_returnable_skus", joinColumns = @JoinColumn(name = "return_policy_id"))
    @Column(name = "non_returnable_skus")
    private List<UUID> nonReturnableSkus;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    @Builder.Default
    private boolean active = true;
}
