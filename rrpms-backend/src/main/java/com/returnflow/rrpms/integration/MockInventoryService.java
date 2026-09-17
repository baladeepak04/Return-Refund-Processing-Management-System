package com.returnflow.rrpms.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// Deterministic per-SKU mock, same pattern as MockOrderService — the same
// SKU always returns the same availability, letting QA reliably exercise
// both "in stock" and "out of stock" by choosing different SKU values,
// rather than a random flip-a-coin result on every call.
@Service
public class MockInventoryService implements InventoryService {

    private static final Logger log = LoggerFactory.getLogger(MockInventoryService.class);

    // In-memory stand-in for a real warehouse-management-system call — the
    // increment genuinely happens and is genuinely visible on the next
    // isAvailable()/getStock() call, it just doesn't survive a restart
    // (same honest limitation as every other Mock*Service in this package).
    private final ConcurrentHashMap<String, AtomicInteger> stock = new ConcurrentHashMap<>();

    @Override
    public boolean isAvailable(String skuId) {
        try {
            UUID id = UUID.fromString(skuId);
            return Math.abs(id.hashCode()) % 100 < 85;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    @Override
    public void incrementStock(String skuId, int quantity) {
        int updated = stock.computeIfAbsent(skuId, k -> new AtomicInteger(0)).addAndGet(quantity);
        log.info("Inventory API: incremented stock for SKU {} by {} (now {})", skuId, quantity, updated);
    }
}
