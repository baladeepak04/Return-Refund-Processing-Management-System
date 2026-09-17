package com.returnflow.rrpms.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CreateRtmBatchRequest(@NotNull UUID supplierId, @NotNull String supplierName, @NotNull List<UUID> supplierReturnIds) {}
