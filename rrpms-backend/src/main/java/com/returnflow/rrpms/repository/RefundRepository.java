package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    Optional<Refund> findByReturnRequestId(UUID returnId);
    Optional<Refund> findByRazorpayRefundId(String razorpayRefundId);
    List<Refund> findByStatus(RefundStatus status);
}
