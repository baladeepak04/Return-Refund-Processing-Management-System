package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.CreateRtmBatchRequest;
import com.returnflow.rrpms.entity.RtmBatch;
import com.returnflow.rrpms.entity.SupplierReturn;
import com.returnflow.rrpms.enums.RtmBatchStatus;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.RtmBatchRepository;
import com.returnflow.rrpms.repository.SupplierReturnRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RtmBatchServiceTest {

    @Mock private RtmBatchRepository rtmBatchRepository;
    @Mock private SupplierReturnRepository supplierReturnRepository;
    @InjectMocks private RtmBatchService rtmBatchService;

    @Test
    void createBatch_sumsRealValuesFromSupplierReturns() {
        UUID supplierId = UUID.randomUUID();
        UUID item1Id = UUID.randomUUID();
        UUID item2Id = UUID.randomUUID();
        List<SupplierReturn> items = List.of(
                SupplierReturn.builder().id(item1Id).value(new BigDecimal("500")).build(),
                SupplierReturn.builder().id(item2Id).value(new BigDecimal("750")).build()
        );
        when(supplierReturnRepository.findAllById(List.of(item1Id, item2Id))).thenReturn(items);
        when(rtmBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateRtmBatchRequest req = new CreateRtmBatchRequest(supplierId, "Acme Supplies", List.of(item1Id, item2Id));
        RtmBatch result = rtmBatchService.createBatch(req);

        assertThat(result.getCreditNoteValue()).isEqualTo(new BigDecimal("1250"));
        assertThat(result.getStatus()).isEqualTo(RtmBatchStatus.ACCUMULATED);
        verify(supplierReturnRepository).saveAll(items);
        items.forEach(i -> assertThat(i.getStatus()).isEqualTo(RtmBatchStatus.ACCUMULATED));
    }

    @Test
    void createBatch_handlesNullValues_withoutError() {
        UUID supplierId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        List<SupplierReturn> items = List.of(SupplierReturn.builder().id(itemId).value(null).build());
        when(supplierReturnRepository.findAllById(List.of(itemId))).thenReturn(items);
        when(rtmBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateRtmBatchRequest req = new CreateRtmBatchRequest(supplierId, "Acme Supplies", List.of(itemId));
        RtmBatch result = rtmBatchService.createBatch(req);

        assertThat(result.getCreditNoteValue()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void dispatch_setsStatusDispatched() {
        UUID id = UUID.randomUUID();
        RtmBatch batch = RtmBatch.builder().id(id).status(RtmBatchStatus.ACCUMULATED).build();
        when(rtmBatchRepository.findById(id)).thenReturn(java.util.Optional.of(batch));
        when(rtmBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RtmBatch result = rtmBatchService.dispatch(id);

        assertThat(result.getStatus()).isEqualTo(RtmBatchStatus.DISPATCHED);
    }

    @Test
    void markDisputed_setsDisputedTrue_withNotes() {
        UUID id = UUID.randomUUID();
        RtmBatch batch = RtmBatch.builder().id(id).build();
        when(rtmBatchRepository.findById(id)).thenReturn(java.util.Optional.of(batch));
        when(rtmBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RtmBatch result = rtmBatchService.markDisputed(id, "Wrong item count claimed");

        assertThat(result.isDisputed()).isTrue();
        assertThat(result.getDisputeNotes()).isEqualTo("Wrong item count claimed");
    }

    @Test
    void resolveDispute_setsDisputedFalse() {
        UUID id = UUID.randomUUID();
        RtmBatch batch = RtmBatch.builder().id(id).disputed(true).build();
        when(rtmBatchRepository.findById(id)).thenReturn(java.util.Optional.of(batch));
        when(rtmBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RtmBatch result = rtmBatchService.resolveDispute(id);

        assertThat(result.isDisputed()).isFalse();
    }

    @Test
    void get_throwsNotFound_whenMissing() {
        UUID id = UUID.randomUUID();
        when(rtmBatchRepository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> rtmBatchService.get(id)).isInstanceOf(NotFoundException.class);
    }
}
