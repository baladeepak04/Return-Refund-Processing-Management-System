package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Deliberately excludes email and password — email is the login identity and
// shouldn't silently change under a user, and password reset is a separate
// concern (not in scope for this edit form).
public record UpdateUserRequest(@NotBlank String name, @NotNull Role role, String department) {}
