package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.ReturnCommunication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnCommunicationRepository extends JpaRepository<ReturnCommunication, UUID> {
    List<ReturnCommunication> findByReturnRequest_CustomerIdOrderBySentAtDesc(UUID customerId);
}
