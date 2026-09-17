package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.ReturnPolicyRequest;
import com.returnflow.rrpms.dto.UpdatePolicyRequest;
import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReturnPolicyService {

    private final ReturnPolicyRepository repository;

    public List<ReturnPolicy> listAll() {
        return repository.findAll();
    }

    public ReturnPolicy create(ReturnPolicyRequest req) {
        ReturnPolicy policy = ReturnPolicy.builder()
                .name(req.name())
                .entityType(req.entityType())
                .entityRef(req.entityRef())
                .returnWindowDays(req.returnWindowDays())
                .freeReturn(req.freeReturn())
                .exchangeEligible(req.exchangeEligible())
                .nonReturnableSkus(req.nonReturnableSkus())
                .effectiveFrom(req.effectiveFrom() != null ? req.effectiveFrom() : java.time.LocalDate.now())
                .active(true)
                .build();
        return repository.save(policy);
    }

    public ReturnPolicy get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new com.returnflow.rrpms.exception.NotFoundException("Policy not found: " + id));
    }

    public void delete(UUID id) {
        repository.deleteById(id);
    }

    public ReturnPolicy update(UUID id, UpdatePolicyRequest req) {
        ReturnPolicy policy = get(id);
        policy.setName(req.name());
        policy.setEntityType(req.entityType());
        policy.setEntityRef(req.entityRef());
        policy.setReturnWindowDays(req.returnWindowDays());
        policy.setFreeReturn(req.freeReturn());
        policy.setExchangeEligible(req.exchangeEligible());
        policy.setActive(req.active());
        return repository.save(policy);
    }
}
