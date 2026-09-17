package com.returnflow.rrpms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record OverrideReturnWindowRequest(@Min(1) @Max(7) int extraDays, @NotBlank String reason) {}
