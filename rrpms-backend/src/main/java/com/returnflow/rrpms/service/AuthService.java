package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.LoginRequest;
import com.returnflow.rrpms.dto.LoginResponse;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.repository.UserRepository;
import com.returnflow.rrpms.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

import com.returnflow.rrpms.dto.RegisterRequest;
import com.returnflow.rrpms.enums.Role;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid email or password"));

        if (!user.isEnabled()) {
            throw new org.springframework.security.authentication.DisabledException("This account has been disabled");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid email or password");
        }

        user.setLastLogin(Instant.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "role", user.getRole().name(),
                "name", user.getName(),
                "userId", user.getId().toString()
        ));

        return new LoginResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name(), 3600);
    }

    public LoginResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (email.endsWith("@returnflow.io")) {
            throw new IllegalArgumentException("@returnflow.io addresses are reserved for internal employees. Please use your personal customer email.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        java.util.UUID userId = java.util.UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .name(request.name().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.CUSTOMER)
                .department("Retail")
                .enabled(true)
                .createdAt(Instant.now())
                .lastLogin(Instant.now())
                .build();

        User saved = userRepository.save(user);
        if (saved != null && saved.getId() != null) {
            user = saved;
        }

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "role", user.getRole().name(),
                "name", user.getName(),
                "userId", user.getId().toString()
        ));

        return new LoginResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name(), 3600);
    }
}
