package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.dto.InitiateRefundRequest;
import com.returnflow.rrpms.dto.RejectRefundRequest;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.service.RefundService;
import com.returnflow.rrpms.service.RefundSlaTrackingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;
    private final RefundSlaTrackingService refundSlaTrackingService;

    // Same identity-enforcement pattern as ReturnController — a CUSTOMER's
    // own ID always wins over the query param, so a customer can never read
    // another customer's refund amounts by changing customerId.
    private UUID resolveCustomerId(UUID requested) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            return u.getId();
        }
        return requested;
    }

    @PostMapping
    public Refund initiate(@Valid @RequestBody InitiateRefundRequest request) {
        return refundService.initiate(request);
    }

    @GetMapping
    public List<Refund> list(@RequestParam(required = false) UUID customerId) {
        UUID resolved = resolveCustomerId(customerId);
        return resolved != null ? refundService.listByCustomer(resolved) : refundService.list();
    }

    // Same identity-enforcement pattern as list()/resolveCustomerId — but
    // as a direct ownership check rather than a customerId-rewrite, since
    // a single-resource GET has no query param to rewrite. Only ever
    // enforced for the CUSTOMER role; every other role passes through
    // unchanged, matching resolveCustomerId's own behavior.
    private void assertOwnedByCallerIfCustomer(UUID resourceCustomerId, String notFoundMessage) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            if (resourceCustomerId == null || !u.getId().equals(resourceCustomerId)) {
                throw new com.returnflow.rrpms.exception.NotFoundException(notFoundMessage);
            }
        }
    }

    @GetMapping("/{id}")
    public Refund get(@PathVariable UUID id) {
        Refund refund = refundService.get(id);
        assertOwnedByCallerIfCustomer(
                refund.getReturnRequest() != null ? refund.getReturnRequest().getCustomerId() : null,
                "Refund not found: " + id);
        return refund;
    }

    @GetMapping("/{id}/sla-status")
    public java.util.Map<String, Object> slaStatus(@PathVariable UUID id) {
        return java.util.Map.of("refundId", id, "withinSla", refundSlaTrackingService.isWithinSla(id));
    }

    @PutMapping("/{id}/approve")
    public Refund approve(@PathVariable UUID id) {
        return refundService.approve(id);
    }

    @PutMapping("/{id}/reject")
    public Refund reject(@PathVariable UUID id, @RequestBody(required = false) RejectRefundRequest request) {
        return refundService.reject(id, request != null ? request.reason() : null);
    }

    @PutMapping("/{id}/credited")
    public Refund markCredited(@PathVariable UUID id) {
        return refundService.markCredited(id);
    }
}
