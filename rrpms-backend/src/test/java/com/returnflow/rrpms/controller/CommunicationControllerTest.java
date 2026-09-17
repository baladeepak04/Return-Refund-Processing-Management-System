package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.ReturnCommunication;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.repository.ReturnCommunicationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CommunicationController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class CommunicationControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private ReturnCommunicationRepository repository;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void list_usesCustomerScopedQuery_whenCustomerIdProvided() throws Exception {
        UUID customerId = UUID.randomUUID();
        when(repository.findByReturnRequest_CustomerIdOrderBySentAtDesc(customerId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/communications").param("customerId", customerId.toString()))
                .andExpect(status().isOk());

        verify(repository).findByReturnRequest_CustomerIdOrderBySentAtDesc(customerId);
        verify(repository, never()).findAll();
    }

    @Test
    void list_usesUnfilteredQuery_whenNoCustomerIdProvided() throws Exception {
        when(repository.findAll()).thenReturn(List.of(new ReturnCommunication()));

        mockMvc.perform(get("/api/v1/communications"))
                .andExpect(status().isOk());

        verify(repository).findAll();
    }
}
