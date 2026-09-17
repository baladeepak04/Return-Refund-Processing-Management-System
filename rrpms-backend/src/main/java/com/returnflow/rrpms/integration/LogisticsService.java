package com.returnflow.rrpms.integration;

public interface LogisticsService {
    PickupResult createPickup(String returnId, String pickupDate, String pickupSlot);

    record PickupResult(String awbNumber, String trackingUrl, String pickupOtp) {}
}
