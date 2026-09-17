package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.entity.RestockedItem;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.RefundStatus;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ReturnRequestRepository returnRequestRepository;
    private final RefundRepository refundRepository;
    private final QcInspectionRepository qcInspectionRepository;
    private final FraudFlagRepository fraudFlagRepository;
    private final RtmBatchRepository rtmBatchRepository;
    private final LiquidationBatchRepository liquidationBatchRepository;
    private final RestockedItemRepository restockedItemRepository;

    public Map<String, Object> returnAnalytics(java.time.LocalDate from, java.time.LocalDate to,
                                                com.returnflow.rrpms.enums.SalesChannel channel) {
        var returns = returnRequestRepository.findAll().stream()
                .filter(r -> inRange(r.getInitiatedAt(), from, to))
                .filter(r -> channel == null || r.getSalesChannel() == channel)
                .collect(Collectors.toList());
        Map<String, Long> byReason = returns.stream()
                .collect(Collectors.groupingBy(r -> r.getReasonCode(), Collectors.counting()));
        Map<String, Long> byStatus = returns.stream()
                .collect(Collectors.groupingBy(r -> r.getStatus().name(), Collectors.counting()));
        Map<String, Long> byCategoryOrSeller = returns.stream()
                .filter(r -> r.getPolicy() != null && r.getPolicy().getEntityRef() != null)
                .collect(Collectors.groupingBy(
                        r -> r.getPolicy().getEntityType() + ":" + r.getPolicy().getEntityRef(),
                        Collectors.counting()));
        Map<String, Long> byChannel = returns.stream()
                .collect(Collectors.groupingBy(r -> r.getSalesChannel().name(), Collectors.counting()));
        return Map.of(
                "totalReturns", returns.size(),
                "byReason", byReason,
                "byStatus", byStatus,
                "byCategoryOrSeller", byCategoryOrSeller,
                "byChannel", byChannel
        );
    }

    public Map<String, Object> refundTatReport() {
        var refunds = refundRepository.findByStatus(RefundStatus.CREDITED);
        var tats = refunds.stream()
                .filter(r -> r.getCreditedAt() != null)
                .map(r -> Duration.between(r.getInitiatedAt(), r.getCreditedAt()).toHours() / 24.0)
                .collect(Collectors.toList());
        double avg = tats.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        List<Double> sorted = tats.stream().sorted().collect(Collectors.toList());
        double p95 = sorted.isEmpty() ? 0 : sorted.get((int) Math.min(sorted.size() - 1, Math.ceil(sorted.size() * 0.95) - 1));
        double slaBreachRate = tats.isEmpty() ? 0 : tats.stream().filter(t -> t > 7).count() * 100.0 / tats.size();
        return Map.of("avgDays", avg, "p95Days", p95, "slaBreachRatePercent", slaBreachRate, "assumedSlaDays", 7);
    }

    public Map<String, Object> qcAnalytics() {
        var inspections = qcInspectionRepository.findAll();
        Map<String, Long> byGrade = inspections.stream()
                .collect(Collectors.groupingBy(i -> i.getConditionGrade().name(), Collectors.counting()));
        Map<String, Long> byDisposition = inspections.stream()
                .collect(Collectors.groupingBy(i -> i.getDisposition().name(), Collectors.counting()));
        return Map.of("total", inspections.size(), "byGrade", byGrade, "byDisposition", byDisposition);
    }

    public Map<String, Object> fraudAnalytics() {
        var flags = fraudFlagRepository.findAll();
        Map<String, Long> byStatus = flags.stream()
                .collect(Collectors.groupingBy(f -> f.getStatus().name(), Collectors.counting()));
        return Map.of("totalFlags", flags.size(), "byStatus", byStatus);
    }

    public Map<String, Object> supplierRtmSummary() {
        var batches = rtmBatchRepository.findAll();
        Map<String, Long> byStatus = batches.stream()
                .collect(Collectors.groupingBy(b -> b.getStatus().name(), Collectors.counting()));
        var totalCreditNoteValue = batches.stream()
                .map(b -> b.getCreditNoteValue())
                .filter(java.util.Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        return Map.of("totalBatches", batches.size(), "byStatus", byStatus, "totalCreditNoteValue", totalCreditNoteValue);
    }

    public Map<String, Object> liquidationAnalytics() {
        var batches = liquidationBatchRepository.findAll();
        var writeOffs = batches.stream().filter(LiquidationBatch::isWrittenOff).toList();
        var totalWriteOff = writeOffs.stream().map(LiquidationBatch::getWriteOffAmount)
                .filter(java.util.Objects::nonNull).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        var totalPayout = batches.stream().map(LiquidationBatch::getPayoutAmount)
                .filter(java.util.Objects::nonNull).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        var restocked = restockedItemRepository.findAll();
        var totalRecoveryValue = restocked.stream().map(RestockedItem::getNewListingPrice)
                .filter(java.util.Objects::nonNull).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        return Map.of(
                "totalBatches", batches.size(),
                "writtenOffCount", writeOffs.size(),
                "totalWriteOffAmount", totalWriteOff,
                "totalLiquidationPayout", totalPayout,
                "restockedItemCount", restocked.size(),
                "totalRecoveryValue", totalRecoveryValue
        );
    }

    public Map<String, Object> satisfactionAnalytics() {
        var rated = returnRequestRepository.findAll().stream()
                .filter(r -> r.getSatisfactionRating() != null)
                .collect(Collectors.toList());
        int total = rated.size();
        long promoters = rated.stream().filter(r -> r.getSatisfactionRating() >= 9).count();
        long passives = rated.stream().filter(r -> r.getSatisfactionRating() >= 7 && r.getSatisfactionRating() <= 8).count();
        long detractors = rated.stream().filter(r -> r.getSatisfactionRating() <= 6).count();
        double npsScore = total == 0 ? 0.0
                : ((double) promoters / total * 100) - ((double) detractors / total * 100);
        double avgRating = rated.stream().mapToInt(ReturnRequest::getSatisfactionRating).average().orElse(0.0);
        Map<Integer, Long> distribution = rated.stream()
                .collect(Collectors.groupingBy(ReturnRequest::getSatisfactionRating, Collectors.counting()));
        return Map.of(
                "totalResponses", total,
                "npsScore", Math.round(npsScore * 10.0) / 10.0,
                "promoters", promoters,
                "passives", passives,
                "detractors", detractors,
                "averageRating", Math.round(avgRating * 100.0) / 100.0,
                "distribution", distribution
        );
    }

    private boolean inRange(Instant timestamp, java.time.LocalDate from, java.time.LocalDate to) {
        if (timestamp == null) return from == null && to == null;
        var date = timestamp.atZone(java.time.ZoneOffset.UTC).toLocalDate();
        if (from != null && date.isBefore(from)) return false;
        if (to != null && date.isAfter(to)) return false;
        return true;
    }
}
