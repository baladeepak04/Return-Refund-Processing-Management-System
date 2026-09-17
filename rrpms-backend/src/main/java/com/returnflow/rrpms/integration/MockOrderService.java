package com.returnflow.rrpms.integration;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MockOrderService implements OrderService {

    private final List<FullOrderDetails> sampleOrders = new ArrayList<>();

    public MockOrderService() {
        // Pre-seeded realistic orders for customer portal
        sampleOrders.add(new FullOrderDetails(
                "3b7e4110-8f6a-4d43-9824-118822334455",
                "customer-priya",
                true,
                LocalDate.now().minusDays(3),
                new BigDecimal("8998.00"),
                "ORIGINAL_METHOD",
                List.of(
                        new OrderItem(
                                "10000001-0000-0000-0000-000000000001",
                                "90000001-0000-0000-0000-000000000001",
                                "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
                                "Electronics",
                                new BigDecimal("8499.00"),
                                1,
                                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80"
                        ),
                        new OrderItem(
                                "10000001-0000-0000-0000-000000000002",
                                "90000001-0000-0000-0000-000000000002",
                                "Anker USB-C Braided Fast Charging Cable (2m)",
                                "Electronics",
                                new BigDecimal("499.00"),
                                1,
                                "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "7a2b9100-3c1d-4e5f-7619-223344556677",
                "customer-priya",
                true,
                LocalDate.now().minusDays(12),
                new BigDecimal("7298.00"),
                "ORIGINAL_METHOD",
                List.of(
                        new OrderItem(
                                "10000002-0000-0000-0000-000000000001",
                                "90000002-0000-0000-0000-000000000001",
                                "Ralph Lauren Classic Fit Oxford Cotton Shirt (Sky Blue, L)",
                                "Apparel",
                                new BigDecimal("2299.00"),
                                1,
                                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&q=80"
                        ),
                        new OrderItem(
                                "10000002-0000-0000-0000-000000000002",
                                "90000002-0000-0000-0000-000000000002",
                                "Clark's Leather Chelsea Ankle Boots (Tan Brown, UK 9)",
                                "Apparel",
                                new BigDecimal("4999.00"),
                                1,
                                "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "f4c81000-1122-3344-5431-334455667788",
                "customer-priya",
                true,
                LocalDate.now().minusDays(2),
                new BigDecimal("850.00"),
                "BANK_TRANSFER",
                List.of(
                        new OrderItem(
                                "10000003-0000-0000-0000-000000000001",
                                "90000003-0000-0000-0000-000000000001",
                                "Organic Extra Virgin Cold-Pressed Olive Oil 500ml",
                                "Food",
                                new BigDecimal("850.00"),
                                1,
                                "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "89112233-4455-6677-8899-aabbccddeeff",
                "customer-priya",
                true,
                LocalDate.now().minusDays(20),
                new BigDecimal("3499.00"),
                "ORIGINAL_METHOD",
                List.of(
                        new OrderItem(
                                "10000004-0000-0000-0000-000000000001",
                                "90000004-0000-0000-0000-000000000001",
                                "Nike Air Zoom Pegasus Running Shoes (Black/White, UK 8)",
                                "Apparel",
                                new BigDecimal("3499.00"),
                                1,
                                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "11223344-5566-7788-9900-aabbccddeeff",
                "customer-priya",
                true,
                LocalDate.now().minusDays(5),
                new BigDecimal("4299.00"),
                "ORIGINAL_METHOD",
                List.of(
                        new OrderItem(
                                "10000005-0000-0000-0000-000000000001",
                                "90000005-0000-0000-0000-000000000001",
                                "Puma Nitro Elite Running Shoes (UK 7, Electric Blue)",
                                "Footwear",
                                new BigDecimal("4299.00"),
                                1,
                                "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "22334455-6677-8899-0011-bbccddeeff00",
                "customer-priya",
                true,
                LocalDate.now().minusDays(4),
                new BigDecimal("4999.00"),
                "BANK_TRANSFER",
                List.of(
                        new OrderItem(
                                "10000006-0000-0000-0000-000000000001",
                                "90000006-0000-0000-0000-000000000001",
                                "Philips Digital Airfryer 4.1L with Rapid Air Tech",
                                "Home & Kitchen",
                                new BigDecimal("4999.00"),
                                1,
                                "https://images.unsplash.com/photo-1585515320310-259814833e62?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "33445566-7788-9900-1122-ccddeeff0011",
                "customer-priya",
                true,
                LocalDate.now().minusDays(3),
                new BigDecimal("45000.00"),
                "ORIGINAL_METHOD",
                List.of(
                        new OrderItem(
                                "10000007-0000-0000-0000-000000000001",
                                "90000007-0000-0000-0000-000000000001",
                                "Tissot PRX Powermatic 80 Automatic Watch (Blue Dial)",
                                "Luxury Watches",
                                new BigDecimal("45000.00"),
                                1,
                                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80"
                        )
                )
        ));

        sampleOrders.add(new FullOrderDetails(
                "44556677-8899-0011-2233-ddeeff001122",
                "customer-priya",
                true,
                LocalDate.now().minusDays(6),
                new BigDecimal("5999.00"),
                "ORIGINAL_METHOD",
                List.of(
                        new OrderItem(
                                "10000008-0000-0000-0000-000000000001",
                                "90000008-0000-0000-0000-000000000001",
                                "Garmin HRM-Pro Plus Premium Heart Rate Transmitter",
                                "Sports & Fitness",
                                new BigDecimal("5999.00"),
                                1,
                                "https://images.unsplash.com/photo-1510519138171-c70d7634f02c?w=300&q=80"
                        )
                )
        ));
    }

    @Override
    public OrderDetails getOrder(String orderId) {
        FullOrderDetails full = findSampleOrder(orderId);
        if (full != null) {
            return new OrderDetails(full.orderId(), full.delivered(), full.deliveryDate(), full.originalAmount());
        }

        int daysAgo;
        long amountSeed;
        try {
            UUID id = UUID.fromString(orderId);
            daysAgo = Math.abs(id.hashCode()) % 4 + 1;
            amountSeed = Math.abs(id.getLeastSignificantBits()) % 40000L;
        } catch (IllegalArgumentException e) {
            daysAgo = 0;
            amountSeed = 0L;
        }
        BigDecimal amount = new BigDecimal(1000 + amountSeed);
        return new OrderDetails(orderId, true, LocalDate.now().minusDays(daysAgo), amount);
    }

    @Override
    public List<FullOrderDetails> listOrders(UUID customerId) {
        return sampleOrders;
    }

    @Override
    public FullOrderDetails getFullOrder(String orderId) {
        FullOrderDetails full = findSampleOrder(orderId);
        if (full != null) {
            return full;
        }

        OrderDetails basic = getOrder(orderId);
        String skuId = UUID.nameUUIDFromBytes((orderId + "-sku-1").getBytes()).toString();
        String lineId = UUID.nameUUIDFromBytes((orderId + "-line-1").getBytes()).toString();

        return new FullOrderDetails(
                orderId,
                "customer",
                basic.delivered(),
                basic.deliveryDate(),
                basic.originalAmount(),
                "ORIGINAL_METHOD",
                List.of(new OrderItem(
                        lineId,
                        skuId,
                        "Purchased Retail Product",
                        "Apparel",
                        basic.originalAmount(),
                        1,
                        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80"
                ))
        );
    }

    private FullOrderDetails findSampleOrder(String orderId) {
        for (FullOrderDetails o : sampleOrders) {
            if (o.orderId().equalsIgnoreCase(orderId)) {
                return o;
            }
        }
        return null;
    }
}
