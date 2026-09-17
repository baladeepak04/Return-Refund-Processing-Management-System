package com.returnflow.rrpms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SatisfactionFeedbackRequest(@NotNull @Min(0) @Max(10) Integer rating, String comment) {}
