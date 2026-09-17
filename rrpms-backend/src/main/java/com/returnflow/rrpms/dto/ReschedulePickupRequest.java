package com.returnflow.rrpms.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ReschedulePickupRequest(@NotNull LocalDate pickupDate, String pickupSlot) {}
