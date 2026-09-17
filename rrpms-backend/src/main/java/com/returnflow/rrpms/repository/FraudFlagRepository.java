package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.FraudFlag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FraudFlagRepository extends JpaRepository<FraudFlag, UUID> {
    List<FraudFlag> findByReturnRequestId(UUID returnId);
    List<FraudFlag> findByCustomerId(UUID customerId);
}
