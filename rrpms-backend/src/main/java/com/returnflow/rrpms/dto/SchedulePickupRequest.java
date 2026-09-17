package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.LogisticsPartner;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SchedulePickupRequest(@NotNull LogisticsPartner logisticsPartner, @NotNull LocalDate pickupDate,
                                     String pickupSlot, @NotBlank String pickupAddress) {}
