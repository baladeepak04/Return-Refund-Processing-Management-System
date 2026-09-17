package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Web-layer: confirms the self-service preference endpoint resolves the
// customer's own ID from the JWT principal, not a client-supplied one —
// there's no path/body parameter for the target user, only ever "me".
@WebMvcTest(controllers = UserPreferenceController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class UserPreferenceControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private UserService userService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    // With addFilters=false the real Spring Security filter chain never
    // runs, so the standard SecurityMockMvcRequestPostProcessors.authentication()
    // (which relies on that chain to move the mock session's Authentication
    // into SecurityContextHolder) never actually applies it — this pushes
    // it directly onto the thread-local SecurityContextHolder instead,
    // which @AuthenticationPrincipal resolves from regardless of filters.
    private RequestPostProcessor authenticatedAs(User principal) {
        return request -> {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of()));
            return request;
        };
    }

    @Test
    void setPreferredChannel_usesPrincipalId_notAnyClientSuppliedId() throws Exception {
        UUID principalId = UUID.randomUUID();
        User principal = User.builder().id(principalId).build();
        when(userService.setPreferredChannel(principalId, CommChannel.WHATSAPP)).thenReturn(principal);

        mockMvc.perform(put("/api/v1/users/me/preferred-channel")
                        .param("channel", "WHATSAPP")
                        .with(authenticatedAs(principal)))
                .andExpect(status().isOk());

        verify(userService).setPreferredChannel(principalId, CommChannel.WHATSAPP);
    }
}
