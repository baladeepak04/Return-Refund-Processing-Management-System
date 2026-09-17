package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.enums.LiquidationStatus;
import com.returnflow.rrpms.repository.LiquidationBatchRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LiquidationWeeklyDispatchJobTest {

    @Mock private LiquidationBatchRepository repository;
    @InjectMocks private LiquidationWeeklyDispatchJob job;

    @Test
    void dispatchAccumulatedBatches_movesAllPreparedBatchesToDispatched() {
        LiquidationBatch batch1 = LiquidationBatch.builder().status(LiquidationStatus.PREPARED).build();
        LiquidationBatch batch2 = LiquidationBatch.builder().status(LiquidationStatus.PREPARED).build();
        when(repository.findByStatus(LiquidationStatus.PREPARED)).thenReturn(List.of(batch1, batch2));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        job.dispatchAccumulatedBatches();

        assertThat(batch1.getStatus()).isEqualTo(LiquidationStatus.DISPATCHED);
        assertThat(batch2.getStatus()).isEqualTo(LiquidationStatus.DISPATCHED);
        verify(repository, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    void dispatchAccumulatedBatches_doesNothing_whenNoneArePrepared() {
        when(repository.findByStatus(LiquidationStatus.PREPARED)).thenReturn(List.of());

        job.dispatchAccumulatedBatches();

        verify(repository, org.mockito.Mockito.never()).save(any());
    }
}
