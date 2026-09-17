package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/returns")
    public Map<String, Object> returns(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) com.returnflow.rrpms.enums.SalesChannel channel) {
        return analyticsService.returnAnalytics(from, to, channel);
    }

    @GetMapping("/refund-tat")
    public Map<String, Object> refundTat() {
        return analyticsService.refundTatReport();
    }

    @GetMapping("/qc")
    public Map<String, Object> qc() {
        return analyticsService.qcAnalytics();
    }

    @GetMapping("/fraud")
    public Map<String, Object> fraud() {
        return analyticsService.fraudAnalytics();
    }

    @GetMapping("/supplier-rtm")
    public Map<String, Object> supplierRtm() {
        return analyticsService.supplierRtmSummary();
    }

    @GetMapping("/liquidation")
    public Map<String, Object> liquidation() {
        return analyticsService.liquidationAnalytics();
    }

    @GetMapping("/satisfaction")
    public Map<String, Object> satisfaction() {
        return analyticsService.satisfactionAnalytics();
    }
}
