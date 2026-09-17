package com.returnflow.rrpms.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private final String testSecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", testSecret);
        ReflectionTestUtils.setField(jwtService, "expirySeconds", 3600L);
    }

    @Test
    void testGenerateAndValidateToken() {
        String email = "test@returnflow.io";
        Map<String, Object> claims = Map.of("role", "ADMIN", "name", "Test User");

        String token = jwtService.generateToken(email, claims);
        assertNotNull(token);
        assertTrue(jwtService.isValid(token));
        assertEquals(email, jwtService.extractEmail(token));

        Claims parsed = jwtService.parseClaims(token);
        assertEquals("ADMIN", parsed.get("role"));
        assertEquals("Test User", parsed.get("name"));
    }

    @Test
    void testInvalidToken() {
        assertFalse(jwtService.isValid("invalid-token-string"));
        assertFalse(jwtService.isValid(""));
    }
}
