package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.Pickup;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.repository.PickupRepository;
import com.returnflow.rrpms.repository.RefundRepository;
import com.returnflow.rrpms.service.RefundService;
import com.returnflow.rrpms.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Webhook Controller conforming to Section 3.1.4 and Appendices E.1, E.2 of SRS-29:
 * - Razorpay Webhook (refund status: refund.processed, refund.failed)
 * - Logistics Webhook (3PL status: pickup.completed, in_transit, delivered_to_warehouse)
 */
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final RefundService refundService;
    private final RefundRepository refundRepository;
    private final ReturnRequestService returnRequestService;
    private final PickupRepository pickupRepository;

    /**
     * Razorpay refund webhook handler (Appendix E.1)
     */
    @PostMapping("/razorpay")
    public ResponseEntity<Map<String, Object>> handleRazorpayWebhook(@RequestBody Map<String, Object> payload) {
        String event = (String) payload.get("event");
        log.info("Received Razorpay webhook event: {}", event);

        // Resolve refund ID either from top-level or nested Razorpay payload
        String refundIdStr = (String) payload.get("refundId");
        String razorpayRefundId = null;

        if (payload.get("payload") instanceof Map<?, ?> pMap) {
            if (pMap.get("refund") instanceof Map<?, ?> rMap) {
                if (rMap.get("entity") instanceof Map<?, ?> entity) {
                    razorpayRefundId = (String) entity.get("id");
                }
            }
        }

        Optional<Refund> targetRefund = Optional.empty();
        if (refundIdStr != null) {
            try {
                targetRefund = refundRepository.findById(UUID.fromString(refundIdStr));
            } catch (Exception ignored) {}
        }
        if (targetRefund.isEmpty() && razorpayRefundId != null) {
            targetRefund = refundRepository.findByRazorpayRefundId(razorpayRefundId);
        }

        if (targetRefund.isPresent()) {
            UUID id = targetRefund.get().getId();
            if ("refund.processed".equalsIgnoreCase(event)) {
                refundService.markCredited(id);
                log.info("Webhook marked refund {} as CREDITED", id);
            } else if ("refund.failed".equalsIgnoreCase(event)) {
                refundService.reject(id, "Razorpay processing failed via webhook callback");
                log.info("Webhook marked refund {} as FAILED", id);
            }
        } else {
            log.warn("Razorpay webhook refund not found in system (refundId={}, rzpId={})", refundIdStr, razorpayRefundId);
        }

        return ResponseEntity.ok(Map.of("status", "ok", "event", event != null ? event : "unknown"));
    }

    /**
     * 3PL Reverse Logistics webhook handler (Appendix E.2)
     */
    @PostMapping("/logistics")
    public ResponseEntity<Map<String, Object>> handleLogisticsWebhook(@RequestBody Map<String, Object> payload) {
        String event = (String) payload.get("event");
        String returnIdStr = (String) payload.get("returnId");
        String awb = (String) payload.get("awb");

        log.info("Received 3PL logistics webhook event: {} (returnId={}, awb={})", event, returnIdStr, awb);

        UUID returnId = null;
        if (returnIdStr != null) {
            try {
                returnId = UUID.fromString(returnIdStr);
            } catch (Exception ignored) {}
        }

        if (returnId == null && awb != null) {
            Optional<Pickup> pickup = pickupRepository.findByAwbNumber(awb);
            if (pickup.isPresent() && pickup.get().getReturnRequest() != null) {
                returnId = pickup.get().getReturnRequest().getId();
            }
        }

        if (returnId != null) {
            if ("pickup.completed".equalsIgnoreCase(event) || "picked_up".equalsIgnoreCase(event)) {
                returnRequestService.markPickedUp(returnId);
            } else if ("in_transit".equalsIgnoreCase(event)) {
                returnRequestService.markInTransit(returnId);
            } else if ("delivered_to_warehouse".equalsIgnoreCase(event) || "item_received".equalsIgnoreCase(event)) {
                returnRequestService.markDeliveredToWarehouse(returnId);
            }
            log.info("Logistics webhook transitioned return {} via event {}", returnId, event);
        } else {
            log.warn("Logistics webhook return ID could not be resolved (awb={})", awb);
        }

        return ResponseEntity.ok(Map.of("status", "ok", "event", event != null ? event : "unknown"));
    }
}
