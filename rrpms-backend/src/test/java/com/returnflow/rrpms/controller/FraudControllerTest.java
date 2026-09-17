package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.CustomerReturnStats;
import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.FraudFlagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FraudController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class FraudControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private FraudFlagService fraudFlagService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void fraudQueue_returns200_withRealList() throws Exception {
        when(fraudFlagService.queue()).thenReturn(List.of(new FraudFlag()));

        mockMvc.perform(get("/api/v1/returns/fraud-queue"))
                .andExpect(status().isOk());
    }

    @Test
    void blacklist_callsService_andReturns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(fraudFlagService.blacklist(id)).thenReturn(new FraudFlag());

        mockMvc.perform(put("/api/v1/fraud/" + id + "/blacklist"))
                .andExpect(status().isOk());

        verify(fraudFlagService).blacklist(id);
    }

    @Test
    void setTotalOrders_bindsIntQueryParam() throws Exception {
        UUID customerId = UUID.randomUUID();
        when(fraudFlagService.setTotalOrders(customerId, 15)).thenReturn(new CustomerReturnStats());

        mockMvc.perform(put("/api/v1/fraud/customer-stats/" + customerId + "/total-orders").param("totalOrders", "15"))
                .andExpect(status().isOk());

        verify(fraudFlagService).setTotalOrders(customerId, 15);
    }

    @Test
    void setTotalOrders_returns400_whenTotalOrdersMissing() throws Exception {
        UUID customerId = UUID.randomUUID();

        mockMvc.perform(put("/api/v1/fraud/customer-stats/" + customerId + "/total-orders"))
                .andExpect(status().isBadRequest());
    }
}
