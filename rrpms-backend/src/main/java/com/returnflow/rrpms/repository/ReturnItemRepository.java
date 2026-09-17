package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.ReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnItemRepository extends JpaRepository<ReturnItem, UUID> {
    List<ReturnItem> findByReturnRequestId(UUID returnId);
}
