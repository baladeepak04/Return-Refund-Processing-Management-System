package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.RtmBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RtmBatchRepository extends JpaRepository<RtmBatch, UUID> {
}
