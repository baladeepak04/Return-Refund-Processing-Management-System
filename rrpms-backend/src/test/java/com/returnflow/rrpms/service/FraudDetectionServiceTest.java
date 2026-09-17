package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.RefundMethod;
import com.returnflow.rrpms.repository.FraudFlagRepository;
import com.returnflow.rrpms.repository.RefundRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FraudDetectionServiceTest {

    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private FraudFlagRepository fraudFlagRepository;
    @Mock private com.returnflow.rrpms.repository.CustomerReturnStatsRepository customerReturnStatsRepository;
    @Mock private com.returnflow.rrpms.repository.PickupRepository pickupRepository;

    @InjectMocks private FraudDetectionService fraudDetectionService;

    @Test
    void checkSerialChangedMind_flagsCustomer_whenMoreThanFiveInThirtyDays() {
        UUID customerId = UUID.randomUUID();
        List<ReturnRequest> recentReturns = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            recentReturns.add(ReturnRequest.builder()
                    .id(UUID.randomUUID()).customerId(customerId).reasonCode("CHANGED_MIND")
                    .initiatedAt(Instant.now().minus(i, ChronoUnit.DAYS)).build());
        }
        ReturnRequest current = recentReturns.get(0);
        when(returnRequestRepository.findByCustomerId(customerId)).thenReturn(recentReturns);
        when(fraudFlagRepository.findByReturnRequestId(current.getId())).thenReturn(Collections.emptyList());

        fraudDetectionService.checkSerialChangedMind(current);

        verify(fraudFlagRepository, times(1)).save(any());
    }

    @Test
    void checkSerialChangedMind_doesNotFlag_whenUnderThreshold() {
        UUID customerId = UUID.randomUUID();
        List<ReturnRequest> recentReturns = List.of(
                ReturnRequest.builder().id(UUID.randomUUID()).customerId(customerId).reasonCode("CHANGED_MIND").initiatedAt(Instant.now()).build());
        ReturnRequest current = recentReturns.get(0);
        when(returnRequestRepository.findByCustomerId(customerId)).thenReturn(recentReturns);

        fraudDetectionService.checkSerialChangedMind(current);

        verify(fraudFlagRepository, never()).save(any());
    }

    @Test
    void checkSerialChangedMind_ignoresNonChangedMindReasons() {
        ReturnRequest current = ReturnRequest.builder().id(UUID.randomUUID()).reasonCode("DEFECTIVE").build();

        fraudDetectionService.checkSerialChangedMind(current);

        verify(returnRequestRepository, never()).findByCustomerId(any());
        verify(fraudFlagRepository, never()).save(any());
    }

    @Test
    void checkQcMismatch_flagsReturn_whenComplaintNotValidated() {
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).customerId(UUID.randomUUID()).build();
        QcInspection inspection = QcInspection.builder().returnRequest(returnRequest).complaintValidated(false).build();
        when(fraudFlagRepository.findByReturnRequestId(returnRequest.getId())).thenReturn(Collections.emptyList());

        fraudDetectionService.checkQcMismatch(inspection);

        ArgumentCaptor<com.returnflow.rrpms.entity.FraudFlag> captor = ArgumentCaptor.forClass(com.returnflow.rrpms.entity.FraudFlag.class);
        verify(fraudFlagRepository).save(captor.capture());
        assertThat(captor.getValue().getFlagType()).isEqualTo("QC_COMPLAINT_MISMATCH");
    }

    @Test
    void checkQcMismatch_doesNotFlag_whenComplaintValidated() {
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).build();
        QcInspection inspection = QcInspection.builder().returnRequest(returnRequest).complaintValidated(true).build();

        fraudDetectionService.checkQcMismatch(inspection);

        verify(fraudFlagRepository, never()).save(any());
    }

    @Test
    void checkRefundVelocity_flagsCustomer_whenMoreThanThreeSameAccountInSevenDays() {
        String account = "000123456789";
        ReturnRequest returnRequest = ReturnRequest.builder()
                .id(UUID.randomUUID()).customerId(UUID.randomUUID()).bankAccountNumber(account).build();

        List<Refund> recentRefunds = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            ReturnRequest r = ReturnRequest.builder().bankAccountNumber(account).build();
            recentRefunds.add(Refund.builder().method(RefundMethod.BANK_TRANSFER).initiatedAt(Instant.now()).returnRequest(r).build());
        }
        Refund current = Refund.builder().method(RefundMethod.BANK_TRANSFER).initiatedAt(Instant.now()).returnRequest(returnRequest).build();

        when(refundRepository.findAll()).thenReturn(recentRefunds);
        when(fraudFlagRepository.findByReturnRequestId(returnRequest.getId())).thenReturn(Collections.emptyList());

        fraudDetectionService.checkRefundVelocity(current);

        verify(fraudFlagRepository, times(1)).save(any());
    }

    @Test
    void checkRefundVelocity_ignoresNonBankTransferMethods() {
        Refund current = Refund.builder().method(RefundMethod.STORE_CREDIT).build();

        fraudDetectionService.checkRefundVelocity(current);

        verify(refundRepository, never()).findAll();
        verify(fraudFlagRepository, never()).save(any());
    }

    @Test
    void checkReturnRateThreshold_doesNotFlag_whenExactlyAtThirtyPercent() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customerId).build();
        com.returnflow.rrpms.entity.CustomerReturnStats stats = com.returnflow.rrpms.entity.CustomerReturnStats.builder()
                .customerId(customerId).totalOrders(10).totalReturns(2).build();
        when(customerReturnStatsRepository.findByCustomerId(customerId)).thenReturn(java.util.Optional.of(stats));

        fraudDetectionService.checkReturnRateThreshold(returnRequest);

        // 3 returns / 10 orders = 30.00%, not > 30 — should NOT flag yet.
        verify(fraudFlagRepository, never()).save(any());
        verify(customerReturnStatsRepository).save(stats);
    }

    @Test
    void checkReturnRateThreshold_flagsCustomer_whenClearlyOverThreshold() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customerId).build();
        com.returnflow.rrpms.entity.CustomerReturnStats stats = com.returnflow.rrpms.entity.CustomerReturnStats.builder()
                .customerId(customerId).totalOrders(10).totalReturns(4).build();
        when(customerReturnStatsRepository.findByCustomerId(customerId)).thenReturn(java.util.Optional.of(stats));
        when(fraudFlagRepository.findByReturnRequestId(returnRequest.getId())).thenReturn(Collections.emptyList());

        fraudDetectionService.checkReturnRateThreshold(returnRequest);

        // 5 returns / 10 orders = 50% > 30% — should flag.
        ArgumentCaptor<com.returnflow.rrpms.entity.FraudFlag> captor = ArgumentCaptor.forClass(com.returnflow.rrpms.entity.FraudFlag.class);
        verify(fraudFlagRepository).save(captor.capture());
        assertThat(captor.getValue().getFlagType()).isEqualTo("RETURN_RATE_THRESHOLD");
        assertThat(stats.isFlagged()).isTrue();
    }

    @Test
    void checkReturnRateThreshold_doesNothing_whenNoStatsExist() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customerId).build();
        when(customerReturnStatsRepository.findByCustomerId(customerId)).thenReturn(java.util.Optional.empty());

        fraudDetectionService.checkReturnRateThreshold(returnRequest);

        verify(fraudFlagRepository, never()).save(any());
        verify(customerReturnStatsRepository, never()).save(any());
    }

    @Test
    void checkReturnRateThreshold_doesNothing_whenTotalOrdersNeverSet() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customerId).build();
        com.returnflow.rrpms.entity.CustomerReturnStats stats = com.returnflow.rrpms.entity.CustomerReturnStats.builder()
                .customerId(customerId).totalOrders(0).build();
        when(customerReturnStatsRepository.findByCustomerId(customerId)).thenReturn(java.util.Optional.of(stats));

        fraudDetectionService.checkReturnRateThreshold(returnRequest);

        verify(customerReturnStatsRepository, never()).save(any());
    }

    @Test
    void checkAddressPattern_flagsCustomer_whenSameAddressUsedByDifferentCustomer() {
        String address = "12 Park Street, Bengaluru";
        UUID customer1 = UUID.randomUUID();
        UUID customer2 = UUID.randomUUID();
        ReturnRequest return1 = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customer1).build();
        ReturnRequest return2 = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customer2).build();
        com.returnflow.rrpms.entity.Pickup pickup1 = com.returnflow.rrpms.entity.Pickup.builder()
                .pickupAddress(address).returnRequest(return1).build();
        com.returnflow.rrpms.entity.Pickup pickup2 = com.returnflow.rrpms.entity.Pickup.builder()
                .pickupAddress(address).returnRequest(return2).build();
        when(pickupRepository.findByPickupAddress(address)).thenReturn(List.of(pickup1, pickup2));
        when(fraudFlagRepository.findByReturnRequestId(return2.getId())).thenReturn(Collections.emptyList());

        fraudDetectionService.checkAddressPattern(pickup2);

        ArgumentCaptor<com.returnflow.rrpms.entity.FraudFlag> captor = ArgumentCaptor.forClass(com.returnflow.rrpms.entity.FraudFlag.class);
        verify(fraudFlagRepository).save(captor.capture());
        assertThat(captor.getValue().getFlagType()).isEqualTo("ADDRESS_PATTERN");
    }

    @Test
    void checkAddressPattern_doesNotFlag_whenOnlyOneCustomerUsesAddress() {
        String address = "5 MG Road, Bengaluru";
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(UUID.randomUUID()).customerId(customerId).build();
        com.returnflow.rrpms.entity.Pickup pickup = com.returnflow.rrpms.entity.Pickup.builder()
                .pickupAddress(address).returnRequest(returnRequest).build();
        when(pickupRepository.findByPickupAddress(address)).thenReturn(List.of(pickup));

        fraudDetectionService.checkAddressPattern(pickup);

        verify(fraudFlagRepository, never()).save(any());
    }

    @Test
    void checkAddressPattern_doesNothing_whenAddressIsBlank() {
        com.returnflow.rrpms.entity.Pickup pickup = com.returnflow.rrpms.entity.Pickup.builder().pickupAddress("").build();

        fraudDetectionService.checkAddressPattern(pickup);

        verify(pickupRepository, never()).findByPickupAddress(any());
        verify(fraudFlagRepository, never()).save(any());
    }
}
