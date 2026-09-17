package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.repository.PickupRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class RtoAutoCancelJob {

    private static final int NO_PICKUP_CANCEL_DAYS = 3;

    private final ReturnRequestRepository returnRequestRepository;
    private final PickupRepository pickupRepository;

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void cancelStaleReturns() {
        Instant cutoff = Instant.now().minus(NO_PICKUP_CANCEL_DAYS, ChronoUnit.DAYS);
        for (ReturnRequest r : returnRequestRepository.findByStatus(ReturnStatus.INITIATED)) {
            if (r.getInitiatedAt() == null || r.getInitiatedAt().isAfter(cutoff)) continue;
            if (pickupRepository.findByReturnRequestId(r.getId()).isPresent()) continue;
            r.setStatus(ReturnStatus.CANCELLED);
            returnRequestRepository.save(r);
        }
    }
}
