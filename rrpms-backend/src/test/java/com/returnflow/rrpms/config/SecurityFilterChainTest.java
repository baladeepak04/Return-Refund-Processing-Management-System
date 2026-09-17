package com.returnflow.rrpms.config;

import com.returnflow.rrpms.controller.AuthController;
import com.returnflow.rrpms.repository.UserRepository;
import com.returnflow.rrpms.security.JwtAuthenticationFilter;
import com.returnflow.rrpms.security.JwtService;
import com.returnflow.rrpms.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "app.cors.allowed-origins=http://localhost:5173,http://localhost:8081"
})
class SecurityFilterChainTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @org.junit.jupiter.api.BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(inv -> {
            jakarta.servlet.FilterChain chain = inv.getArgument(2);
            chain.doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void unauthenticatedReturnsEndpoint_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/returns"))
                .andExpect(status().isUnauthorized());
    }
}
