package com.returnflow.rrpms.integration;

import java.math.BigDecimal;

public interface PaymentGatewayService {
    PaymentResult initiateRefund(String idempotencyKey, BigDecimal amount);

    record PaymentResult(String gatewayRefundId, boolean success, String failureReason) {}
}
