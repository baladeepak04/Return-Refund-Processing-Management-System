package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(@NotBlank String name, @NotBlank @Email String email, @NotNull Role role, String department, @NotBlank String password) {}
