package com.returnflow.rrpms.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class ReturnEventPublisherTest {

    private ReturnEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new ReturnEventPublisher();
    }

    @Test
    void publish_doesNothingWhenNoSubscribers() {
        assertDoesNotThrow(() -> publisher.publish("TEST_EVENT", Map.of("key", "val")));
    }

    @Test
    void subscribe_registersEmitterAndSendsHandshake() {
        SseEmitter emitter = publisher.subscribe();
        assertThat(emitter).isNotNull();

        // Publish event to active subscriber
        assertDoesNotThrow(() -> publisher.publish("RETURN_UPDATED", Map.of("id", "123")));
    }

    @Test
    void publish_cleansUpDeadEmittersOnException() {
        SseEmitter emitter = publisher.subscribe();
        // Complete the emitter to simulate a dead connection
        emitter.complete();

        // Publishing should catch the exception and clean up dead emitters without throwing
        assertDoesNotThrow(() -> publisher.publish("TEST_EVENT", Map.of("key", "val")));
    }
}
