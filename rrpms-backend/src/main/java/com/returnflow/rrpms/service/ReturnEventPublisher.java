package com.returnflow.rrpms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ReturnEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ReturnEventPublisher.class);

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        // 30-minute timeout for live dashboard sessions
        SseEmitter emitter = new SseEmitter(1800_000L);

        this.emitters.add(emitter);

        emitter.onCompletion(() -> this.emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            this.emitters.remove(emitter);
        });
        emitter.onError((e) -> this.emitters.remove(emitter));

        // Initial connected handshake event
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("message", "ReturnFlow real-time event stream connected", "timestamp", Instant.now().toString())));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE handshake: {}", e.getMessage());
            this.emitters.remove(emitter);
        }

        return emitter;
    }

    public void publish(String eventType, Object data) {
        if (emitters.isEmpty()) {
            return;
        }

        Map<String, Object> payload = Map.of(
                "type", eventType,
                "data", data,
                "timestamp", Instant.now().toString()
        );

        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventType)
                        .data(payload));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
        }
    }
}
