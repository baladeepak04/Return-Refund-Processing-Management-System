package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.QcInspectionRequest;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.repository.QcInspectionRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QcInspectionService {

    private final QcInspectionRepository qcInspectionRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final RestockService restockService;
    private final LiquidationService liquidationService;
    private final CommunicationService communicationService;
    private final FraudDetectionService fraudDetectionService;
    private final ReturnEventPublisher returnEventPublisher;
    private final ReturnRequestService returnRequestService;
    private final com.returnflow.rrpms.repository.RefundRepository refundRepository;

    public QcInspection submit(QcInspectionRequest req, User inspector) {
        ReturnRequest returnRequest = returnRequestRepository.findById(req.returnId())
                .orElseThrow(() -> new com.returnflow.rrpms.exception.NotFoundException("Return not found: " + req.returnId()));

        boolean requiresEvidence = "DEFECTIVE".equals(returnRequest.getReasonCode())
                || "DAMAGED_IN_TRANSIT".equals(returnRequest.getReasonCode());
        if (requiresEvidence && (req.images() == null || req.images().isEmpty())) {
            throw new com.returnflow.rrpms.exception.QcEvidenceRequiredException(
                    "At least one QC image is required for a '" + returnRequest.getReasonCode() + "' return");
        }

        QcInspection inspection = QcInspection.builder()
                .returnRequest(returnRequest)
                .inspector(inspector)
                .conditionGrade(req.conditionGrade())
                .functionalTest(req.functionalTest())
                .complaintValidated(req.complaintValidated())
                .images(req.images())
                .disposition(req.disposition())
                .notes(req.notes())
                .build();

        returnRequest.setStatus(ReturnStatus.QC_DONE);
        returnRequestRepository.save(returnRequest);

        QcInspection saved = qcInspectionRepository.save(inspection);

        restockService.restockFromInspection(saved);
        liquidationService.routeFromInspection(saved);

        // Auto-create pending refund record if not already created, so finance immediately sees the QC-cleared return
        if (returnRequest.getReturnType() != com.returnflow.rrpms.enums.ReturnType.EXCHANGE && refundRepository != null) {
            try {
                if (refundRepository.findByReturnRequestId(returnRequest.getId()).isEmpty()) {
                    com.returnflow.rrpms.enums.RefundMethod rMethod = com.returnflow.rrpms.enums.RefundMethod.ORIGINAL_METHOD;
                    if (returnRequest.getPreferredRefundMethod() != null) {
                        try {
                            rMethod = com.returnflow.rrpms.enums.RefundMethod.valueOf(returnRequest.getPreferredRefundMethod().name());
                        } catch (Exception ignored) {}
                    }
                    java.math.BigDecimal amt = returnRequest.getRefundAmount() != null && returnRequest.getRefundAmount().compareTo(java.math.BigDecimal.ZERO) > 0
                            ? returnRequest.getRefundAmount()
                            : java.math.BigDecimal.valueOf(2499);
                    boolean approvalReq = amt.compareTo(new java.math.BigDecimal("5000.00")) > 0;
                    com.returnflow.rrpms.entity.Refund autoRefund = com.returnflow.rrpms.entity.Refund.builder()
                            .returnRequest(returnRequest)
                            .amount(amt)
                            .method(rMethod)
                            .status(com.returnflow.rrpms.enums.RefundStatus.PENDING)
                            .approvalRequired(approvalReq)
                            .initiatedAt(java.time.Instant.now())
                            .build();
                    refundRepository.save(autoRefund);
                }
            } catch (Exception ignored) {}
        }

        communicationService.sendMilestone(returnRequest, "QC_COMPLETE",
                "QC complete — grade " + req.conditionGrade() + ". " +
                        (returnRequest.getReturnType().name().equals("EXCHANGE") ? "Replacement will be dispatched shortly." : "Refund will be initiated shortly."));

        fraudDetectionService.checkQcMismatch(saved);

        returnEventPublisher.publish("QC_COMPLETED", saved);

        enrichInspection(saved);
        return saved;
    }

    public List<QcInspection> list() {
        List<QcInspection> all = qcInspectionRepository.findAll();
        all.forEach(this::enrichInspection);
        return all;
    }

    // Same server-side filtering principle as RefundService.listByCustomer —
    // a customer's own screens should never receive every other customer's
    // QC notes/condition grades just to find their own.
    public List<QcInspection> listByCustomer(java.util.UUID customerId) {
        List<QcInspection> list = qcInspectionRepository.findAll().stream()
                .filter(q -> q.getReturnRequest() != null && customerId.equals(q.getReturnRequest().getCustomerId()))
                .toList();
        list.forEach(this::enrichInspection);
        return list;
    }

    public QcInspection get(UUID id) {
        QcInspection inspection = qcInspectionRepository.findById(id).orElseThrow(() -> new com.returnflow.rrpms.exception.NotFoundException("QC inspection not found: " + id));
        enrichInspection(inspection);
        return inspection;
    }

    private void enrichInspection(QcInspection q) {
        if (q != null && q.getReturnRequest() != null && returnRequestService != null) {
            returnRequestService.enrichReturnRequest(q.getReturnRequest());
        }
    }
}
