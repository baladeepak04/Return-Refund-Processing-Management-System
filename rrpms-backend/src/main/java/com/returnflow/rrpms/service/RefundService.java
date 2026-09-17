package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.InitiateRefundRequest;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.RefundStatus;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.exception.QcNotCompletedException;
import com.returnflow.rrpms.exception.RefundAmountExceededException;
import com.returnflow.rrpms.exception.FraudHoldException;
import com.returnflow.rrpms.integration.OrderService;
import com.returnflow.rrpms.integration.PaymentGatewayService;
import com.returnflow.rrpms.repository.FraudFlagRepository;
import com.returnflow.rrpms.repository.QcInspectionRepository;
import com.returnflow.rrpms.repository.RefundRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefundService {

    private static final BigDecimal HIGH_VALUE_THRESHOLD = new BigDecimal("5000");

    private final RefundRepository refundRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final QcInspectionRepository qcInspectionRepository;
    private final FraudFlagRepository fraudFlagRepository;
    private final OrderService orderService;
    private final PaymentGatewayService paymentGatewayService;
    private final CommunicationService communicationService;
    private final FraudDetectionService fraudDetectionService;
    private final RefundSlaTrackingService refundSlaTrackingService;
    private final ReturnEventPublisher returnEventPublisher;
    private final ReturnRequestService returnRequestService;

    public Refund initiate(InitiateRefundRequest req) {
        ReturnRequest returnRequest = returnRequestRepository.findById(req.returnId())
                .orElseThrow(() -> new NotFoundException("Return not found: " + req.returnId()));

        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        com.returnflow.rrpms.enums.Role callerRole = (principal instanceof User u) ? u.getRole() : null;
        boolean isFinanceOrAdmin = callerRole == com.returnflow.rrpms.enums.Role.FINANCE || callerRole == com.returnflow.rrpms.enums.Role.ADMIN;

        if (!isFinanceOrAdmin) {
            boolean fraudHold = fraudFlagRepository.findByReturnRequestId(req.returnId()).stream()
                    .anyMatch(f -> f.getStatus() != com.returnflow.rrpms.enums.FraudFlagStatus.CLEARED);
            if (fraudHold) {
                throw new FraudHoldException("Return under fraud investigation");
            }

            qcInspectionRepository.findByReturnRequestId(req.returnId())
                    .orElseThrow(() -> new QcNotCompletedException("QC inspection must be completed first"));
        } else {
            // Finance or Admin authorized disbursement clears automated OPEN warning flags
            fraudFlagRepository.findByReturnRequestId(req.returnId()).forEach(flag -> {
                if (flag.getStatus() == com.returnflow.rrpms.enums.FraudFlagStatus.OPEN) {
                    flag.setStatus(com.returnflow.rrpms.enums.FraudFlagStatus.CLEARED);
                    fraudFlagRepository.save(flag);
                }
            });
        }

        if (req.method() == com.returnflow.rrpms.enums.RefundMethod.BANK_TRANSFER
                && (returnRequest.getBankAccountNumber() == null || returnRequest.getBankIfsc() == null)) {
            throw new IllegalStateException("Provide bank details for COD refund");
        }

        if (req.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RefundAmountExceededException("Refund amount must be greater than zero");
        }

        BigDecimal originalAmount = orderService.getOrder(returnRequest.getOrderId().toString()).originalAmount();
        if (req.amount().compareTo(originalAmount) > 0) {
            throw new RefundAmountExceededException(
                    "Refund cannot exceed original payment (" + originalAmount + ")");
        }

        boolean highValue = req.amount().compareTo(HIGH_VALUE_THRESHOLD) > 0;

        Refund refund = Refund.builder()
                .returnRequest(returnRequest)
                .amount(req.amount())
                .method(req.method())
                .status(RefundStatus.PENDING)
                .approvalRequired(highValue)
                .initiatedAt(Instant.now())
                .build();

        returnRequest.setStatus(ReturnStatus.REFUND_INITIATED);
        returnRequestRepository.save(returnRequest);
        Refund saved = refundRepository.save(refund);

        communicationService.sendMilestone(returnRequest, "REFUND_INITIATED",
                "Refund of " + req.amount() + " initiated via " + req.method() + ".");

        java.time.LocalDate expectedDate = req.method() == com.returnflow.rrpms.enums.RefundMethod.STORE_CREDIT
                ? java.time.LocalDate.now().plusDays(1)
                : java.time.LocalDate.now().plusDays(7);
        communicationService.sendRefundReceipt(returnRequest, req.amount(), req.method(), expectedDate);

        fraudDetectionService.checkRefundVelocity(saved);

        refundSlaTrackingService.startTracking(saved.getId(), req.method());

        returnEventPublisher.publish("REFUND_INITIATED", saved);
        return saved;
    }

    public Refund approve(UUID refundId) {
        Refund refund = get(refundId);

        if (refund.getRazorpayRefundId() != null) {
            return refund;
        }

        refund.setApproved(true);
        refund.setStatus(RefundStatus.INITIATED);
        Refund saved = refundRepository.save(refund);

        var result = paymentGatewayService.initiateRefund(refund.getId().toString(), refund.getAmount());
        saved.setRazorpayRefundId(result.gatewayRefundId());
        if (result.success()) {
            saved.setStatus(RefundStatus.PROCESSING);
            if (refund.getReturnRequest() != null) {
                fraudFlagRepository.findByReturnRequestId(refund.getReturnRequest().getId()).forEach(flag -> {
                    if (flag.getStatus() == com.returnflow.rrpms.enums.FraudFlagStatus.OPEN) {
                        flag.setStatus(com.returnflow.rrpms.enums.FraudFlagStatus.CLEARED);
                        fraudFlagRepository.save(flag);
                    }
                });
            }
        } else {
            saved.setStatus(RefundStatus.FAILED);
            saved.setFailureReason(result.failureReason());
        }
        Refund approved = refundRepository.save(saved);
        returnEventPublisher.publish("REFUND_APPROVED", approved);
        return approved;
    }

    public Refund reject(UUID refundId, String reason) {
        Refund refund = get(refundId);
        refund.setApproved(false);
        refund.setStatus(RefundStatus.FAILED);
        refund.setFailureReason(reason);
        return refundRepository.save(refund);
    }

    public Refund markCredited(UUID refundId) {
        Refund refund = get(refundId);
        refund.setStatus(RefundStatus.CREDITED);
        refund.setCreditedAt(Instant.now());
        ReturnRequest returnRequest = refund.getReturnRequest();
        returnRequest.setStatus(ReturnStatus.REFUNDED);
        returnRequestRepository.save(returnRequest);
        Refund saved = refundRepository.save(refund);

        communicationService.sendMilestone(returnRequest, "REFUND_CREDITED",
                "Refund of " + refund.getAmount() + " has been credited.");

        refundSlaTrackingService.stopTracking(refundId);

        returnEventPublisher.publish("REFUND_CREDITED", saved);
        return saved;
    }

    public Refund get(UUID id) {
        Refund r = refundRepository.findById(id).orElseThrow(() -> new NotFoundException("Refund not found: " + id));
        enrichRefund(r);
        return r;
    }

    public List<Refund> list() {
        List<Refund> all = refundRepository.findAll();
        all.forEach(this::enrichRefund);
        return all;
    }

    // Server-side customer filter — a customer's own screens (e.g. Refund
    // Status) previously fetched every refund on the platform and filtered
    // client-side, which meant every other customer's refund amount and
    // method briefly transited that customer's browser. Filtering here
    // means the response never contains anyone else's data in the first
    // place.
    public List<Refund> listByCustomer(UUID customerId) {
        List<Refund> list = refundRepository.findAll().stream()
                .filter(r -> r.getReturnRequest() != null && customerId.equals(r.getReturnRequest().getCustomerId()))
                .toList();
        list.forEach(this::enrichRefund);
        return list;
    }

    private void enrichRefund(Refund r) {
        if (r != null && r.getReturnRequest() != null && returnRequestService != null) {
            returnRequestService.enrichReturnRequest(r.getReturnRequest());
        }
    }
}
