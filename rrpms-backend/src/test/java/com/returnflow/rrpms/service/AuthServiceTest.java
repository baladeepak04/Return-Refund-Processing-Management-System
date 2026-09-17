package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.LoginRequest;
import com.returnflow.rrpms.dto.LoginResponse;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.repository.UserRepository;
import com.returnflow.rrpms.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("admin@returnflow.io");
        user.setName("Admin User");
        user.setPasswordHash("hashed_pwd");
        user.setRole(Role.ADMIN);
        user.setEnabled(true);
    }

    @Test
    void login_succeeds_withValidCredentials() {
        when(userRepository.findByEmail("admin@returnflow.io")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashed_pwd")).thenReturn(true);
        when(jwtService.generateToken(eq("admin@returnflow.io"), any())).thenReturn("mocked_jwt_token");

        LoginResponse response = authService.login(new LoginRequest("admin@returnflow.io", "Password123!"));

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("mocked_jwt_token");
        assertThat(response.email()).isEqualTo("admin@returnflow.io");
        assertThat(response.role()).isEqualTo("ADMIN");
        assertThat(response.name()).isEqualTo("Admin User");
        assertThat(user.getLastLogin()).isNotNull();
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void login_throwsBadCredentials_whenUserNotFound() {
        when(userRepository.findByEmail("unknown@returnflow.io")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("unknown@returnflow.io", "Password123!")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void login_throwsDisabledException_whenUserIsDisabled() {
        user.setEnabled(false);
        when(userRepository.findByEmail("admin@returnflow.io")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("admin@returnflow.io", "Password123!")))
                .isInstanceOf(DisabledException.class)
                .hasMessageContaining("account has been disabled");
    }

    @Test
    void login_throwsBadCredentials_whenPasswordMismatch() {
        when(userRepository.findByEmail("admin@returnflow.io")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_pwd", "hashed_pwd")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("admin@returnflow.io", "wrong_pwd")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    void register_succeeds_whenEmailIsAvailable() {
        when(userRepository.findByEmail("customer@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Secret123!")).thenReturn("hashed_secret");
        when(jwtService.generateToken(eq("customer@test.com"), any())).thenReturn("jwt_token_123");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        com.returnflow.rrpms.dto.RegisterRequest req = new com.returnflow.rrpms.dto.RegisterRequest("New Customer", "customer@test.com", "Secret123!");
        LoginResponse response = authService.register(req);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("jwt_token_123");
        assertThat(response.email()).isEqualTo("customer@test.com");
        assertThat(response.name()).isEqualTo("New Customer");
        assertThat(response.role()).isEqualTo("CUSTOMER");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void register_throwsIllegalArgumentException_whenEmailAlreadyExists() {
        when(userRepository.findByEmail("customer@test.com")).thenReturn(Optional.of(user));

        com.returnflow.rrpms.dto.RegisterRequest req = new com.returnflow.rrpms.dto.RegisterRequest("New Customer", "customer@test.com", "Secret123!");

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void register_throwsIllegalArgumentException_whenEmailIsInternalDomain() {
        com.returnflow.rrpms.dto.RegisterRequest req = new com.returnflow.rrpms.dto.RegisterRequest("New Customer", "intruder@returnflow.io", "Secret123!");

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("reserved for internal employees");
    }
}
