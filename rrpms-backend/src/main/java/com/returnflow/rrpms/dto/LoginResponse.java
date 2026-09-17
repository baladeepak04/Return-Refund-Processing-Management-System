package com.returnflow.rrpms.dto;

import java.util.UUID;

public record LoginResponse(String token, UUID id, String name, String email, String role, long expiresIn) {}
