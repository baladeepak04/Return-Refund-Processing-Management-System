package com.returnflow.rrpms.integration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface OrderService {
    OrderDetails getOrder(String orderId);

    record OrderDetails(String orderId, boolean delivered, LocalDate deliveryDate, BigDecimal originalAmount) {}

    record OrderItem(String lineId, String skuId, String productName, String category, BigDecimal price, int quantity, String imageUrl) {}

    record FullOrderDetails(String orderId, String customerId, boolean delivered, LocalDate deliveryDate, BigDecimal originalAmount, String paymentMethod, List<OrderItem> items) {}

    List<FullOrderDetails> listOrders(UUID customerId);

    FullOrderDetails getFullOrder(String orderId);
}

