package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.LiquidationStatus;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.LiquidationBatchRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LiquidationServiceTest {

    @Mock private LiquidationBatchRepository repository;
    @InjectMocks private LiquidationService liquidationService;

    @Test
    void routeFromInspection_isNoOp_forRestockDisposition() {
        QcInspection qc = QcInspection.builder().disposition(Disposition.RESTOCK_NEW).build();

        liquidationService.routeFromInspection(qc);

        verify(repository, never()).save(any());
    }

    @Test
    void routeFromInspection_marksWrittenOff_withAmount_forDispose() {
        QcInspection qc = QcInspection.builder().id(UUID.randomUUID()).disposition(Disposition.DISPOSE).build();

        liquidationService.routeFromInspection(qc);

        ArgumentCaptor<LiquidationBatch> captor = ArgumentCaptor.forClass(LiquidationBatch.class);
        verify(repository).save(captor.capture());
        LiquidationBatch saved = captor.getValue();
        assertThat(saved.isWrittenOff()).isTrue();
        assertThat(saved.getWriteOffAmount()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(LiquidationStatus.PREPARED);
        assertThat(saved.getCertificateNumber()).isNotNull().startsWith("CERT-");
    }

    @Test
    void routeFromInspection_leavesWriteOffFalseAndNull_forLiquidate() {
        QcInspection qc = QcInspection.builder().id(UUID.randomUUID()).disposition(Disposition.LIQUIDATE).build();

        liquidationService.routeFromInspection(qc);

        ArgumentCaptor<LiquidationBatch> captor = ArgumentCaptor.forClass(LiquidationBatch.class);
        verify(repository).save(captor.capture());
        LiquidationBatch saved = captor.getValue();
        assertThat(saved.isWrittenOff()).isFalse();
        assertThat(saved.getWriteOffAmount()).isNull();
        assertThat(saved.getCertificateNumber()).isNull();
    }

    @Test
    void settle_setsStatusSettled_andPayoutAmount() {
        UUID id = UUID.randomUUID();
        LiquidationBatch batch = LiquidationBatch.builder().id(id).status(LiquidationStatus.PREPARED).build();
        when(repository.findById(id)).thenReturn(java.util.Optional.of(batch));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LiquidationBatch result = liquidationService.settle(id, new BigDecimal("1500"));

        assertThat(result.getStatus()).isEqualTo(LiquidationStatus.SETTLED);
        assertThat(result.getPayoutAmount()).isEqualTo(new BigDecimal("1500"));
    }

    @Test
    void settle_throwsNotFound_whenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> liquidationService.settle(id, BigDecimal.TEN))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void generateCertificatePdf_producesRealPdfBytes_forWrittenOffBatch() {
        UUID id = UUID.randomUUID();
        LiquidationBatch batch = LiquidationBatch.builder()
                .id(id).certificateNumber("CERT-2026-08-30-ABC12345")
                .partnerName("Certified Disposal Partner (mock)")
                .batchDate(java.time.LocalDate.now())
                .writeOffAmount(new BigDecimal("1500")).build();
        when(repository.findById(id)).thenReturn(java.util.Optional.of(batch));

        byte[] pdf = liquidationService.generateCertificatePdf(id);

        assertThat(pdf).isNotEmpty();
        // Real PDF files start with the %PDF- magic bytes.
        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    @Test
    void generateCertificatePdf_throwsIllegalState_whenBatchHasNoCertificate() {
        UUID id = UUID.randomUUID();
        LiquidationBatch batch = LiquidationBatch.builder().id(id).certificateNumber(null).build();
        when(repository.findById(id)).thenReturn(java.util.Optional.of(batch));

        assertThatThrownBy(() -> liquidationService.generateCertificatePdf(id))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void generateCertificatePdf_throwsNotFound_whenBatchMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> liquidationService.generateCertificatePdf(id))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void routeFromInspection_mergesIntoExistingOpenBatch_forSamePartnerSameWeek() {
        LiquidationBatch existingBatch = LiquidationBatch.builder()
                .id(UUID.randomUUID())
                .partnerName("Liquidation Partner (mock)")
                .itemsJson("[{\"qcId\":\"11111111-1111-1111-1111-111111111111\"}]")
                .batchDate(java.time.LocalDate.now())
                .status(LiquidationStatus.PREPARED)
                .build();
        when(repository.findByPartnerNameAndStatus("Liquidation Partner (mock)", LiquidationStatus.PREPARED))
                .thenReturn(java.util.List.of(existingBatch));
        QcInspection qc = QcInspection.builder().id(UUID.randomUUID()).disposition(Disposition.LIQUIDATE).build();

        liquidationService.routeFromInspection(qc);

        // Merged into the existing row — no second batch created.
        ArgumentCaptor<LiquidationBatch> captor = ArgumentCaptor.forClass(LiquidationBatch.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(existingBatch.getId());
        assertThat(captor.getValue().getItemsJson()).contains("11111111-1111-1111-1111-111111111111");
        assertThat(captor.getValue().getItemsJson()).contains(qc.getId().toString());
    }

    @Test
    void routeFromInspection_accumulatesWriteOffAmount_whenMergingDisposeItems() {
        LiquidationBatch existingBatch = LiquidationBatch.builder()
                .id(UUID.randomUUID())
                .partnerName("Certified Disposal Partner (mock)")
                .itemsJson("[{\"qcId\":\"11111111-1111-1111-1111-111111111111\"}]")
                .batchDate(java.time.LocalDate.now())
                .status(LiquidationStatus.PREPARED)
                .writtenOff(true)
                .writeOffAmount(new BigDecimal("2000"))
                .certificateNumber("CERT-EXISTING")
                .build();
        when(repository.findByPartnerNameAndStatus("Certified Disposal Partner (mock)", LiquidationStatus.PREPARED))
                .thenReturn(java.util.List.of(existingBatch));
        QcInspection qc = QcInspection.builder().id(UUID.randomUUID()).disposition(Disposition.DISPOSE).build();

        liquidationService.routeFromInspection(qc);

        ArgumentCaptor<LiquidationBatch> captor = ArgumentCaptor.forClass(LiquidationBatch.class);
        verify(repository).save(captor.capture());
        // 2000 (existing) + this item's own mock write-off amount, both real.
        assertThat(captor.getValue().getWriteOffAmount()).isGreaterThan(new BigDecimal("2000"));
        // Reuses the existing certificate — one per weekly manifest, not per item.
        assertThat(captor.getValue().getCertificateNumber()).isEqualTo("CERT-EXISTING");
    }

    @Test
    void routeFromInspection_createsNewBatch_whenNoOpenBatchExistsThisWeekForPartner() {
        when(repository.findByPartnerNameAndStatus(any(), any())).thenReturn(java.util.List.of());
        QcInspection qc = QcInspection.builder().id(UUID.randomUUID()).disposition(Disposition.LIQUIDATE).build();

        liquidationService.routeFromInspection(qc);

        ArgumentCaptor<LiquidationBatch> captor = ArgumentCaptor.forClass(LiquidationBatch.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getItemsJson()).contains(qc.getId().toString());
    }
}
