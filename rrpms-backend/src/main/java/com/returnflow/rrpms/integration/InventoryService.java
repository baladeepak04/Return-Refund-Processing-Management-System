package com.returnflow.rrpms.integration;

public interface InventoryService {
    boolean isAvailable(String skuId);

    void incrementStock(String skuId, int quantity);
}
