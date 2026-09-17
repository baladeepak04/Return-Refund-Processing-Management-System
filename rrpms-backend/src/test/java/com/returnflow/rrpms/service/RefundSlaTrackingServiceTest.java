package com.returnflow.rrpms.service;

import com.returnflow.rrpms.enums.RefundMethod;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundSlaTrackingServiceTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @InjectMocks private RefundSlaTrackingService slaTrackingService;

    @Test
    void startTracking_setsTwentyFourHourTtl_forStoreCredit() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        UUID refundId = UUID.randomUUID();

        slaTrackingService.startTracking(refundId, RefundMethod.STORE_CREDIT);

        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(valueOperations).set(eq("refund:sla:" + refundId), any(), ttlCaptor.capture());
        assertThat(ttlCaptor.getValue()).isEqualTo(Duration.ofHours(24));
    }

    @Test
    void startTracking_setsSevenDayTtl_forBankTransfer() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        UUID refundId = UUID.randomUUID();

        slaTrackingService.startTracking(refundId, RefundMethod.BANK_TRANSFER);

        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(valueOperations).set(eq("refund:sla:" + refundId), any(), ttlCaptor.capture());
        assertThat(ttlCaptor.getValue()).isEqualTo(Duration.ofDays(7));
    }

    @Test
    void startTracking_setsSevenDayTtl_forOriginalMethod() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        UUID refundId = UUID.randomUUID();

        slaTrackingService.startTracking(refundId, RefundMethod.ORIGINAL_METHOD);

        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);
        verify(valueOperations).set(eq("refund:sla:" + refundId), any(), ttlCaptor.capture());
        assertThat(ttlCaptor.getValue()).isEqualTo(Duration.ofDays(7));
    }

    @Test
    void isWithinSla_returnsTrue_whenKeyExists() {
        UUID refundId = UUID.randomUUID();
        when(redisTemplate.hasKey("refund:sla:" + refundId)).thenReturn(true);

        assertThat(slaTrackingService.isWithinSla(refundId)).isTrue();
    }

    @Test
    void isWithinSla_returnsFalse_whenKeyExpired() {
        UUID refundId = UUID.randomUUID();
        when(redisTemplate.hasKey("refund:sla:" + refundId)).thenReturn(false);

        assertThat(slaTrackingService.isWithinSla(refundId)).isFalse();
    }

    @Test
    void stopTracking_deletesTheKey() {
        UUID refundId = UUID.randomUUID();

        slaTrackingService.stopTracking(refundId);

        verify(redisTemplate).delete("refund:sla:" + refundId);
    }
}
