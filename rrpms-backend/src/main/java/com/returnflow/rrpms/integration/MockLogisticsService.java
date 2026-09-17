package com.returnflow.rrpms.integration;

import com.returnflow.rrpms.exception.LogisticsAPIException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class MockLogisticsService implements LogisticsService {

    @Override
    public PickupResult createPickup(String returnId, String pickupDate, String pickupSlot) {
        if ("SIMULATE_FAILURE".equals(pickupSlot)) {
            throw new LogisticsAPIException("Logistics partner API did not respond for return " + returnId);
        }
        String awb = "AWB" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        String otp = String.format("%06d", (int) (Math.random() * 1_000_000));
        return new PickupResult(awb, "https://track.mocklogistics.example/" + awb, otp);
    }
}
