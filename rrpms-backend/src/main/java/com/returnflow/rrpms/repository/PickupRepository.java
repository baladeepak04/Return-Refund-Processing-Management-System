package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.Pickup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PickupRepository extends JpaRepository<Pickup, UUID> {
    Optional<Pickup> findByReturnRequestId(UUID returnId);
    Optional<Pickup> findByAwbNumber(String awbNumber);
    List<Pickup> findByPickupAddress(String pickupAddress);
}
