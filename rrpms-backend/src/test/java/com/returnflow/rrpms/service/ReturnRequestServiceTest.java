package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.InitiateReturnRequest;
import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.FraudFlagStatus;
import com.returnflow.rrpms.enums.PolicyEntityType;
import com.returnflow.rrpms.enums.PreferredRefundMethod;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.enums.ReturnType;
import com.returnflow.rrpms.exception.DuplicateReturnException;
import com.returnflow.rrpms.exception.FraudHoldException;
import com.returnflow.rrpms.exception.NonReturnableItemException;
import com.returnflow.rrpms.exception.ReturnWindowClosedException;
import com.returnflow.rrpms.integration.LogisticsService;
import com.returnflow.rrpms.integration.OrderService;
import com.returnflow.rrpms.repository.PickupRepository;
import com.returnflow.rrpms.repository.RefundRepository;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReturnRequestServiceTest {

    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private ReturnPolicyRepository returnPolicyRepository;
    @Mock private PickupRepository pickupRepository;
    @Mock private LogisticsService logisticsService;
    @Mock private OrderService orderService;
    @Mock private CommunicationService communicationService;
    @Mock private FraudDetectionService fraudDetectionService;
    @Mock private com.returnflow.rrpms.repository.UserRepository userRepository;
    @Mock private com.returnflow.rrpms.integration.InventoryService inventoryService;
    @Mock private com.returnflow.rrpms.repository.FraudFlagRepository fraudFlagRepository;
    @Mock private ReturnEventPublisher returnEventPublisher;
    @Mock private RefundRepository refundRepository;

    @InjectMocks private ReturnRequestService returnRequestService;

    private UUID policyId;
    private ReturnPolicy policy;

    @BeforeEach
    void setUp() {
        policyId = UUID.randomUUID();
        policy = ReturnPolicy.builder()
                .id(policyId)
                .name("Default")
                .entityType(PolicyEntityType.PLATFORM)
                .returnWindowDays(7)
                .effectiveFrom(LocalDate.now().minusDays(365))
                .build();
        lenient().when(returnPolicyRepository.findById(policyId)).thenReturn(java.util.Optional.of(policy));
        lenient().when(returnRequestRepository.findByCustomerId(any())).thenReturn(Collections.emptyList());
    }

    private InitiateReturnRequest baseRequest(String reasonCode, PreferredRefundMethod method,
                                               String bankAccount, String bankIfsc, List<String> evidenceUrls) {
        return new InitiateReturnRequest(
                UUID.randomUUID(), UUID.randomUUID(), ReturnType.RETURN, reasonCode, method, policyId,
                bankAccount, bankIfsc, null,
                List.of(new InitiateReturnRequest.ReturnItemRequest(UUID.randomUUID(), UUID.randomUUID(), 1, reasonCode, null, evidenceUrls)),
                null, null
        );
    }

    @Test
    void initiate_throwsReturnWindowClosed_whenDeliveredOutsideWindow() {
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now().minusDays(30), new BigDecimal("2000")));
        InitiateReturnRequest req = baseRequest("CHANGED_MIND", PreferredRefundMethod.ORIGINAL, null, null, null);

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(ReturnWindowClosedException.class);
    }

    @Test
    void initiate_throwsNonReturnableItem_whenSkuIsBlocked() {
        UUID blockedSku = UUID.randomUUID();
        policy.setNonReturnableSkus(List.of(blockedSku));
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));

        InitiateReturnRequest req = new InitiateReturnRequest(
                UUID.randomUUID(), UUID.randomUUID(), ReturnType.RETURN, "CHANGED_MIND", PreferredRefundMethod.ORIGINAL, policyId,
                null, null, null,
                List.of(new InitiateReturnRequest.ReturnItemRequest(UUID.randomUUID(), blockedSku, 1, "CHANGED_MIND", null, null)),
                null, null
        );

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(NonReturnableItemException.class);
    }

    @Test
    void initiate_throwsFraudHold_whenCustomerIsBlacklisted() {
        UUID customerId = UUID.randomUUID();
        when(fraudFlagRepository.findAll()).thenReturn(List.of(
                FraudFlag.builder().customerId(customerId).status(FraudFlagStatus.CONFIRMED).build()));
        InitiateReturnRequest req = new InitiateReturnRequest(
                UUID.randomUUID(), customerId, ReturnType.RETURN, "CHANGED_MIND", PreferredRefundMethod.ORIGINAL, policyId,
                null, null, null, null, null, null);

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(FraudHoldException.class);
    }

    @Test
    void initiate_allowsBlacklistedCustomer_onceFlagCleared() {
        UUID customerId = UUID.randomUUID();
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        when(fraudFlagRepository.findAll()).thenReturn(List.of(
                FraudFlag.builder().customerId(customerId).status(FraudFlagStatus.CLEARED).build()));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        InitiateReturnRequest req = new InitiateReturnRequest(
                UUID.randomUUID(), customerId, ReturnType.RETURN, "SIZE_FIT_ISSUE", PreferredRefundMethod.ORIGINAL, policyId,
                null, null, null, null, null, null);

        // A CLEARED fraud flag should not block initiation — should not throw.
        returnRequestService.initiate(req);
    }

    @Test
    void initiate_throwsFraudHold_forChangedMind_whenSerialAbuseFlagOpen() {
        UUID customerId = UUID.randomUUID();
        when(fraudFlagRepository.findAll()).thenReturn(List.of(
                FraudFlag.builder().customerId(customerId).flagType("SERIAL_CHANGED_MIND_RETURNER").status(FraudFlagStatus.OPEN).build()));
        InitiateReturnRequest req = new InitiateReturnRequest(
                UUID.randomUUID(), customerId, ReturnType.RETURN, "CHANGED_MIND", PreferredRefundMethod.ORIGINAL, policyId,
                null, null, null, null, null, null);

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(FraudHoldException.class);
    }

    @Test
    void initiate_allowsOtherReasons_evenWithSerialAbuseFlag() {
        UUID customerId = UUID.randomUUID();
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        when(fraudFlagRepository.findAll()).thenReturn(List.of(
                FraudFlag.builder().customerId(customerId).flagType("SERIAL_CHANGED_MIND_RETURNER").status(FraudFlagStatus.OPEN).build()));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        InitiateReturnRequest req = new InitiateReturnRequest(
                UUID.randomUUID(), customerId, ReturnType.RETURN, "SIZE_FIT_ISSUE", PreferredRefundMethod.ORIGINAL, policyId,
                null, null, null, null, null, null);

        // A SIZE_FIT_ISSUE-reason return is unaffected by a CHANGED_MIND-specific
        // abuse flag — should not throw.
        returnRequestService.initiate(req);
    }

    @Test
    void initiate_throwsIllegalState_whenDefectiveWithNoEvidence() {
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        InitiateReturnRequest req = baseRequest("DEFECTIVE", PreferredRefundMethod.ORIGINAL, null, null, null);

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("photos");
    }

    @Test
    void initiate_succeeds_whenDefectiveWithEvidence() {
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        InitiateReturnRequest req = baseRequest("DEFECTIVE", PreferredRefundMethod.ORIGINAL, null, null,
                List.of("https://mock-s3.rrpms.local/evidence/photo1.jpg"));

        ReturnRequest result = returnRequestService.initiate(req);

        assertThat(result.getStatus()).isEqualTo(ReturnStatus.INITIATED);
    }

    @Test
    void initiate_throwsIllegalState_whenBankTransferWithNoBankDetails() {
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        InitiateReturnRequest req = baseRequest("CHANGED_MIND", PreferredRefundMethod.BANK_TRANSFER, null, null, null);

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("bank details");
    }

    @Test
    void initiate_succeeds_whenBankTransferWithBankDetails() {
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        InitiateReturnRequest req = baseRequest("CHANGED_MIND", PreferredRefundMethod.BANK_TRANSFER, "000123456789", "HDFC0001234", null);

        ReturnRequest result = returnRequestService.initiate(req);

        assertThat(result.getBankAccountNumber()).isEqualTo("000123456789");
        assertThat(result.getBankIfsc()).isEqualTo("HDFC0001234");
    }

    @Test
    void initiate_throwsDuplicateReturn_whenOrderAlreadyRefunded() {
        UUID customerId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        ReturnRequest alreadyRefunded = ReturnRequest.builder()
                .orderId(orderId).customerId(customerId).status(ReturnStatus.REFUNDED).build();
        when(returnRequestRepository.findByCustomerId(customerId)).thenReturn(List.of(alreadyRefunded));

        InitiateReturnRequest req = new InitiateReturnRequest(
                orderId, customerId, ReturnType.RETURN, "CHANGED_MIND", PreferredRefundMethod.ORIGINAL, policyId,
                null, null, null, null, null, null);

        assertThatThrownBy(() -> returnRequestService.initiate(req))
                .isInstanceOf(DuplicateReturnException.class);
    }

    @Test
    void dispatchExchange_convertsToRefund_whenExchangeSkuOutOfStock() {
        UUID returnId = UUID.randomUUID();
        UUID exchangeSku = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder()
                .id(returnId).customerId(UUID.randomUUID()).returnType(ReturnType.EXCHANGE)
                .status(ReturnStatus.QC_DONE).build();
        com.returnflow.rrpms.entity.ReturnItem item = com.returnflow.rrpms.entity.ReturnItem.builder()
                .skuId(UUID.randomUUID()).exchangeSkuId(exchangeSku).quantity(1).build();
        returnRequest.setItems(List.of(item));
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(inventoryService.isAvailable(exchangeSku.toString())).thenReturn(false);

        ReturnRequest result = returnRequestService.dispatchExchange(returnId);

        assertThat(result.getReturnType()).isEqualTo(ReturnType.RETURN);
        assertThat(result.getStatus()).isNotEqualTo(ReturnStatus.EXCHANGE_DISPATCHED);
    }

    @Test
    void dispatchExchange_proceedsNormally_whenExchangeSkuInStock() {
        UUID returnId = UUID.randomUUID();
        UUID exchangeSku = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder()
                .id(returnId).customerId(UUID.randomUUID()).returnType(ReturnType.EXCHANGE)
                .status(ReturnStatus.QC_DONE).build();
        com.returnflow.rrpms.entity.ReturnItem item = com.returnflow.rrpms.entity.ReturnItem.builder()
                .skuId(UUID.randomUUID()).exchangeSkuId(exchangeSku).quantity(1).build();
        returnRequest.setItems(List.of(item));
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(inventoryService.isAvailable(exchangeSku.toString())).thenReturn(true);
        when(logisticsService.createPickup(any(), any(), any())).thenReturn(
                new com.returnflow.rrpms.integration.LogisticsService.PickupResult("AWB123", "http://track", "123456"));

        ReturnRequest result = returnRequestService.dispatchExchange(returnId);

        assertThat(result.getStatus()).isEqualTo(ReturnStatus.EXCHANGE_DISPATCHED);
        assertThat(result.getReturnType()).isEqualTo(ReturnType.EXCHANGE);
    }

    @Test
    void submitSatisfactionFeedback_savesRating_whenReturnIsRefunded() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).status(ReturnStatus.REFUNDED).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReturnRequest result = returnRequestService.submitSatisfactionFeedback(returnId, 4, "Smooth process");

        assertThat(result.getSatisfactionRating()).isEqualTo(4);
        assertThat(result.getSatisfactionComment()).isEqualTo("Smooth process");
        assertThat(result.getSatisfactionSubmittedAt()).isNotNull();
    }

    @Test
    void submitSatisfactionFeedback_throwsIllegalState_whenReturnStillInProgress() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).status(ReturnStatus.QC_IN_PROGRESS).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));

        assertThatThrownBy(() -> returnRequestService.submitSatisfactionFeedback(returnId, 5, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("complete");
    }

    @Test
    void submitSatisfactionFeedback_throwsIllegalState_whenAlreadySubmitted() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).status(ReturnStatus.REFUNDED)
                .satisfactionSubmittedAt(java.time.Instant.now()).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));

        assertThatThrownBy(() -> returnRequestService.submitSatisfactionFeedback(returnId, 3, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already been submitted");
    }

    @Test
    void saveDraft_and_listDrafts_succeeds() {
        UUID customerId = UUID.randomUUID();
        InitiateReturnRequest req = baseRequest(null, PreferredRefundMethod.ORIGINAL, null, null, null);
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        ReturnRequest draft = returnRequestService.saveDraft(req);
        assertThat(draft.isDraft()).isTrue();
        assertThat(draft.getReasonCode()).isEqualTo("DRAFT");
        assertThat(draft.getDraftExpiresAt()).isNotNull();

        when(returnRequestRepository.findByCustomerId(customerId)).thenReturn(List.of(draft));
        List<ReturnRequest> drafts = returnRequestService.listDrafts(customerId);
        assertThat(drafts).hasSize(1);
    }

    @Test
    void finalizeDraft_throwsIllegalState_whenNotDraft() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest notDraft = ReturnRequest.builder().id(returnId).isDraft(false).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(notDraft));

        assertThatThrownBy(() -> returnRequestService.finalizeDraft(returnId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not a draft");
    }

    @Test
    void finalizeDraft_throwsIllegalState_whenDraftExpired() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest expiredDraft = ReturnRequest.builder()
                .id(returnId)
                .isDraft(true)
                .draftExpiresAt(java.time.Instant.now().minusSeconds(3600))
                .build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(expiredDraft));

        assertThatThrownBy(() -> returnRequestService.finalizeDraft(returnId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Draft has expired");
    }

    @Test
    void finalizeDraft_succeeds_whenValid() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest validDraft = ReturnRequest.builder()
                .id(returnId)
                .orderId(UUID.randomUUID())
                .customerId(UUID.randomUUID())
                .policy(policy)
                .reasonCode("SIZE_FIT_ISSUE")
                .isDraft(true)
                .draftExpiresAt(java.time.Instant.now().plusSeconds(3600))
                .build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(validDraft));
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, LocalDate.now(), new BigDecimal("2000")));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        ReturnRequest finalized = returnRequestService.finalizeDraft(returnId);
        assertThat(finalized.isDraft()).isFalse();
        assertThat(finalized.getDraftExpiresAt()).isNull();
    }

    @Test
    void schedulePickup_and_reschedulePickup_flow() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).status(ReturnStatus.INITIATED).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(logisticsService.createPickup(any(), any(), any())).thenReturn(
                new LogisticsService.PickupResult("AWB-TEST-123", "http://track", "654321"));

        com.returnflow.rrpms.entity.Pickup pickup = com.returnflow.rrpms.entity.Pickup.builder()
                .returnRequest(returnRequest)
                .rescheduleCount(0)
                .build();
        when(pickupRepository.save(any(com.returnflow.rrpms.entity.Pickup.class))).thenAnswer(inv -> inv.getArgument(0));

        com.returnflow.rrpms.dto.SchedulePickupRequest schedReq = new com.returnflow.rrpms.dto.SchedulePickupRequest(
                com.returnflow.rrpms.enums.LogisticsPartner.DELHIVERY, LocalDate.now().plusDays(1), "10:00-14:00", "123 Main St, Bangalore");

        com.returnflow.rrpms.entity.Pickup created = returnRequestService.schedulePickup(returnId, schedReq);
        assertThat(created.getAwbNumber()).isEqualTo("AWB-TEST-123");
        assertThat(returnRequest.getStatus()).isEqualTo(ReturnStatus.PICKUP_SCHEDULED);

        // Reschedule
        when(pickupRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(created));
        com.returnflow.rrpms.dto.ReschedulePickupRequest reschedReq = new com.returnflow.rrpms.dto.ReschedulePickupRequest(
                LocalDate.now().plusDays(2), "14:00-18:00");
        com.returnflow.rrpms.entity.Pickup rescheduled = returnRequestService.reschedulePickup(returnId, reschedReq);
        assertThat(rescheduled.getRescheduleCount()).isEqualTo(1);
        assertThat(rescheduled.getPickupDate()).isEqualTo(LocalDate.now().plusDays(2));

        // Attempt 3rd reschedule (max is 2)
        rescheduled.setRescheduleCount(2);
        assertThatThrownBy(() -> returnRequestService.reschedulePickup(returnId, reschedReq))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Maximum pickup reschedules reached");
    }

    @Test
    void pickupLifecycle_pickedUp_inTransit_delivered_failed() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder().id(returnId).status(ReturnStatus.PICKUP_SCHEDULED).build();
        com.returnflow.rrpms.entity.Pickup p = com.returnflow.rrpms.entity.Pickup.builder()
                .returnRequest(rr)
                .status(com.returnflow.rrpms.enums.PickupStatus.SCHEDULED)
                .build();

        when(pickupRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(p));
        when(pickupRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Picked up
        com.returnflow.rrpms.entity.Pickup p1 = returnRequestService.markPickedUp(returnId);
        assertThat(p1.getStatus()).isEqualTo(com.returnflow.rrpms.enums.PickupStatus.PICKED_UP);

        // In Transit
        com.returnflow.rrpms.entity.Pickup p2 = returnRequestService.markInTransit(returnId);
        assertThat(p2.getStatus()).isEqualTo(com.returnflow.rrpms.enums.PickupStatus.IN_TRANSIT);
        assertThat(rr.getStatus()).isEqualTo(ReturnStatus.IN_TRANSIT);

        // Delivered to Warehouse
        com.returnflow.rrpms.entity.Pickup p3 = returnRequestService.markDeliveredToWarehouse(returnId);
        assertThat(p3.getStatus()).isEqualTo(com.returnflow.rrpms.enums.PickupStatus.DELIVERED_TO_WAREHOUSE);
        assertThat(p3.getGrnNumber()).startsWith("GRN-");
        assertThat(rr.getStatus()).isEqualTo(ReturnStatus.RECEIVED);

        // Failed
        com.returnflow.rrpms.entity.Pickup p4 = returnRequestService.markPickupFailed(returnId);
        assertThat(p4.getStatus()).isEqualTo(com.returnflow.rrpms.enums.PickupStatus.FAILED);
    }

    @Test
    void confirmDropOff_and_cancel_and_override() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder().id(returnId).status(ReturnStatus.INITIATED).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(rr));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReturnRequest droppedOff = returnRequestService.confirmDropOff(returnId);
        assertThat(droppedOff.getStatus()).isEqualTo(ReturnStatus.RECEIVED);

        ReturnRequest cancelled = returnRequestService.cancel(returnId);
        assertThat(cancelled.getStatus()).isEqualTo(ReturnStatus.CANCELLED);

        com.returnflow.rrpms.dto.OverrideReturnWindowRequest overReq = new com.returnflow.rrpms.dto.OverrideReturnWindowRequest(
                7, "Customer flight delay exception");
        ReturnRequest overridden = returnRequestService.overrideReturnWindow(returnId, overReq);
        assertThat(overridden.isSupportOverride()).isTrue();
        assertThat(overridden.getSupportOverrideReason()).isEqualTo("Customer flight delay exception");
    }

    @Test
    void list_and_listOverrides_and_get() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder().id(returnId).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(rr));
        when(returnRequestRepository.findAll()).thenReturn(List.of(rr));
        when(returnRequestRepository.findBySupportOverrideTrueOrderByInitiatedAtDesc()).thenReturn(List.of(rr));

        assertThat(returnRequestService.get(returnId)).isEqualTo(rr);
        assertThat(returnRequestService.list()).hasSize(1);
        assertThat(returnRequestService.listOverrides()).hasSize(1);
    }

    @Test
    void dispatchExchange_allowsVipUser_skippingQcDone() {
        UUID returnId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID exchangeSku = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder()
                .id(returnId)
                .customerId(customerId)
                .returnType(ReturnType.EXCHANGE)
                .status(ReturnStatus.INITIATED) // Not QC_DONE!
                .items(List.of(com.returnflow.rrpms.entity.ReturnItem.builder()
                        .skuId(UUID.randomUUID())
                        .exchangeSkuId(exchangeSku)
                        .quantity(1)
                        .build()))
                .build();

        com.returnflow.rrpms.entity.User vipUser = new com.returnflow.rrpms.entity.User();
        vipUser.setVip(true);

        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(rr));
        when(userRepository.findById(customerId)).thenReturn(java.util.Optional.of(vipUser));
        when(inventoryService.isAvailable(exchangeSku.toString())).thenReturn(true);
        when(logisticsService.createPickup(any(), any(), any())).thenReturn(
                new LogisticsService.PickupResult("AWB-VIP-EXCHANGE", "http://track", "112233"));
        when(returnRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ReturnRequest dispatched = returnRequestService.dispatchExchange(returnId);
        assertThat(dispatched.getStatus()).isEqualTo(ReturnStatus.EXCHANGE_DISPATCHED);
    }

    @Test
    void dispatchExchange_throwsIllegalState_whenNotExchangeType() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder().id(returnId).returnType(ReturnType.RETURN).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(rr));

        assertThatThrownBy(() -> returnRequestService.dispatchExchange(returnId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only EXCHANGE-type returns");
    }

    @Test
    void dispatchExchange_throwsIllegalState_whenNonVipAndNotQcDone() {
        UUID returnId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder()
                .id(returnId)
                .customerId(customerId)
                .returnType(ReturnType.EXCHANGE)
                .status(ReturnStatus.INITIATED)
                .build();

        com.returnflow.rrpms.entity.User regularUser = new com.returnflow.rrpms.entity.User();
        regularUser.setVip(false);

        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(rr));
        when(userRepository.findById(customerId)).thenReturn(java.util.Optional.of(regularUser));

        assertThatThrownBy(() -> returnRequestService.dispatchExchange(returnId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Exchange item must pass QC");
    }
}

