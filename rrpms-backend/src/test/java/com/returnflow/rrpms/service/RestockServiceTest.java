package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.ReturnItem;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.RestockedItem;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.RestockType;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.integration.InventoryService;
import com.returnflow.rrpms.repository.RestockedItemRepository;
import com.returnflow.rrpms.repository.ReturnItemRepository;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RestockServiceTest {

    @Mock private RestockedItemRepository repository;
    @Mock private ReturnItemRepository returnItemRepository;
    @Mock private InventoryService inventoryService;

    @InjectMocks private RestockService restockService;

    private static BigDecimal mockValueOf(UUID skuId) {
        return new BigDecimal(1000 + (Math.abs(skuId.hashCode()) % 9000));
    }

    @Test
    void restockFromInspection_isNoOp_forNonRestockDisposition() {
        QcInspection qc = QcInspection.builder().disposition(Disposition.DISPOSE).build();

        restockService.restockFromInspection(qc);

        verify(returnItemRepository, never()).findByReturnRequestId(any());
        verify(repository, never()).save(any());
    }

    @Test
    void restockFromInspection_usesRealSkuAndQuantity_fromReturnItems() {
        UUID returnId = UUID.randomUUID();
        UUID skuId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).returnRequest(returnRequest).build();
        ReturnItem item = ReturnItem.builder().skuId(skuId).quantity(3).build();
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(List.of(item));

        restockService.restockFromInspection(qc);

        ArgumentCaptor<RestockedItem> captor = ArgumentCaptor.forClass(RestockedItem.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getSkuId()).isEqualTo(skuId);
        assertThat(captor.getValue().getQuantity()).isEqualTo(3);
        assertThat(captor.getValue().getRestockType()).isEqualTo(RestockType.NEW);
    }

    @Test
    void restockFromInspection_savesOneRowPerReturnItem() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).returnRequest(returnRequest).build();
        List<ReturnItem> items = List.of(
                ReturnItem.builder().skuId(UUID.randomUUID()).quantity(1).build(),
                ReturnItem.builder().skuId(UUID.randomUUID()).quantity(2).build()
        );
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(items);

        restockService.restockFromInspection(qc);

        verify(repository, times(2)).save(any());
    }

    @Test
    void restockFromInspection_setsWarrantyAndRefurbPrice_onlyForRefurbished() {
        UUID returnId = UUID.randomUUID();
        UUID skuId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_REFURB).returnRequest(returnRequest).build();
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(List.of(ReturnItem.builder().skuId(skuId).quantity(1).build()));

        restockService.restockFromInspection(qc);

        ArgumentCaptor<RestockedItem> captor = ArgumentCaptor.forClass(RestockedItem.class);
        verify(repository).save(captor.capture());
        RestockedItem saved = captor.getValue();
        assertThat(saved.getRestockType()).isEqualTo(RestockType.REFURBISHED);
        assertThat(saved.getWarrantyExpiresAt()).isEqualTo(java.time.LocalDate.now().plusDays(90));
        assertThat(saved.getNewListingPrice()).isNotNull();
    }

    @Test
    void restockFromInspection_leavesWarrantyAndPriceNull_forNewStock() {
        UUID returnId = UUID.randomUUID();
        UUID skuId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).returnRequest(returnRequest).build();
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(List.of(ReturnItem.builder().skuId(skuId).quantity(1).build()));

        restockService.restockFromInspection(qc);

        ArgumentCaptor<RestockedItem> captor = ArgumentCaptor.forClass(RestockedItem.class);
        verify(repository).save(captor.capture());
        RestockedItem saved = captor.getValue();
        assertThat(saved.getWarrantyExpiresAt()).isNull();
        assertThat(saved.getNewListingPrice()).isNull();
    }

    @Test
    void restockFromInspection_approvalFlagMatchesFiveThousandThreshold() {
        UUID returnId = UUID.randomUUID();
        UUID skuId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).returnRequest(returnRequest).build();
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(List.of(ReturnItem.builder().skuId(skuId).quantity(1).build()));

        restockService.restockFromInspection(qc);

        ArgumentCaptor<RestockedItem> captor = ArgumentCaptor.forClass(RestockedItem.class);
        verify(repository).save(captor.capture());
        RestockedItem saved = captor.getValue();

        boolean expectedNeedsApproval = mockValueOf(skuId).compareTo(new BigDecimal("5000")) > 0;
        assertThat(saved.isSupervisorApprovalRequired()).isEqualTo(expectedNeedsApproval);
        assertThat(saved.isApproved()).isEqualTo(!expectedNeedsApproval);
    }

    @Test
    void approve_setsApprovedTrue() {
        UUID id = UUID.randomUUID();
        RestockedItem item = RestockedItem.builder().id(id).approved(false).skuId(UUID.randomUUID()).quantity(2).build();
        when(repository.findById(id)).thenReturn(java.util.Optional.of(item));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RestockedItem result = restockService.approve(id);

        assertThat(result.isApproved()).isTrue();
    }

    @Test
    void approve_incrementsInventory_forTheApprovedItem() {
        UUID id = UUID.randomUUID();
        UUID skuId = UUID.randomUUID();
        RestockedItem item = RestockedItem.builder().id(id).approved(false).skuId(skuId).quantity(4).build();
        when(repository.findById(id)).thenReturn(java.util.Optional.of(item));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        restockService.approve(id);

        verify(inventoryService).incrementStock(skuId.toString(), 4);
    }

    @Test
    void restockFromInspection_incrementsInventory_whenNoApprovalNeeded() {
        UUID returnId = UUID.randomUUID();
        // Deterministic low-value SKU: keep trying until the mock formula
        // lands under the 5,000 threshold, matching production's own
        // deterministic-per-SKU pricing rule.
        UUID skuId;
        do {
            skuId = UUID.randomUUID();
        } while (mockValueOf(skuId).compareTo(new BigDecimal("5000")) > 0);

        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).returnRequest(returnRequest).build();
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(List.of(ReturnItem.builder().skuId(skuId).quantity(2).build()));

        restockService.restockFromInspection(qc);

        verify(inventoryService).incrementStock(skuId.toString(), 2);
    }

    @Test
    void restockFromInspection_doesNotIncrementInventory_whenApprovalStillPending() {
        UUID returnId = UUID.randomUUID();
        UUID skuId;
        do {
            skuId = UUID.randomUUID();
        } while (mockValueOf(skuId).compareTo(new BigDecimal("5000")) <= 0);

        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).build();
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).returnRequest(returnRequest).build();
        when(returnItemRepository.findByReturnRequestId(returnId)).thenReturn(List.of(ReturnItem.builder().skuId(skuId).quantity(1).build()));

        restockService.restockFromInspection(qc);

        verify(inventoryService, never()).incrementStock(any(), anyInt());
    }

    @Test
    void get_throwsNotFound_whenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> restockService.get(id)).isInstanceOf(NotFoundException.class);
    }
}
