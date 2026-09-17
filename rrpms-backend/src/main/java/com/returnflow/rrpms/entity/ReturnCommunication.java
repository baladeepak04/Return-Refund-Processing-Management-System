package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.enums.CommStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "return_communications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReturnCommunication {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "return_id", nullable = false)
    private ReturnRequest returnRequest;

    @Column(nullable = false, length = 50)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommChannel channel;

    @Builder.Default
    private Instant sentAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CommStatus status = CommStatus.SENT;
}
