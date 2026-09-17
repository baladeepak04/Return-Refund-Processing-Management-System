package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.dto.QcInspectionRequest;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.service.QcInspectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/qc")
@RequiredArgsConstructor
public class QcController {

    private final QcInspectionService qcInspectionService;

    // Same identity-enforcement pattern as ReturnController/RefundController.
    private UUID resolveCustomerId(UUID requested) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            return u.getId();
        }
        return requested;
    }

    // Same pattern as ReturnController — direct ownership check for a
    // single-resource GET.
    private void assertOwnedByCallerIfCustomer(UUID resourceCustomerId, String notFoundMessage) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            if (resourceCustomerId == null || !u.getId().equals(resourceCustomerId)) {
                throw new com.returnflow.rrpms.exception.NotFoundException(notFoundMessage);
            }
        }
    }

    @PostMapping
    public QcInspection submit(@Valid @RequestBody QcInspectionRequest request, @AuthenticationPrincipal User inspector) {
        return qcInspectionService.submit(request, inspector);
    }

    @GetMapping
    public List<QcInspection> list(@RequestParam(required = false) UUID customerId) {
        UUID resolved = resolveCustomerId(customerId);
        return resolved != null ? qcInspectionService.listByCustomer(resolved) : qcInspectionService.list();
    }

    @GetMapping("/{id}")
    public QcInspection get(@PathVariable UUID id) {
        QcInspection inspection = qcInspectionService.get(id);
        assertOwnedByCallerIfCustomer(
                inspection.getReturnRequest() != null ? inspection.getReturnRequest().getCustomerId() : null,
                "QC inspection not found: " + id);
        return inspection;
    }
}
