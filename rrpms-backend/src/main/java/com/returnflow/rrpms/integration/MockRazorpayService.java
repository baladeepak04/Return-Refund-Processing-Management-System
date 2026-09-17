package com.returnflow.rrpms.integration;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

// Default implementation until real Razorpay credentials are configured.
// Always succeeds, generating a realistic-looking gateway reference id, so
// the rest of the refund lifecycle (status transitions, communications) can
// be exercised end-to-end without a live merchant account.
@Service
public class MockRazorpayService implements PaymentGatewayService {

    @Override
    public PaymentResult initiateRefund(String idempotencyKey, BigDecimal amount) {
        String mockId = "rfnd_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        return new PaymentResult(mockId, true, null);
    }
}
