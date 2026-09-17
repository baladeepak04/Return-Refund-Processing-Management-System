package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.ReturnCommunication;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.repository.ReturnCommunicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/communications")
@RequiredArgsConstructor
public class CommunicationController {

    private final ReturnCommunicationRepository repository;

    // Same identity-enforcement pattern as Return/Refund/Qc controllers —
    // this endpoint had the exact same gap: a CUSTOMER could pass any
    // customerId and read another customer's notification history.
    private UUID resolveCustomerId(UUID requested) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            return u.getId();
        }
        return requested;
    }

    @GetMapping
    public List<ReturnCommunication> list(@RequestParam(required = false) UUID customerId) {
        UUID resolved = resolveCustomerId(customerId);
        if (resolved != null) {
            return repository.findByReturnRequest_CustomerIdOrderBySentAtDesc(resolved);
        }
        return repository.findAll().stream()
                .sorted(Comparator.comparing(ReturnCommunication::getSentAt).reversed())
                .collect(Collectors.toList());
    }
}
