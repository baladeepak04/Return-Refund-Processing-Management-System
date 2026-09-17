package com.returnflow.rrpms.integration;

import com.returnflow.rrpms.exception.LogisticsAPIException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MockServicesTest {

    @Test
    void testMockRazorpayService() {
        MockRazorpayService razorpayService = new MockRazorpayService();
        PaymentGatewayService.PaymentResult result = razorpayService.initiateRefund("key-123", BigDecimal.valueOf(500));

        assertNotNull(result);
        assertTrue(result.success());
        assertNotNull(result.gatewayRefundId());
        assertTrue(result.gatewayRefundId().startsWith("rfnd_mock_"));
    }

    @Test
    void testMockLogisticsServiceSuccess() {
        MockLogisticsService logisticsService = new MockLogisticsService();
        LogisticsService.PickupResult result = logisticsService.createPickup("rtn-1", "2026-09-10", "10:00-13:00");

        assertNotNull(result);
        assertNotNull(result.awbNumber());
        assertTrue(result.awbNumber().startsWith("AWB"));
        assertNotNull(result.pickupOtp());
        assertEquals(6, result.pickupOtp().length());
    }

    @Test
    void testMockLogisticsServiceSimulateFailure() {
        MockLogisticsService logisticsService = new MockLogisticsService();
        assertThrows(LogisticsAPIException.class, () ->
                logisticsService.createPickup("rtn-fail", "2026-09-10", "SIMULATE_FAILURE"));
    }

    @Test
    void testMockInventoryService() {
        MockInventoryService inventoryService = new MockInventoryService();
        String skuId = UUID.randomUUID().toString();

        assertDoesNotThrow(() -> inventoryService.incrementStock(skuId, 5));
        assertTrue(inventoryService.isAvailable("invalid-uuid-reports-available"));
    }

    @Test
    void testMockTwilioService() {
        MockTwilioService twilioService = new MockTwilioService();
        boolean sent = twilioService.send("cust-1", "SMS", "PICKUP_CONFIRMED", "Agent arriving soon");
        assertTrue(sent);
    }

    @Test
    void testMockOrderService() {
        MockOrderService orderService = new MockOrderService();
        var orders = orderService.listOrders(UUID.randomUUID());
        assertFalse(orders.isEmpty());

        String existingId = orders.get(0).orderId();
        var fullOrder = orderService.getFullOrder(existingId);
        assertNotNull(fullOrder);
        assertEquals(existingId, fullOrder.orderId());

        String dynamicId = UUID.randomUUID().toString();
        var dynamicOrder = orderService.getFullOrder(dynamicId);
        assertNotNull(dynamicOrder);
        assertEquals(dynamicId, dynamicOrder.orderId());

        var basicOrder = orderService.getOrder(dynamicId);
        assertNotNull(basicOrder);
        assertTrue(basicOrder.delivered());

        var invalidIdOrder = orderService.getOrder("not-a-uuid");
        assertNotNull(invalidIdOrder);
    }
}
