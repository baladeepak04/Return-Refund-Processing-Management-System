package com.returnflow.rrpms.integration;

public interface NotificationService {
    boolean send(String toCustomerId, String channel, String eventType, String message);
}
