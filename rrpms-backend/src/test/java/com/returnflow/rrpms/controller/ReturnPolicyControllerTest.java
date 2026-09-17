package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.ReturnPolicyRequest;
import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.enums.PolicyEntityType;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.service.ReturnPolicyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReturnPolicyController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class ReturnPolicyControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private ReturnPolicyService service;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void create_returns400_whenReturnWindowDaysMissing() throws Exception {
        String json = "{\"name\":\"Default\",\"entityType\":\"PLATFORM\",\"effectiveFrom\":\"2026-01-01\"}";

        mockMvc.perform(post("/api/v1/policies").contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns200_forValidRequest() throws Exception {
        when(service.create(any())).thenReturn(new ReturnPolicy());
        ReturnPolicyRequest req = new ReturnPolicyRequest("Default", PolicyEntityType.PLATFORM, null, 7, true, true, null, LocalDate.now());

        mockMvc.perform(post("/api/v1/policies").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void get_returns404_whenPolicyMissing() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.get(id)).thenThrow(new NotFoundException("Policy not found: " + id));

        mockMvc.perform(get("/api/v1/policies/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_returns200_forExistingPolicy() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/policies/" + id))
                .andExpect(status().isOk());
    }
}
