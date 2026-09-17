package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.CreateRtmBatchRequest;
import com.returnflow.rrpms.entity.RtmBatch;
import com.returnflow.rrpms.entity.SupplierReturn;
import com.returnflow.rrpms.enums.RtmBatchStatus;
import com.returnflow.rrpms.repository.RtmBatchRepository;
import com.returnflow.rrpms.repository.SupplierReturnRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RtmBatchService {

    private final RtmBatchRepository rtmBatchRepository;
    private final SupplierReturnRepository supplierReturnRepository;

    public List<RtmBatch> list() {
        return rtmBatchRepository.findAll();
    }

    public List<SupplierReturn> listSupplierReturns() {
        return supplierReturnRepository.findAll();
    }

    public RtmBatch createBatch(CreateRtmBatchRequest req) {
        List<SupplierReturn> items = supplierReturnRepository.findAllById(req.supplierReturnIds());
        BigDecimal totalValue = items.stream().map(SupplierReturn::getValue).filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        RtmBatch batch = RtmBatch.builder()
                .supplierId(req.supplierId())
                .supplierName(req.supplierName())
                .creditNoteValue(totalValue)
                .status(RtmBatchStatus.ACCUMULATED)
                .dispatchDate(LocalDate.now())
                .build();
        batch = rtmBatchRepository.save(batch);

        RtmBatch savedBatch = batch;
        items.forEach(i -> {
            i.setRtmBatch(savedBatch);
            i.setStatus(RtmBatchStatus.ACCUMULATED);
        });
        supplierReturnRepository.saveAll(items);

        return batch;
    }

    public RtmBatch dispatch(UUID batchId) {
        RtmBatch batch = get(batchId);
        batch.setStatus(RtmBatchStatus.DISPATCHED);
        return rtmBatchRepository.save(batch);
    }

    public RtmBatch markReceivedBySupplier(UUID batchId) {
        RtmBatch batch = get(batchId);
        batch.setStatus(RtmBatchStatus.RECEIVED_BY_SUPPLIER);
        return rtmBatchRepository.save(batch);
    }

    public RtmBatch settle(UUID batchId) {
        RtmBatch batch = get(batchId);
        batch.setStatus(RtmBatchStatus.SETTLED);
        return rtmBatchRepository.save(batch);
    }

    public RtmBatch markDisputed(UUID batchId, String notes) {
        RtmBatch batch = get(batchId);
        batch.setDisputed(true);
        batch.setDisputeNotes(notes);
        return rtmBatchRepository.save(batch);
    }

    public RtmBatch resolveDispute(UUID batchId) {
        RtmBatch batch = get(batchId);
        batch.setDisputed(false);
        return rtmBatchRepository.save(batch);
    }

    public RtmBatch get(UUID id) {
        return rtmBatchRepository.findById(id).orElseThrow(() -> new com.returnflow.rrpms.exception.NotFoundException("RTM batch not found: " + id));
    }
}
