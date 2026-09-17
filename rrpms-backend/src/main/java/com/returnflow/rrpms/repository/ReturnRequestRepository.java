package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.ReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, UUID> {
    List<ReturnRequest> findByCustomerId(UUID customerId);
    List<ReturnRequest> findByStatus(ReturnStatus status);

    List<ReturnRequest> findBySupportOverrideTrueOrderByInitiatedAtDesc();
}
