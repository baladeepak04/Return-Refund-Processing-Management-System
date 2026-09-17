package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.service.FraudFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class FraudController {

    private final FraudFlagService fraudFlagService;

    @GetMapping("/returns/fraud-queue")
    public List<FraudFlag> fraudQueue() {
        return fraudFlagService.queue();
    }

    @PutMapping("/fraud/{id}/blacklist")
    public FraudFlag blacklist(@PathVariable UUID id) {
        return fraudFlagService.blacklist(id);
    }

    @PutMapping("/fraud/{id}/investigate")
    public FraudFlag investigate(@PathVariable UUID id) {
        return fraudFlagService.investigate(id);
    }

    @PutMapping("/fraud/{id}/clear")
    public FraudFlag clear(@PathVariable UUID id) {
        return fraudFlagService.clear(id);
    }

    @PutMapping("/fraud/customer-stats/{customerId}/total-orders")
    public com.returnflow.rrpms.entity.CustomerReturnStats setTotalOrders(
            @PathVariable UUID customerId, @RequestParam int totalOrders) {
        return fraudFlagService.setTotalOrders(customerId, totalOrders);
    }

    @GetMapping("/fraud/customer-stats")
    public List<com.returnflow.rrpms.entity.CustomerReturnStats> customerStats() {
        return fraudFlagService.listStats();
    }
}
