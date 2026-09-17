package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.CustomerReturnStats;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.RefundMethod;
import com.returnflow.rrpms.repository.CustomerReturnStatsRepository;
import com.returnflow.rrpms.repository.FraudFlagRepository;
import com.returnflow.rrpms.repository.PickupRepository;
import com.returnflow.rrpms.repository.RefundRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FraudDetectionService {

    private static final int SERIAL_CHANGED_MIND_THRESHOLD = 5;
    private static final int SERIAL_CHANGED_MIND_WINDOW_DAYS = 30;
    private static final int REFUND_VELOCITY_THRESHOLD = 3;
    private static final int REFUND_VELOCITY_WINDOW_DAYS = 7;

    private final ReturnRequestRepository returnRequestRepository;
    private final RefundRepository refundRepository;
    private final FraudFlagRepository fraudFlagRepository;
    private final CustomerReturnStatsRepository customerReturnStatsRepository;
    private final PickupRepository pickupRepository;

    public void checkSerialChangedMind(ReturnRequest returnRequest) {
        if (!"CHANGED_MIND".equals(returnRequest.getReasonCode())) return;

        Instant windowStart = Instant.now().minus(SERIAL_CHANGED_MIND_WINDOW_DAYS, ChronoUnit.DAYS);
        long recentChangedMindCount = returnRequestRepository.findByCustomerId(returnRequest.getCustomerId()).stream()
                .filter(r -> "CHANGED_MIND".equals(r.getReasonCode()))
                .filter(r -> r.getInitiatedAt() != null && r.getInitiatedAt().isAfter(windowStart))
                .count();

        if (recentChangedMindCount > SERIAL_CHANGED_MIND_THRESHOLD && noOpenFlagExists(returnRequest)) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(returnRequest.getCustomerId())
                    .flagType("SERIAL_CHANGED_MIND_RETURNER")
                    .returnRequest(returnRequest)
                    .returnCount((int) recentChangedMindCount)
                    .build());
        }
    }

    public void checkQcMismatch(QcInspection inspection) {
        if (inspection.isComplaintValidated()) return;
        ReturnRequest returnRequest = inspection.getReturnRequest();
        if (!noOpenFlagExists(returnRequest)) return;

        fraudFlagRepository.save(FraudFlag.builder()
                .customerId(returnRequest.getCustomerId())
                .flagType("QC_COMPLAINT_MISMATCH")
                .returnRequest(returnRequest)
                .build());
    }

    public void checkRefundVelocity(Refund refund) {
        if (refund.getMethod() != RefundMethod.BANK_TRANSFER) return;
        String account = refund.getReturnRequest().getBankAccountNumber();
        if (account == null) return;

        Instant windowStart = Instant.now().minus(REFUND_VELOCITY_WINDOW_DAYS, ChronoUnit.DAYS);
        long recentCount = refundRepository.findAll().stream()
                .filter(r -> r.getMethod() == RefundMethod.BANK_TRANSFER)
                .filter(r -> r.getInitiatedAt() != null && r.getInitiatedAt().isAfter(windowStart))
                .filter(r -> r.getReturnRequest() != null && account.equals(r.getReturnRequest().getBankAccountNumber()))
                .count();

        ReturnRequest returnRequest = refund.getReturnRequest();
        if (recentCount > REFUND_VELOCITY_THRESHOLD && noOpenFlagExists(returnRequest)) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(returnRequest.getCustomerId())
                    .flagType("REFUND_VELOCITY")
                    .returnRequest(returnRequest)
                    .returnCount((int) recentCount)
                    .build());
        }
    }

    private static final BigDecimal RETURN_RATE_THRESHOLD = new BigDecimal("30");

    public void checkReturnRateThreshold(ReturnRequest returnRequest) {
        CustomerReturnStats stats = customerReturnStatsRepository.findByCustomerId(returnRequest.getCustomerId())
                .orElse(null);
        if (stats == null || stats.getTotalOrders() == null || stats.getTotalOrders() <= 0) return;

        int totalReturns = stats.getTotalReturns() + 1;
        BigDecimal rate = new BigDecimal(totalReturns)
                .divide(new BigDecimal(stats.getTotalOrders()), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));

        stats.setTotalReturns(totalReturns);
        stats.setReturnRate(rate);

        if (rate.compareTo(RETURN_RATE_THRESHOLD) > 0) {
            stats.setFlagged(true);
            if (noOpenFlagExists(returnRequest)) {
                fraudFlagRepository.save(FraudFlag.builder()
                        .customerId(returnRequest.getCustomerId())
                        .flagType("RETURN_RATE_THRESHOLD")
                        .returnRequest(returnRequest)
                        .returnCount(totalReturns)
                        .build());
            }
        }
        customerReturnStatsRepository.save(stats);
    }

    public void checkAddressPattern(com.returnflow.rrpms.entity.Pickup pickup) {
        String address = pickup.getPickupAddress();
        if (address == null || address.isBlank()) return;

        List<com.returnflow.rrpms.entity.Pickup> sameAddress = pickupRepository.findByPickupAddress(address);
        long distinctCustomers = sameAddress.stream()
                .map(p -> p.getReturnRequest().getCustomerId())
                .distinct()
                .count();

        ReturnRequest returnRequest = pickup.getReturnRequest();
        if (distinctCustomers > 1 && noOpenFlagExists(returnRequest)) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(returnRequest.getCustomerId())
                    .flagType("ADDRESS_PATTERN")
                    .returnRequest(returnRequest)
                    .returnCount((int) distinctCustomers)
                    .build());
        }
    }

    private boolean noOpenFlagExists(ReturnRequest returnRequest) {
        List<FraudFlag> existing = fraudFlagRepository.findByReturnRequestId(returnRequest.getId());
        return existing.stream().noneMatch(f -> f.getStatus() != com.returnflow.rrpms.enums.FraudFlagStatus.CLEARED);
    }
}
