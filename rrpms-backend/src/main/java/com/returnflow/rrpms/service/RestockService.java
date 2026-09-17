package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.ReturnItem;
import com.returnflow.rrpms.entity.RestockedItem;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.RestockType;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.integration.InventoryService;
import com.returnflow.rrpms.repository.RestockedItemRepository;
import com.returnflow.rrpms.repository.ReturnItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RestockService {

    private static final BigDecimal SUPERVISOR_APPROVAL_THRESHOLD = new BigDecimal("5000");

    private final RestockedItemRepository repository;
    private final ReturnItemRepository returnItemRepository;
    private final InventoryService inventoryService;

    public void restockFromInspection(QcInspection qc) {
        if (qc.getDisposition() != Disposition.RESTOCK_NEW && qc.getDisposition() != Disposition.RESTOCK_REFURB) {
            return;
        }
        RestockType type = qc.getDisposition() == Disposition.RESTOCK_NEW ? RestockType.NEW : RestockType.REFURBISHED;

        // Real SKU/quantity from the actual return line items — no placeholder
        // UUIDs. Falls back to a single-unit placeholder only when the return
        // genuinely has no items recorded (shouldn't happen in practice).
        List<ReturnItem> items = returnItemRepository.findByReturnRequestId(qc.getReturnRequest().getId());
        if (items.isEmpty()) {
            saveAndRestock(qc, type, UUID.randomUUID(), 1);
            return;
        }
        for (ReturnItem item : items) {
            saveAndRestock(qc, type, item.getSkuId(), item.getQuantity());
        }
    }

    private void saveAndRestock(QcInspection qc, RestockType type, UUID skuId, Integer quantity) {
        RestockedItem toSave = buildRestockedItem(qc, type, skuId, quantity);
        // Read the approval flag from the object we just built, not from
        // whatever repository.save() hands back — relying on the saved
        // return value here would be fragile (and NPEs against a mock
        // repository whose save() isn't stubbed to echo its argument).
        boolean needsApproval = toSave.isSupervisorApprovalRequired();
        repository.save(toSave);
        if (!needsApproval) {
            inventoryService.incrementStock(skuId.toString(), quantity);
        }
    }

    private RestockedItem buildRestockedItem(QcInspection qc, RestockType type, UUID skuId, Integer quantity) {
        BigDecimal estimatedValue = new BigDecimal(1000 + (Math.abs(skuId.hashCode()) % 9000));
        boolean needsApproval = estimatedValue.compareTo(SUPERVISOR_APPROVAL_THRESHOLD) > 0;

        return RestockedItem.builder()
                .qcInspection(qc)
                .skuId(skuId)
                .quantity(quantity)
                .restockType(type)
                .newListingPrice(type == RestockType.REFURBISHED ? estimatedValue.multiply(new BigDecimal("0.7")) : null)
                .warrantyExpiresAt(type == RestockType.REFURBISHED ? java.time.LocalDate.now().plusDays(90) : null)
                .supervisorApprovalRequired(needsApproval)
                .approved(!needsApproval)
                .build();
    }

    public RestockedItem approve(UUID id) {
        RestockedItem item = get(id);
        item.setApproved(true);
        RestockedItem saved = repository.save(item);
        // The high-value item's stock increment was held back until now
        // (see saveAndRestock above) — this is the point it actually
        // becomes available for sale. Guarded against a missing SKU/
        // quantity rather than assuming every RestockedItem row is fully
        // populated.
        if (item.getSkuId() != null && item.getQuantity() != null) {
            inventoryService.incrementStock(item.getSkuId().toString(), item.getQuantity());
        }
        return saved;
    }

    public RestockedItem get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Restocked item not found: " + id));
    }

    public List<RestockedItem> list() {
        return repository.findAll();
    }
}
