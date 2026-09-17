package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.LoginRequest;
import com.returnflow.rrpms.dto.LoginResponse;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Web-layer test — real HTTP status codes and @Valid enforcement, distinct
// from the service-layer tests: those verify business logic, this verifies
// what an actual client of this API actually receives.
@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // JWT filter is out of scope here; SecurityConfig itself isn't under test.
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private AuthService authService;
    // JwtAuthenticationFilter (@Component) is still constructed by Spring
    // even with addFilters=false — these mocks satisfy its constructor so
    // the WebMvcTest slice loads at all; the filter itself never runs here.
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void login_returns400_whenEmailIsBlank() throws Exception {
        LoginRequest req = new LoginRequest("", "somePassword123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_returns400_whenEmailIsNotValidFormat() throws Exception {
        LoginRequest req = new LoginRequest("not-an-email", "somePassword123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_returns400_whenPasswordIsBlank() throws Exception {
        LoginRequest req = new LoginRequest("valid@rrpms.com", "");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_returns200_withRealBody_forValidRequest() throws Exception {
        LoginResponse response = new LoginResponse("mock-jwt-token", UUID.randomUUID(), "Priya Sharma", "priya@rrpms.com", "CUSTOMER", 3600L);
        when(authService.login(new LoginRequest("priya@rrpms.com", "Password123!"))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginRequest("priya@rrpms.com", "Password123!"))))
                .andExpect(status().isOk());
    }

    @Test
    void login_returns401_onBadCredentials() throws Exception {
        when(authService.login(org.mockito.ArgumentMatchers.any())).thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginRequest("priya@rrpms.com", "wrongPassword"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void register_returns201_whenValidRequest() throws Exception {
        com.returnflow.rrpms.dto.RegisterRequest req = new com.returnflow.rrpms.dto.RegisterRequest("Priya Sharma", "priya.new@example.com", "Password123!");
        LoginResponse response = new LoginResponse("mock-jwt-token", UUID.randomUUID(), "Priya Sharma", "priya.new@example.com", "CUSTOMER", 3600L);
        when(authService.register(req)).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void register_returns400_whenEmailInvalid() throws Exception {
        com.returnflow.rrpms.dto.RegisterRequest req = new com.returnflow.rrpms.dto.RegisterRequest("Priya Sharma", "not-an-email", "Password123!");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_returns400_whenPasswordTooShort() throws Exception {
        com.returnflow.rrpms.dto.RegisterRequest req = new com.returnflow.rrpms.dto.RegisterRequest("Priya Sharma", "priya@example.com", "123");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
