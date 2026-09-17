package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.service.LiquidationService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/liquidation")
@RequiredArgsConstructor
public class LiquidationController {

    private final LiquidationService liquidationService;

    @GetMapping
    public List<LiquidationBatch> list() {
        return liquidationService.list();
    }

    @PutMapping("/{id}/settle")
    public LiquidationBatch settle(@PathVariable UUID id, @RequestBody SettleRequest request) {
        return liquidationService.settle(id, request.payoutAmount());
    }

    @GetMapping(value = "/{id}/certificate", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    public org.springframework.http.ResponseEntity<byte[]> certificate(@PathVariable UUID id) {
        byte[] pdf = liquidationService.generateCertificatePdf(id);
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Disposition", "inline; filename=disposal-certificate-" + id + ".pdf")
                .body(pdf);
    }

    public record SettleRequest(@NotNull BigDecimal payoutAmount) {}
}
