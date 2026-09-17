package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.ConditionGrade;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.FunctionalTest;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "qc_inspections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QcInspection {
    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "return_id", nullable = false, unique = true)
    private ReturnRequest returnRequest;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inspector_id", nullable = false)
    private User inspector;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConditionGrade conditionGrade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FunctionalTest functionalTest;

    @Column(nullable = false)
    private boolean complaintValidated;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "qc_inspection_images", joinColumns = @JoinColumn(name = "qc_inspection_id"))
    @Column(name = "images", columnDefinition = "TEXT")
    private List<String> images;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Disposition disposition;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    private Instant inspectedAt = Instant.now();
}
