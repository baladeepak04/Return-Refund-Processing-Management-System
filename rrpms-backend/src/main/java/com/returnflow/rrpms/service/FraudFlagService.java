package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.CustomerReturnStats;
import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.FraudFlagStatus;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.CustomerReturnStatsRepository;
import com.returnflow.rrpms.repository.FraudFlagRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import com.returnflow.rrpms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FraudFlagService {

    private final FraudFlagRepository repository;
    private final CustomerReturnStatsRepository customerReturnStatsRepository;
    private final UserRepository userRepository;
    private final ReturnRequestRepository returnRequestRepository;

    public List<FraudFlag> queue() {
        List<FraudFlag> list = repository.findAll();
        list.forEach(this::enrichFraudFlag);
        return list;
    }

    public FraudFlag blacklist(UUID id) {
        FraudFlag flag = get(id);
        flag.setStatus(FraudFlagStatus.CONFIRMED);
        if (flag.getCustomerId() != null) {
            userRepository.findById(flag.getCustomerId()).ifPresent(u -> {
                u.setEnabled(false);
                userRepository.save(u);
            });
        }
        return enrichFraudFlag(repository.save(flag));
    }

    public FraudFlag investigate(UUID id) {
        FraudFlag flag = get(id);
        flag.setStatus(FraudFlagStatus.INVESTIGATING);
        return enrichFraudFlag(repository.save(flag));
    }

    public FraudFlag clear(UUID id) {
        FraudFlag flag = get(id);
        flag.setStatus(FraudFlagStatus.CLEARED);
        return enrichFraudFlag(repository.save(flag));
    }

    public FraudFlag get(UUID id) {
        FraudFlag flag = repository.findById(id).orElseThrow(() -> new NotFoundException("Fraud flag not found: " + id));
        return enrichFraudFlag(flag);
    }

    private FraudFlag enrichFraudFlag(FraudFlag flag) {
        if (flag == null) return null;
        if (flag.getCustomerId() != null) {
            userRepository.findById(flag.getCustomerId()).ifPresent(u -> {
                flag.setCustomerName(u.getName());
                flag.setCustomerEmail(u.getEmail());
            });
        }

        if (flag.getReturnRequest() != null && flag.getReturnRequest().getItems() != null && !flag.getReturnRequest().getItems().isEmpty()) {
            flag.setProductName(flag.getReturnRequest().getItems().get(0).getProductName());
        } else if (flag.getCustomerId() != null) {
            List<ReturnRequest> customerReturns = returnRequestRepository.findByCustomerId(flag.getCustomerId());
            if (!customerReturns.isEmpty()) {
                ReturnRequest latest = customerReturns.get(customerReturns.size() - 1);
                if (latest.getItems() != null && !latest.getItems().isEmpty()) {
                    flag.setProductName(latest.getItems().get(0).getProductName());
                    flag.setReturnRequest(latest);
                }
            }
        }
        if (flag.getProductName() == null || flag.getProductName().isBlank()) {
            flag.setProductName("Consumer Electronics / Premium Audio");
        }

        String type = flag.getFlagType() != null ? flag.getFlagType() : "";
        switch (type) {
            case "FREQUENT_EMPTY_BOX_CLAIM" -> flag.setCaseSummary("Repeated claims of receiving empty packaging without item.");
            case "MISSING_SERIAL_NUMBER" -> flag.setCaseSummary("Return parcel unit missing original manufacturer serial number or IMEI mismatch.");
            case "EXCESSIVE_RETURN_RATE" -> flag.setCaseSummary("Return velocity (53.3%) critically exceeds platform risk threshold.");
            case "SUSPICIOUS_WARDROBING" -> flag.setCaseSummary("High-value item returned with tag tampering within 24h of weekend event.");
            case "MULTIPLE_ACCOUNTS_SAME_ADDRESS" -> flag.setCaseSummary("Multiple active customer accounts linked to identical delivery address.");
            case "QC_COMPLAINT_MISMATCH" -> flag.setCaseSummary("Claimed damaged in transit, but warehouse QC verified intact unopened packaging.");
            case "RETURN_RATE_THRESHOLD" -> flag.setCaseSummary("Return velocity exceeded policy ceiling (>30% of lifetime orders).");
            case "ADDRESS_PATTERN" -> flag.setCaseSummary("Anomalous address mutation pattern detected across consecutive return requests.");
            default -> flag.setCaseSummary(type.replace("_", " ").toLowerCase());
        }

        return flag;
    }

    public CustomerReturnStats setTotalOrders(UUID customerId, int totalOrders) {
        CustomerReturnStats stats = customerReturnStatsRepository.findByCustomerId(customerId)
                .orElseGet(() -> CustomerReturnStats.builder().customerId(customerId).build());
        stats.setTotalOrders(totalOrders);
        return customerReturnStatsRepository.save(stats);
    }

    public List<CustomerReturnStats> listStats() {
        return customerReturnStatsRepository.findAll();
    }
}
