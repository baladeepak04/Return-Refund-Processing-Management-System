package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.integration.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    private UUID resolveCustomerId(UUID requested) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User u && u.getRole() == Role.CUSTOMER) {
            return u.getId();
        }
        return requested;
    }

    @GetMapping
    public List<OrderService.FullOrderDetails> listOrders(@RequestParam(required = false) UUID customerId) {
        UUID resolved = resolveCustomerId(customerId);
        return orderService.listOrders(resolved);
    }

    @GetMapping("/{orderId}")
    public OrderService.FullOrderDetails getOrder(@PathVariable String orderId) {
        return orderService.getFullOrder(orderId);
    }
}
