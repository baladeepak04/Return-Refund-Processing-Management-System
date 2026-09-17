package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.RefundMethod;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record InitiateRefundRequest(@NotNull UUID returnId, @NotNull BigDecimal amount, @NotNull RefundMethod method) {}
