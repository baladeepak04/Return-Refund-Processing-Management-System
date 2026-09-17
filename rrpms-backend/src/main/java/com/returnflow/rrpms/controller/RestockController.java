package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.RestockedItem;
import com.returnflow.rrpms.service.RestockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restock")
@RequiredArgsConstructor
public class RestockController {

    private final RestockService restockService;

    @GetMapping
    public List<RestockedItem> list() {
        return restockService.list();
    }

    @PutMapping("/{id}/approve")
    public RestockedItem approve(@PathVariable UUID id) {
        return restockService.approve(id);
    }
}
