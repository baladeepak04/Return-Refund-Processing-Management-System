package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.LiquidationBatch;
import com.returnflow.rrpms.enums.LiquidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LiquidationBatchRepository extends JpaRepository<LiquidationBatch, UUID> {
    List<LiquidationBatch> findByStatus(LiquidationStatus status);

    List<LiquidationBatch> findByPartnerNameAndStatus(String partnerName, LiquidationStatus status);
}
