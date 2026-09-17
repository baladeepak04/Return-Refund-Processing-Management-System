package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.InitiateRefundRequest;
import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.FraudFlagStatus;
import com.returnflow.rrpms.enums.RefundMethod;
import com.returnflow.rrpms.enums.RefundStatus;
import com.returnflow.rrpms.exception.FraudHoldException;
import com.returnflow.rrpms.exception.QcNotCompletedException;
import com.returnflow.rrpms.exception.RefundAmountExceededException;
import com.returnflow.rrpms.integration.OrderService;
import com.returnflow.rrpms.integration.PaymentGatewayService;
import com.returnflow.rrpms.repository.FraudFlagRepository;
import com.returnflow.rrpms.repository.QcInspectionRepository;
import com.returnflow.rrpms.repository.RefundRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock private RefundRepository refundRepository;
    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private QcInspectionRepository qcInspectionRepository;
    @Mock private FraudFlagRepository fraudFlagRepository;
    @Mock private OrderService orderService;
    @Mock private PaymentGatewayService paymentGatewayService;
    @Mock private CommunicationService communicationService;
    @Mock private FraudDetectionService fraudDetectionService;
    @Mock private RefundSlaTrackingService refundSlaTrackingService;
    @Mock private ReturnEventPublisher returnEventPublisher;

    @InjectMocks private RefundService refundService;

    private UUID returnId;
    private ReturnRequest returnRequest;

    @BeforeEach
    void setUp() {
        returnId = UUID.randomUUID();
        returnRequest = ReturnRequest.builder().id(returnId).customerId(UUID.randomUUID()).orderId(UUID.randomUUID()).build();
    }

    @Test
    void initiate_throwsQcNotCompleted_whenNoQcRecordExists() {
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(Collections.emptyList());
        when(qcInspectionRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.empty());

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, new BigDecimal("500"), RefundMethod.ORIGINAL_METHOD);

        assertThatThrownBy(() -> refundService.initiate(req))
                .isInstanceOf(QcNotCompletedException.class);
    }

    @Test
    void initiate_throwsFraudHold_whenOpenFraudFlagExists() {
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        FraudFlag openFlag = FraudFlag.builder().status(FraudFlagStatus.OPEN).build();
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(List.of(openFlag));

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, new BigDecimal("500"), RefundMethod.ORIGINAL_METHOD);

        assertThatThrownBy(() -> refundService.initiate(req))
                .isInstanceOf(FraudHoldException.class);
        // Fraud hold must block before the QC check even runs.
        verify(qcInspectionRepository, never()).findByReturnRequestId(any());
    }

    @Test
    void initiate_allowsRefund_whenFraudFlagIsCleared() {
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        FraudFlag clearedFlag = FraudFlag.builder().status(FraudFlagStatus.CLEARED).build();
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(List.of(clearedFlag));
        when(qcInspectionRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(new QcInspection()));
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, java.time.LocalDate.now(), new BigDecimal("2000")));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, new BigDecimal("500"), RefundMethod.ORIGINAL_METHOD);

        // Should not throw.
        refundService.initiate(req);
    }

    @Test
    void initiate_throwsRefundAmountExceeded_whenAboveOriginalPayment() {
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(Collections.emptyList());
        when(qcInspectionRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(new QcInspection()));
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, java.time.LocalDate.now(), new BigDecimal("1000")));

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, new BigDecimal("5000"), RefundMethod.ORIGINAL_METHOD);

        assertThatThrownBy(() -> refundService.initiate(req))
                .isInstanceOf(RefundAmountExceededException.class);
    }

    @Test
    void approve_isIdempotent_whenAlreadyProcessed() {
        Refund alreadyProcessed = Refund.builder()
                .id(UUID.randomUUID())
                .razorpayRefundId("rfnd_mock_already_done")
                .status(RefundStatus.PROCESSING)
                .build();
        when(refundRepository.findById(alreadyProcessed.getId())).thenReturn(java.util.Optional.of(alreadyProcessed));

        Refund result = refundService.approve(alreadyProcessed.getId());

        // Second call must not hit the payment gateway again.
        verify(paymentGatewayService, never()).initiateRefund(any(), any());
        org.assertj.core.api.Assertions.assertThat(result.getRazorpayRefundId()).isEqualTo("rfnd_mock_already_done");
    }

    @Test
    void initiate_throwsRefundAmountExceeded_whenAmountIsZeroOrNegative() {
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(Collections.emptyList());
        when(qcInspectionRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(new QcInspection()));

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, BigDecimal.ZERO, RefundMethod.ORIGINAL_METHOD);

        assertThatThrownBy(() -> refundService.initiate(req))
                .isInstanceOf(RefundAmountExceededException.class)
                .hasMessageContaining("greater than zero");
    }

    @Test
    void initiate_throwsIllegalState_whenBankTransferWithoutBankDetails() {
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(Collections.emptyList());
        when(qcInspectionRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(new QcInspection()));

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, new BigDecimal("500"), RefundMethod.BANK_TRANSFER);

        assertThatThrownBy(() -> refundService.initiate(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("bank details");
    }

    @Test
    void initiate_marksApprovalRequired_forHighValueRefund() {
        returnRequest.setBankAccountNumber("123456789");
        returnRequest.setBankIfsc("HDFC0001234");
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(fraudFlagRepository.findByReturnRequestId(returnId)).thenReturn(Collections.emptyList());
        when(qcInspectionRepository.findByReturnRequestId(returnId)).thenReturn(java.util.Optional.of(new QcInspection()));
        when(orderService.getOrder(any())).thenReturn(
                new OrderService.OrderDetails("order", true, java.time.LocalDate.now(), new BigDecimal("10000")));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InitiateRefundRequest req = new InitiateRefundRequest(returnId, new BigDecimal("6000"), RefundMethod.BANK_TRANSFER);
        Refund result = refundService.initiate(req);

        org.assertj.core.api.Assertions.assertThat(result.isApprovalRequired()).isTrue();
        org.assertj.core.api.Assertions.assertThat(result.getStatus()).isEqualTo(RefundStatus.PENDING);
    }

    @Test
    void approve_processesGatewayCall_andMarksProcessingWhenSuccessful() {
        UUID refundId = UUID.randomUUID();
        Refund pendingRefund = Refund.builder()
                .id(refundId)
                .amount(new BigDecimal("1000"))
                .status(RefundStatus.PENDING)
                .build();
        when(refundRepository.findById(refundId)).thenReturn(java.util.Optional.of(pendingRefund));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentGatewayService.initiateRefund(any(), any())).thenReturn(
                new PaymentGatewayService.PaymentResult("rfnd_gateway_123", true, null));

        Refund approved = refundService.approve(refundId);

        org.assertj.core.api.Assertions.assertThat(approved.getApproved()).isTrue();
        org.assertj.core.api.Assertions.assertThat(approved.getStatus()).isEqualTo(RefundStatus.PROCESSING);
        org.assertj.core.api.Assertions.assertThat(approved.getRazorpayRefundId()).isEqualTo("rfnd_gateway_123");
    }

    @Test
    void approve_marksFailed_whenGatewayFails() {
        UUID refundId = UUID.randomUUID();
        Refund pendingRefund = Refund.builder()
                .id(refundId)
                .amount(new BigDecimal("1000"))
                .status(RefundStatus.PENDING)
                .build();
        when(refundRepository.findById(refundId)).thenReturn(java.util.Optional.of(pendingRefund));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentGatewayService.initiateRefund(any(), any())).thenReturn(
                new PaymentGatewayService.PaymentResult(null, false, "Insufficient merchant balance"));

        Refund approved = refundService.approve(refundId);

        org.assertj.core.api.Assertions.assertThat(approved.getStatus()).isEqualTo(RefundStatus.FAILED);
        org.assertj.core.api.Assertions.assertThat(approved.getFailureReason()).isEqualTo("Insufficient merchant balance");
    }

    @Test
    void reject_marksRefundFailedWithReason() {
        UUID refundId = UUID.randomUUID();
        Refund refund = Refund.builder().id(refundId).status(RefundStatus.PENDING).build();
        when(refundRepository.findById(refundId)).thenReturn(java.util.Optional.of(refund));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Refund rejected = refundService.reject(refundId, "Documentation incomplete");

        org.assertj.core.api.Assertions.assertThat(rejected.getApproved()).isFalse();
        org.assertj.core.api.Assertions.assertThat(rejected.getStatus()).isEqualTo(RefundStatus.FAILED);
        org.assertj.core.api.Assertions.assertThat(rejected.getFailureReason()).isEqualTo("Documentation incomplete");
    }

    @Test
    void markCredited_updatesStatusAndReturnRequest() {
        UUID refundId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder().id(returnId).status(com.returnflow.rrpms.enums.ReturnStatus.REFUND_INITIATED).build();
        Refund refund = Refund.builder().id(refundId).returnRequest(rr).amount(new BigDecimal("500")).build();
        when(refundRepository.findById(refundId)).thenReturn(java.util.Optional.of(refund));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Refund credited = refundService.markCredited(refundId);

        org.assertj.core.api.Assertions.assertThat(credited.getStatus()).isEqualTo(RefundStatus.CREDITED);
        org.assertj.core.api.Assertions.assertThat(credited.getCreditedAt()).isNotNull();
        org.assertj.core.api.Assertions.assertThat(rr.getStatus()).isEqualTo(com.returnflow.rrpms.enums.ReturnStatus.REFUNDED);
        verify(refundSlaTrackingService).stopTracking(refundId);
    }

    @Test
    void get_and_list_and_listByCustomer() {
        UUID refundId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        ReturnRequest rr = ReturnRequest.builder().id(returnId).customerId(customerId).build();
        Refund refund = Refund.builder().id(refundId).returnRequest(rr).build();

        when(refundRepository.findById(refundId)).thenReturn(java.util.Optional.of(refund));
        when(refundRepository.findAll()).thenReturn(List.of(refund));

        org.assertj.core.api.Assertions.assertThat(refundService.get(refundId)).isEqualTo(refund);
        org.assertj.core.api.Assertions.assertThat(refundService.list()).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(refundService.listByCustomer(customerId)).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(refundService.listByCustomer(UUID.randomUUID())).isEmpty();
    }
}

