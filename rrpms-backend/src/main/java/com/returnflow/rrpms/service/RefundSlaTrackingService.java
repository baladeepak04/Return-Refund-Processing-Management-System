package com.returnflow.rrpms.service;

import com.returnflow.rrpms.enums.RefundMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundSlaTrackingService {

    private static final String KEY_PREFIX = "refund:sla:";

    private final StringRedisTemplate redisTemplate;
    private final Map<String, Instant> inMemoryFallback = new ConcurrentHashMap<>();

    public void startTracking(UUID refundId, RefundMethod method) {
        Duration sla = slaFor(method);
        Instant deadline = Instant.now().plus(sla);
        inMemoryFallback.put(KEY_PREFIX + refundId, deadline);
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + refundId, Instant.now().toString(), sla);
        } catch (Exception e) {
            log.warn("Redis unavailable for SLA tracking on refund {}, using in-memory tracker: {}", refundId, e.getMessage());
        }
    }

    public boolean isWithinSla(UUID refundId) {
        try {
            Boolean exists = redisTemplate.hasKey(KEY_PREFIX + refundId);
            if (exists != null) {
                return exists;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable, checking in-memory fallback for refund {}: {}", refundId, e.getMessage());
        }
        Instant deadline = inMemoryFallback.get(KEY_PREFIX + refundId);
        return deadline != null && Instant.now().isBefore(deadline);
    }

    public void stopTracking(UUID refundId) {
        inMemoryFallback.remove(KEY_PREFIX + refundId);
        try {
            redisTemplate.delete(KEY_PREFIX + refundId);
        } catch (Exception e) {
            log.warn("Redis unavailable when stopping SLA tracking for refund {}: {}", refundId, e.getMessage());
        }
    }

    private Duration slaFor(RefundMethod method) {
        if (method == RefundMethod.STORE_CREDIT) {
            return Duration.ofHours(24);
        }
        return Duration.ofDays(7);
    }
}
