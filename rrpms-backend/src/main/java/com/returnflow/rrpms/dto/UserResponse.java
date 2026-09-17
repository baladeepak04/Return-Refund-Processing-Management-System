package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.enums.Role;

import java.time.Instant;
import java.util.UUID;

// Never expose the User entity directly from a controller — it carries
// passwordHash (BCrypt-hashed, but still a credential that must never leave
// the server) alongside every other field. This is the only shape any
// /api/v1/admin/users response should ever take.
public record UserResponse(
        UUID id, String email, String name, Role role, String department,
        boolean enabled, Instant lastLogin, CommChannel preferredChannel,
        boolean isVip, Instant createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getName(), u.getRole(), u.getDepartment(),
                u.isEnabled(), u.getLastLogin(), u.getPreferredChannel(), u.isVip(), u.getCreatedAt());
    }
}
