package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.dto.CreateRtmBatchRequest;
import com.returnflow.rrpms.entity.RtmBatch;
import com.returnflow.rrpms.entity.SupplierReturn;
import com.returnflow.rrpms.service.RtmBatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RtmController {

    private final RtmBatchService rtmBatchService;

    @PostMapping("/rtm")
    public RtmBatch createBatch(@Valid @RequestBody CreateRtmBatchRequest request) {
        return rtmBatchService.createBatch(request);
    }

    @GetMapping("/rtm")
    public List<RtmBatch> list() {
        return rtmBatchService.list();
    }

    @PutMapping("/rtm/{id}/dispatch")
    public RtmBatch dispatch(@PathVariable UUID id) {
        return rtmBatchService.dispatch(id);
    }

    @PutMapping("/rtm/{id}/received")
    public RtmBatch markReceived(@PathVariable UUID id) {
        return rtmBatchService.markReceivedBySupplier(id);
    }

    @PutMapping("/rtm/{id}/settle")
    public RtmBatch settle(@PathVariable UUID id) {
        return rtmBatchService.settle(id);
    }

    @PutMapping("/rtm/{id}/dispute")
    public RtmBatch markDisputed(@PathVariable UUID id, @RequestParam(required = false) String notes) {
        return rtmBatchService.markDisputed(id, notes);
    }

    @PutMapping("/rtm/{id}/resolve-dispute")
    public RtmBatch resolveDispute(@PathVariable UUID id) {
        return rtmBatchService.resolveDispute(id);
    }

    @GetMapping("/supplier-returns")
    public List<SupplierReturn> supplierReturns() {
        return rtmBatchService.listSupplierReturns();
    }
}
