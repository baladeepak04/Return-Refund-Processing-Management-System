package com.returnflow.rrpms.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class MockTwilioService implements NotificationService {

    @Override
    public boolean send(String toCustomerId, String channel, String eventType, String message) {
        log.info("[MockTwilio] {} -> customer {} [{}]: {}", channel, toCustomerId, eventType, message);
        return true;
    }
}
