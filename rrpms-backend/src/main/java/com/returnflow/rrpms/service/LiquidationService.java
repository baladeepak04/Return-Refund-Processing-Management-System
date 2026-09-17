package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.LiquidationStatus;
import com.returnflow.rrpms.repository.LiquidationBatchRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiquidationService {

    private final LiquidationBatchRepository repository;

    public void routeFromInspection(QcInspection qc) {
        if (qc.getDisposition() != Disposition.LIQUIDATE && qc.getDisposition() != Disposition.DISPOSE) {
            return;
        }
        String partner = qc.getDisposition() == Disposition.LIQUIDATE ? "Liquidation Partner (mock)" : "Certified Disposal Partner (mock)";
        boolean isWriteOff = qc.getDisposition() == Disposition.DISPOSE;
        java.math.BigDecimal itemWriteOff = isWriteOff
                ? new java.math.BigDecimal(1000 + (Math.abs(qc.getId().hashCode()) % 9000)) : null;

        LiquidationBatch existing = findOpenBatchForPartnerThisWeek(partner);
        if (existing != null) {
            mergeItemInto(existing, qc, isWriteOff, itemWriteOff);
            repository.save(existing);
            return;
        }

        LiquidationBatch batch = LiquidationBatch.builder()
                .partnerName(partner)
                .itemsJson("[{\"qcId\":\"" + qc.getId() + "\"}]")
                .batchDate(LocalDate.now())
                .status(LiquidationStatus.PREPARED)
                .writtenOff(isWriteOff)
                .writeOffAmount(itemWriteOff)
                .certificateNumber(isWriteOff ? newCertificateNumber() : null)
                .build();
        repository.save(batch);
    }

    private LiquidationBatch findOpenBatchForPartnerThisWeek(String partnerName) {
        int thisWeek = LocalDate.now().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int thisWeekYear = LocalDate.now().get(IsoFields.WEEK_BASED_YEAR);
        return repository.findByPartnerNameAndStatus(partnerName, LiquidationStatus.PREPARED).stream()
                .filter(b -> b.getBatchDate() != null
                        && b.getBatchDate().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR) == thisWeek
                        && b.getBatchDate().get(IsoFields.WEEK_BASED_YEAR) == thisWeekYear)
                .findFirst().orElse(null);
    }

    private void mergeItemInto(LiquidationBatch batch, QcInspection qc, boolean isWriteOff, java.math.BigDecimal itemWriteOff) {
        String items = batch.getItemsJson();
        String newFragment = "{\"qcId\":\"" + qc.getId() + "\"}";
        batch.setItemsJson(items == null || items.isBlank() || items.equals("[]")
                ? "[" + newFragment + "]"
                : items.substring(0, items.length() - 1) + "," + newFragment + "]");

        if (isWriteOff) {
            batch.setWrittenOff(true);
            java.math.BigDecimal running = batch.getWriteOffAmount() != null ? batch.getWriteOffAmount() : java.math.BigDecimal.ZERO;
            batch.setWriteOffAmount(running.add(itemWriteOff));
            if (batch.getCertificateNumber() == null) {
                batch.setCertificateNumber(newCertificateNumber());
            }
        }
    }

    private String newCertificateNumber() {
        return "CERT-" + LocalDate.now() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public List<LiquidationBatch> list() {
        return repository.findAll();
    }

    public LiquidationBatch settle(UUID id, java.math.BigDecimal payoutAmount) {
        LiquidationBatch batch = repository.findById(id)
                .orElseThrow(() -> new com.returnflow.rrpms.exception.NotFoundException("Liquidation batch not found: " + id));
        batch.setPayoutAmount(payoutAmount);
        batch.setStatus(LiquidationStatus.SETTLED);
        return repository.save(batch);
    }

    public LiquidationBatch get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new com.returnflow.rrpms.exception.NotFoundException("Liquidation batch not found: " + id));
    }

    public byte[] generateCertificatePdf(UUID id) {
        LiquidationBatch batch = get(id);
        if (batch.getCertificateNumber() == null) {
            throw new IllegalStateException("This batch has no disposal certificate — it was not a DISPOSE write-off");
        }
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 750;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA_BOLD, 18);
                content.newLineAtOffset(60, y);
                content.showText("Certificate of Disposal");
                content.endText();

                y -= 40;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 11);
                content.newLineAtOffset(60, y);
                content.showText("Certificate Number: " + batch.getCertificateNumber());
                content.endText();

                y -= 22;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 11);
                content.newLineAtOffset(60, y);
                content.showText("Disposal Partner: " + batch.getPartnerName());
                content.endText();

                y -= 22;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 11);
                content.newLineAtOffset(60, y);
                content.showText("Batch Date: " + batch.getBatchDate());
                content.endText();

                y -= 22;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 11);
                content.newLineAtOffset(60, y);
                content.showText("Write-off Amount: " + (batch.getWriteOffAmount() != null ? batch.getWriteOffAmount().toString() : "N/A"));
                content.endText();

                y -= 40;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA_OBLIQUE, 9);
                content.newLineAtOffset(60, y);
                content.showText("This certifies that the item(s) referenced by this batch have been disposed of");
                content.endText();
                y -= 14;
                content.beginText();
                content.setFont(PDType1Font.HELVETICA_OBLIQUE, 9);
                content.newLineAtOffset(60, y);
                content.showText("in accordance with applicable regulations. Generated by RRPMS.");
                content.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate disposal certificate PDF", e);
        }
    }
}
