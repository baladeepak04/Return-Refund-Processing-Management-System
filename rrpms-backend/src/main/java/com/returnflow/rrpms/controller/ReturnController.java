package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.dto.InitiateReturnRequest;
import com.returnflow.rrpms.dto.OverrideReturnWindowRequest;
import com.returnflow.rrpms.dto.ReschedulePickupRequest;
import com.returnflow.rrpms.dto.SchedulePickupRequest;
import com.returnflow.rrpms.entity.Pickup;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.exception.OverrideNotPermittedException;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import com.returnflow.rrpms.service.ReturnRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnRequestService returnRequestService;
    private final ReturnPolicyRepository returnPolicyRepository;

    // A CUSTOMER caller's own ID always wins over whatever customerId was
    // passed in the query string — otherwise a customer could read another
    // customer's returns just by changing the param. Support/Admin/QC can
    // legitimately query for a specific customer, so this only overrides
    // for the CUSTOMER role.
    private UUID resolveCustomerId(UUID requested) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            return u.getId();
        }
        return requested;
    }

    // Same identity-enforcement pattern as resolveCustomerId, but as a
    // direct ownership check for a single-resource GET (no query param to
    // rewrite here). Only ever enforced for the CUSTOMER role.
    private void assertOwnedByCallerIfCustomer(UUID resourceCustomerId, String notFoundMessage) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            if (resourceCustomerId == null || !u.getId().equals(resourceCustomerId)) {
                throw new NotFoundException(notFoundMessage);
            }
        }
    }

    @PostMapping
    public ReturnRequest initiate(@Valid @RequestBody InitiateReturnRequest request) {
        if (request.overrideExtraDays() != null && request.overrideExtraDays() > 0) {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            Object principal = authentication != null ? authentication.getPrincipal() : null;
            Role role = (principal instanceof User u) ? u.getRole() : null;
            if (role != Role.CUSTOMER_SUPPORT && role != Role.ADMIN) {
                throw new OverrideNotPermittedException("Only support or admin can override the return window");
            }
        }
        return returnRequestService.initiate(request);
    }

    @PostMapping("/draft")
    public ReturnRequest saveDraft(@RequestBody InitiateReturnRequest request) {
        return returnRequestService.saveDraft(request);
    }

    @GetMapping("/drafts")
    public List<ReturnRequest> drafts(@RequestParam UUID customerId) {
        return returnRequestService.listDrafts(resolveCustomerId(customerId));
    }

    @PutMapping("/{id}/finalize")
    public ReturnRequest finalizeDraft(@PathVariable UUID id) {
        return returnRequestService.finalizeDraft(id);
    }

    @GetMapping
    public List<ReturnRequest> list(@RequestParam(required = false) UUID customerId) {
        UUID resolved = resolveCustomerId(customerId);
        return resolved != null ? returnRequestService.listByCustomer(resolved) : returnRequestService.list();
    }

    @GetMapping("/{id}")
    public ReturnRequest get(@PathVariable UUID id) {
        ReturnRequest returnRequest = returnRequestService.get(id);
        assertOwnedByCallerIfCustomer(returnRequest.getCustomerId(), "Return not found: " + id);
        return returnRequest;
    }

    @GetMapping("/overrides")
    public List<ReturnRequest> overrides() {
        return returnRequestService.listOverrides();
    }

    @PostMapping("/{id}/pickup")
    public Pickup schedulePickup(@PathVariable UUID id, @Valid @RequestBody SchedulePickupRequest request) {
        return returnRequestService.schedulePickup(id, request);
    }

    @PutMapping("/{id}/pickup/reschedule")
    public Pickup reschedulePickup(@PathVariable UUID id, @Valid @RequestBody ReschedulePickupRequest request) {
        return returnRequestService.reschedulePickup(id, request);
    }

    @PutMapping("/{id}/pickup/picked-up")
    public Pickup markPickedUp(@PathVariable UUID id) {
        return returnRequestService.markPickedUp(id);
    }

    @PutMapping("/{id}/pickup/in-transit")
    public Pickup markInTransit(@PathVariable UUID id) {
        return returnRequestService.markInTransit(id);
    }

    @PutMapping("/{id}/pickup/delivered")
    public Pickup markDelivered(@PathVariable UUID id) {
        return returnRequestService.markDeliveredToWarehouse(id);
    }

    @PutMapping("/{id}/pickup/failed")
    public Pickup markPickupFailed(@PathVariable UUID id) {
        return returnRequestService.markPickupFailed(id);
    }

    @PutMapping("/{id}/dropoff")
    public ReturnRequest confirmDropOff(@PathVariable UUID id) {
        return returnRequestService.confirmDropOff(id);
    }

    @GetMapping("/policies")
    public Object returnPolicies() {
        return returnPolicyRepository.findAll();
    }

    @PutMapping("/{id}/cancel")
    public ReturnRequest cancel(@PathVariable UUID id) {
        return returnRequestService.cancel(id);
    }

    @PutMapping("/{id}/override")
    public ReturnRequest override(@PathVariable UUID id, @Valid @RequestBody OverrideReturnWindowRequest request) {
        return returnRequestService.overrideReturnWindow(id, request);
    }

    @PutMapping("/{id}/exchange/dispatch")
    public ReturnRequest dispatchExchange(@PathVariable UUID id) {
        return returnRequestService.dispatchExchange(id);
    }

    @PutMapping("/{id}/satisfaction")
    public ReturnRequest submitSatisfaction(@PathVariable UUID id, @Valid @RequestBody com.returnflow.rrpms.dto.SatisfactionFeedbackRequest request) {
        return returnRequestService.submitSatisfactionFeedback(id, request.rating(), request.comment());
    }
}
