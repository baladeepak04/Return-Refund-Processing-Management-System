package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.LogisticsPartner;
import com.returnflow.rrpms.enums.PickupStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "pickups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Pickup {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "return_id", nullable = false)
    private ReturnRequest returnRequest;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LogisticsPartner logisticsPartner;

    private String awbNumber;

    @Column(nullable = false)
    private LocalDate pickupDate;

    @Column(length = 50)
    private String pickupSlot;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PickupStatus status = PickupStatus.SCHEDULED;

    @Column(length = 6)
    private String pickupOtp;

    private String grnNumber;

    @Builder.Default
    private Integer rescheduleCount = 0;

    @Column(length = 500)
    private String pickupAddress;
}
