package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.RestockedItem;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.RefundStatus;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private QcInspectionRepository qcInspectionRepository;
    @Mock private FraudFlagRepository fraudFlagRepository;
    @Mock private RtmBatchRepository rtmBatchRepository;
    @Mock private LiquidationBatchRepository liquidationBatchRepository;
    @Mock private RestockedItemRepository restockedItemRepository;
    @InjectMocks private AnalyticsService analyticsService;

    private Instant atLocalDate(LocalDate date) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    @Test
    void returnAnalytics_excludesReturnsOutsideDateRange() {
        ReturnRequest inRange = ReturnRequest.builder()
                .reasonCode("CHANGED_MIND").status(ReturnStatus.INITIATED)
                .initiatedAt(atLocalDate(LocalDate.of(2026, 6, 15))).build();
        ReturnRequest tooEarly = ReturnRequest.builder()
                .reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED)
                .initiatedAt(atLocalDate(LocalDate.of(2026, 1, 1))).build();
        ReturnRequest tooLate = ReturnRequest.builder()
                .reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED)
                .initiatedAt(atLocalDate(LocalDate.of(2026, 12, 31))).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(inRange, tooEarly, tooLate));

        Map<String, Object> result = analyticsService.returnAnalytics(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), null);

        assertThat(result.get("totalReturns")).isEqualTo(1);
    }

    @Test
    void returnAnalytics_includesAllReturns_whenNoDateRangeGiven() {
        ReturnRequest r1 = ReturnRequest.builder().reasonCode("CHANGED_MIND").status(ReturnStatus.INITIATED).initiatedAt(Instant.now()).build();
        ReturnRequest r2 = ReturnRequest.builder().reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED).initiatedAt(Instant.now().minus(400, ChronoUnit.DAYS)).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(r1, r2));

        Map<String, Object> result = analyticsService.returnAnalytics(null, null, null);

        assertThat(result.get("totalReturns")).isEqualTo(2);
    }

    @Test
    void returnAnalytics_groupsByReasonAndStatus() {
        ReturnRequest r1 = ReturnRequest.builder().reasonCode("CHANGED_MIND").status(ReturnStatus.INITIATED).initiatedAt(Instant.now()).build();
        ReturnRequest r2 = ReturnRequest.builder().reasonCode("CHANGED_MIND").status(ReturnStatus.REFUNDED).initiatedAt(Instant.now()).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(r1, r2));

        Map<String, Object> result = analyticsService.returnAnalytics(null, null, null);

        @SuppressWarnings("unchecked")
        Map<String, Long> byReason = (Map<String, Long>) result.get("byReason");
        assertThat(byReason.get("CHANGED_MIND")).isEqualTo(2L);
    }

    @Test
    void returnAnalytics_groupsByCategoryOrSeller_usingRealPolicyData() {
        com.returnflow.rrpms.entity.ReturnPolicy electronicsPolicy = com.returnflow.rrpms.entity.ReturnPolicy.builder()
                .entityType(com.returnflow.rrpms.enums.PolicyEntityType.CATEGORY).entityRef("Electronics").build();
        ReturnRequest r1 = ReturnRequest.builder().reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED)
                .initiatedAt(Instant.now()).policy(electronicsPolicy).build();
        ReturnRequest r2 = ReturnRequest.builder().reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED)
                .initiatedAt(Instant.now()).policy(electronicsPolicy).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(r1, r2));

        Map<String, Object> result = analyticsService.returnAnalytics(null, null, null);

        @SuppressWarnings("unchecked")
        Map<String, Long> byCategoryOrSeller = (Map<String, Long>) result.get("byCategoryOrSeller");
        assertThat(byCategoryOrSeller.get("CATEGORY:Electronics")).isEqualTo(2L);
    }

    @Test
    void returnAnalytics_skipsCategoryGrouping_whenPolicyMissing() {
        ReturnRequest noPolicy = ReturnRequest.builder().reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED)
                .initiatedAt(Instant.now()).policy(null).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(noPolicy));

        Map<String, Object> result = analyticsService.returnAnalytics(null, null, null);

        @SuppressWarnings("unchecked")
        Map<String, Long> byCategoryOrSeller = (Map<String, Long>) result.get("byCategoryOrSeller");
        assertThat(byCategoryOrSeller).isEmpty();
    }

    @Test
    void refundTatReport_computesAverageDaysFromCreditedRefunds() {
        Refund fastRefund = Refund.builder()
                .status(RefundStatus.CREDITED)
                .initiatedAt(Instant.now().minus(2, ChronoUnit.DAYS))
                .creditedAt(Instant.now()).build();
        when(refundRepository.findByStatus(RefundStatus.CREDITED)).thenReturn(List.of(fastRefund));

        Map<String, Object> result = analyticsService.refundTatReport();

        assertThat((Double) result.get("avgDays")).isCloseTo(2.0, org.assertj.core.data.Offset.offset(0.1));
        assertThat(result.get("slaBreachRatePercent")).isEqualTo(0.0);
    }

    @Test
    void refundTatReport_flagsSlaBreach_whenOverSevenDays() {
        Refund slowRefund = Refund.builder()
                .status(RefundStatus.CREDITED)
                .initiatedAt(Instant.now().minus(10, ChronoUnit.DAYS))
                .creditedAt(Instant.now()).build();
        when(refundRepository.findByStatus(RefundStatus.CREDITED)).thenReturn(List.of(slowRefund));

        Map<String, Object> result = analyticsService.refundTatReport();

        assertThat(result.get("slaBreachRatePercent")).isEqualTo(100.0);
    }

    @Test
    void refundTatReport_handlesNoCreditedRefunds_withoutError() {
        when(refundRepository.findByStatus(RefundStatus.CREDITED)).thenReturn(List.of());

        Map<String, Object> result = analyticsService.refundTatReport();

        assertThat(result.get("avgDays")).isEqualTo(0.0);
    }

    @Test
    void liquidationAnalytics_sumsWriteOffsAndRecoveryValueSeparately() {
        LiquidationBatch writtenOff = LiquidationBatch.builder().writtenOff(true).writeOffAmount(new BigDecimal("500")).build();
        LiquidationBatch notWrittenOff = LiquidationBatch.builder().writtenOff(false).payoutAmount(new BigDecimal("300")).build();
        when(liquidationBatchRepository.findAll()).thenReturn(List.of(writtenOff, notWrittenOff));
        RestockedItem restocked = RestockedItem.builder().newListingPrice(new BigDecimal("1200")).build();
        when(restockedItemRepository.findAll()).thenReturn(List.of(restocked));

        Map<String, Object> result = analyticsService.liquidationAnalytics();

        assertThat(result.get("totalWriteOffAmount")).isEqualTo(new BigDecimal("500"));
        assertThat(result.get("totalLiquidationPayout")).isEqualTo(new BigDecimal("300"));
        assertThat(result.get("totalRecoveryValue")).isEqualTo(new BigDecimal("1200"));
        assertThat(result.get("writtenOffCount")).isEqualTo(1);
    }

    @Test
    void returnAnalytics_filtersByChannel_whenChannelProvided() {
        ReturnRequest webReturn = ReturnRequest.builder()
                .reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED).initiatedAt(Instant.now())
                .salesChannel(com.returnflow.rrpms.enums.SalesChannel.WEB).build();
        ReturnRequest appReturn = ReturnRequest.builder()
                .reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED).initiatedAt(Instant.now())
                .salesChannel(com.returnflow.rrpms.enums.SalesChannel.MOBILE_APP).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(webReturn, appReturn));

        Map<String, Object> result = analyticsService.returnAnalytics(null, null, com.returnflow.rrpms.enums.SalesChannel.WEB);

        assertThat(result.get("totalReturns")).isEqualTo(1);
    }

    @Test
    void returnAnalytics_includesAllChannels_whenNoChannelFilterGiven() {
        ReturnRequest webReturn = ReturnRequest.builder()
                .reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED).initiatedAt(Instant.now())
                .salesChannel(com.returnflow.rrpms.enums.SalesChannel.WEB).build();
        ReturnRequest appReturn = ReturnRequest.builder()
                .reasonCode("DEFECTIVE").status(ReturnStatus.INITIATED).initiatedAt(Instant.now())
                .salesChannel(com.returnflow.rrpms.enums.SalesChannel.MOBILE_APP).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(webReturn, appReturn));

        Map<String, Object> result = analyticsService.returnAnalytics(null, null, null);

        @SuppressWarnings("unchecked")
        Map<String, Long> byChannel = (Map<String, Long>) result.get("byChannel");
        assertThat(byChannel.get("WEB")).isEqualTo(1L);
        assertThat(byChannel.get("MOBILE_APP")).isEqualTo(1L);
    }

    @Test
    void satisfactionAnalytics_computesAverageFromRatedReturnsOnly() {
        ReturnRequest rated4 = ReturnRequest.builder().satisfactionRating(4).build();
        ReturnRequest rated2 = ReturnRequest.builder().satisfactionRating(2).build();
        ReturnRequest unrated = ReturnRequest.builder().satisfactionRating(null).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(rated4, rated2, unrated));

        Map<String, Object> result = analyticsService.satisfactionAnalytics();

        assertThat(result.get("totalResponses")).isEqualTo(2);
        assertThat(result.get("averageRating")).isEqualTo(3.0);
    }

    @Test
    void satisfactionAnalytics_handlesNoResponses_withoutError() {
        when(returnRequestRepository.findAll()).thenReturn(List.of());

        Map<String, Object> result = analyticsService.satisfactionAnalytics();

        assertThat(result.get("totalResponses")).isEqualTo(0);
        assertThat(result.get("averageRating")).isEqualTo(0.0);
        assertThat(result.get("npsScore")).isEqualTo(0.0);
    }

    @Test
    void satisfactionAnalytics_computesRealNpsScore_fromPromotersAndDetractors() {
        // 2 promoters (9,10), 1 passive (7), 1 detractor (3) — 10 responses total.
        var responses = new java.util.ArrayList<ReturnRequest>();
        responses.add(ReturnRequest.builder().satisfactionRating(9).build());
        responses.add(ReturnRequest.builder().satisfactionRating(10).build());
        responses.add(ReturnRequest.builder().satisfactionRating(7).build());
        responses.add(ReturnRequest.builder().satisfactionRating(3).build());
        for (int i = 0; i < 6; i++) responses.add(ReturnRequest.builder().satisfactionRating(8).build());
        when(returnRequestRepository.findAll()).thenReturn(responses);

        Map<String, Object> result = analyticsService.satisfactionAnalytics();

        // NPS = (2/10 * 100) - (1/10 * 100) = 20 - 10 = 10
        assertThat(result.get("npsScore")).isEqualTo(10.0);
        assertThat(result.get("promoters")).isEqualTo(2L);
        assertThat(result.get("detractors")).isEqualTo(1L);
        assertThat(result.get("passives")).isEqualTo(7L);
    }

    @Test
    void satisfactionAnalytics_scoreIsNegative_whenDetractorsOutnumberPromoters() {
        ReturnRequest promoter = ReturnRequest.builder().satisfactionRating(9).build();
        ReturnRequest detractor1 = ReturnRequest.builder().satisfactionRating(2).build();
        ReturnRequest detractor2 = ReturnRequest.builder().satisfactionRating(0).build();
        when(returnRequestRepository.findAll()).thenReturn(List.of(promoter, detractor1, detractor2));

        Map<String, Object> result = analyticsService.satisfactionAnalytics();

        // NPS = (1/3 * 100) - (2/3 * 100) = 33.3 - 66.7 = -33.3
        assertThat((Double) result.get("npsScore")).isNegative();
    }
}
