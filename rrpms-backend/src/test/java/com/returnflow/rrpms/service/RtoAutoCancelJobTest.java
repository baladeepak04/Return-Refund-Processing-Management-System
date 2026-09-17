package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.Pickup;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.repository.PickupRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RtoAutoCancelJobTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;

    @Mock
    private PickupRepository pickupRepository;

    @InjectMocks
    private RtoAutoCancelJob rtoAutoCancelJob;

    @Test
    void cancelStaleReturns_cancelsUncollectedReturnsOlderThan3Days() {
        UUID staleReturnId = UUID.randomUUID();
        ReturnRequest staleReturn = ReturnRequest.builder()
                .id(staleReturnId)
                .status(ReturnStatus.INITIATED)
                .initiatedAt(Instant.now().minus(4, ChronoUnit.DAYS))
                .build();

        UUID recentReturnId = UUID.randomUUID();
        ReturnRequest recentReturn = ReturnRequest.builder()
                .id(recentReturnId)
                .status(ReturnStatus.INITIATED)
                .initiatedAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();

        UUID pickedUpReturnId = UUID.randomUUID();
        ReturnRequest returnWithPickup = ReturnRequest.builder()
                .id(pickedUpReturnId)
                .status(ReturnStatus.INITIATED)
                .initiatedAt(Instant.now().minus(5, ChronoUnit.DAYS))
                .build();

        ReturnRequest nullDateReturn = ReturnRequest.builder()
                .id(UUID.randomUUID())
                .status(ReturnStatus.INITIATED)
                .initiatedAt(null)
                .build();

        when(returnRequestRepository.findByStatus(ReturnStatus.INITIATED))
                .thenReturn(List.of(staleReturn, recentReturn, returnWithPickup, nullDateReturn));

        when(pickupRepository.findByReturnRequestId(staleReturnId)).thenReturn(Optional.empty());
        when(pickupRepository.findByReturnRequestId(pickedUpReturnId)).thenReturn(Optional.of(new Pickup()));

        rtoAutoCancelJob.cancelStaleReturns();

        assertThat(staleReturn.getStatus()).isEqualTo(ReturnStatus.CANCELLED);
        verify(returnRequestRepository, times(1)).save(staleReturn);
        verify(returnRequestRepository, never()).save(recentReturn);
        verify(returnRequestRepository, never()).save(returnWithPickup);
        verify(returnRequestRepository, never()).save(nullDateReturn);
    }
}
