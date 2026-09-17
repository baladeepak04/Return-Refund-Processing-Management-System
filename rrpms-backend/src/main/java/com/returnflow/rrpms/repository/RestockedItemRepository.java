package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.RestockedItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RestockedItemRepository extends JpaRepository<RestockedItem, UUID> {
}
