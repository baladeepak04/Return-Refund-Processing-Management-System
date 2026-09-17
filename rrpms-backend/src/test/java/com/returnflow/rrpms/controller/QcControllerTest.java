package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.QcInspectionRequest;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.ConditionGrade;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.FunctionalTest;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.service.QcInspectionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = QcController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class QcControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private QcInspectionService qcInspectionService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void submit_returns400_whenReturnIdMissing() throws Exception {
        String json = "{\"conditionGrade\":\"MINT\",\"functionalTest\":\"PASS\",\"complaintValidated\":true,\"disposition\":\"RESTOCK_NEW\"}";

        mockMvc.perform(post("/api/v1/qc").contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submit_returns200_forValidRequest() throws Exception {
        when(qcInspectionService.submit(any(), any())).thenReturn(new QcInspection());
        QcInspectionRequest req = new QcInspectionRequest(UUID.randomUUID(), ConditionGrade.MINT, FunctionalTest.PASS, true, null, Disposition.RESTOCK_NEW, null);

        mockMvc.perform(post("/api/v1/qc").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void get_returns404_whenInspectionMissing() throws Exception {
        UUID id = UUID.randomUUID();
        when(qcInspectionService.get(id)).thenThrow(new NotFoundException("QC inspection not found: " + id));

        mockMvc.perform(get("/api/v1/qc/" + id))
                .andExpect(status().isNotFound());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void get_returnsResource_whenCustomerOwnsTheUnderlyingReturn() throws Exception {
        UUID id = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().id(customerId).role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer, null, java.util.List.of()));

        QcInspection inspection = QcInspection.builder().id(id)
                .returnRequest(ReturnRequest.builder().customerId(customerId).build())
                .build();
        when(qcInspectionService.get(id)).thenReturn(inspection);

        mockMvc.perform(get("/api/v1/qc/" + id))
                .andExpect(status().isOk());
    }

    @Test
    void get_returns404_whenCustomerDoesNotOwnTheUnderlyingReturn() throws Exception {
        UUID id = UUID.randomUUID();
        User caller = User.builder().id(UUID.randomUUID()).role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(caller, null, java.util.List.of()));

        QcInspection inspection = QcInspection.builder().id(id)
                .returnRequest(ReturnRequest.builder().customerId(UUID.randomUUID()).build())
                .build();
        when(qcInspectionService.get(id)).thenReturn(inspection);

        mockMvc.perform(get("/api/v1/qc/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void list_returns200() throws Exception {
        when(qcInspectionService.list()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/qc"))
                .andExpect(status().isOk());
    }
}
