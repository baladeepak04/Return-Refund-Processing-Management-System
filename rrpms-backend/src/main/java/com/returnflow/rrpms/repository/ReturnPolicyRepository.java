package com.returnflow.rrpms.repository;

import com.returnflow.rrpms.entity.ReturnPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReturnPolicyRepository extends JpaRepository<ReturnPolicy, UUID> {
}
