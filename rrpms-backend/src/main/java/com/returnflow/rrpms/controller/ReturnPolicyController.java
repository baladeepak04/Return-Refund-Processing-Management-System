package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.dto.ReturnPolicyRequest;
import com.returnflow.rrpms.dto.UpdatePolicyRequest;
import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.service.ReturnPolicyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/policies")
@RequiredArgsConstructor
public class ReturnPolicyController {

    private final ReturnPolicyService service;

    @GetMapping
    public List<ReturnPolicy> list() {
        return service.listAll();
    }

    @PostMapping
    public ReturnPolicy create(@Valid @RequestBody ReturnPolicyRequest request) {
        return service.create(request);
    }

    @GetMapping("/{id}")
    public ReturnPolicy get(@PathVariable UUID id) {
        return service.get(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PutMapping("/{id}")
    public ReturnPolicy update(@PathVariable UUID id, @Valid @RequestBody UpdatePolicyRequest request) {
        return service.update(id, request);
    }
}
