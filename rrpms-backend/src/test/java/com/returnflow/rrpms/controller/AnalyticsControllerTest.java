package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.enums.SalesChannel;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AnalyticsController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class AnalyticsControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AnalyticsService analyticsService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void returns_bindsDateRangeAndChannelParams() throws Exception {
        when(analyticsService.returnAnalytics(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), SalesChannel.WEB))
                .thenReturn(Map.of("totalReturns", 5));

        mockMvc.perform(get("/api/v1/analytics/returns")
                        .param("from", "2026-06-01")
                        .param("to", "2026-06-30")
                        .param("channel", "WEB"))
                .andExpect(status().isOk());

        verify(analyticsService).returnAnalytics(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), SalesChannel.WEB);
    }

    @Test
    void returns_worksWithNoParamsAtAll() throws Exception {
        when(analyticsService.returnAnalytics(isNull(), isNull(), isNull())).thenReturn(Map.of("totalReturns", 0));

        mockMvc.perform(get("/api/v1/analytics/returns"))
                .andExpect(status().isOk());

        verify(analyticsService).returnAnalytics(null, null, null);
    }

    @Test
    void satisfaction_returns200() throws Exception {
        when(analyticsService.satisfactionAnalytics()).thenReturn(Map.of("npsScore", 10.0));

        mockMvc.perform(get("/api/v1/analytics/satisfaction"))
                .andExpect(status().isOk());
    }
}
