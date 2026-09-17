package com.returnflow.rrpms.service;

import com.returnflow.rrpms.enums.LiquidationStatus;
import com.returnflow.rrpms.repository.LiquidationBatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LiquidationWeeklyDispatchJob {

    private final LiquidationBatchRepository repository;

    @Scheduled(fixedRate = 7L * 24 * 60 * 60 * 1000)
    public void dispatchAccumulatedBatches() {
        for (var batch : repository.findByStatus(LiquidationStatus.PREPARED)) {
            batch.setStatus(LiquidationStatus.DISPATCHED);
            repository.save(batch);
        }
    }
}
