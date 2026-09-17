package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.PreferredRefundMethod;
import com.returnflow.rrpms.enums.ReturnType;
import com.returnflow.rrpms.enums.SalesChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record InitiateReturnRequest(
        @NotNull UUID orderId,
        @NotNull UUID customerId,
        @NotNull ReturnType returnType,
        @NotBlank String reasonCode,
        @NotNull PreferredRefundMethod preferredRefundMethod,
        @NotNull UUID policyId,
        String bankAccountNumber,
        String bankIfsc,
        SalesChannel salesChannel,
        List<ReturnItemRequest> items,
        @jakarta.validation.constraints.Min(0) @jakarta.validation.constraints.Max(7) Integer overrideExtraDays,
        String overrideReason,
        java.math.BigDecimal refundAmount
) {
    public InitiateReturnRequest(
            UUID orderId, UUID customerId, ReturnType returnType, String reasonCode,
            PreferredRefundMethod preferredRefundMethod, UUID policyId, String bankAccountNumber,
            String bankIfsc, SalesChannel salesChannel, List<ReturnItemRequest> items,
            Integer overrideExtraDays, String overrideReason
    ) {
        this(orderId, customerId, returnType, reasonCode, preferredRefundMethod, policyId,
                bankAccountNumber, bankIfsc, salesChannel, items, overrideExtraDays, overrideReason, null);
    }

    public record ReturnItemRequest(UUID orderLineId, UUID skuId, Integer quantity, String returnReason,
                                     UUID exchangeSkuId, List<String> evidenceUrls, String productName) {
        public ReturnItemRequest(UUID orderLineId, UUID skuId, Integer quantity, String returnReason,
                                 UUID exchangeSkuId, List<String> evidenceUrls) {
            this(orderLineId, skuId, quantity, returnReason, exchangeSkuId, evidenceUrls, null);
        }
    }
}
