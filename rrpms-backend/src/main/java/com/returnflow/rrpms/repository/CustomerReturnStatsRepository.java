package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.CustomerReturnStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerReturnStatsRepository extends JpaRepository<CustomerReturnStats, UUID> {
    Optional<CustomerReturnStats> findByCustomerId(UUID customerId);
}
