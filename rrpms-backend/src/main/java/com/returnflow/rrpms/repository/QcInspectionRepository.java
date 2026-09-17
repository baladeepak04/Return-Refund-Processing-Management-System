package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.QcInspection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QcInspectionRepository extends JpaRepository<QcInspection, UUID> {
    Optional<QcInspection> findByReturnRequestId(UUID returnId);
}
