package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.InitiateRefundRequest;
import com.returnflow.rrpms.entity.Refund;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.RefundMethod;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.exception.FraudHoldException;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.exception.QcNotCompletedException;
import com.returnflow.rrpms.service.RefundService;
import com.returnflow.rrpms.service.RefundSlaTrackingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RefundController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class RefundControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private RefundService refundService;
    @MockBean private RefundSlaTrackingService refundSlaTrackingService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void initiate_returns400_whenAmountMissing() throws Exception {
        String json = "{\"returnId\":\"" + UUID.randomUUID() + "\",\"method\":\"ORIGINAL_METHOD\"}";

        mockMvc.perform(post("/api/v1/refunds").contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void initiate_returns400_whenQcNotCompleted() throws Exception {
        when(refundService.initiate(any())).thenThrow(new QcNotCompletedException("QC inspection must be completed first"));
        InitiateRefundRequest req = new InitiateRefundRequest(UUID.randomUUID(), new BigDecimal("500"), RefundMethod.ORIGINAL_METHOD);

        mockMvc.perform(post("/api/v1/refunds").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void initiate_returns403_whenFraudHold() throws Exception {
        when(refundService.initiate(any())).thenThrow(new FraudHoldException("Return under fraud investigation"));
        InitiateRefundRequest req = new InitiateRefundRequest(UUID.randomUUID(), new BigDecimal("500"), RefundMethod.ORIGINAL_METHOD);

        mockMvc.perform(post("/api/v1/refunds").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void initiate_returns200_forValidRequest() throws Exception {
        when(refundService.initiate(any())).thenReturn(new Refund());
        InitiateRefundRequest req = new InitiateRefundRequest(UUID.randomUUID(), new BigDecimal("500"), RefundMethod.ORIGINAL_METHOD);

        mockMvc.perform(post("/api/v1/refunds").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void slaStatus_returnsRealJsonShape() throws Exception {
        UUID refundId = UUID.randomUUID();
        when(refundSlaTrackingService.isWithinSla(refundId)).thenReturn(true);

        mockMvc.perform(get("/api/v1/refunds/" + refundId + "/sla-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.withinSla").value(true));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void get_returnsResource_whenCustomerOwnsTheUnderlyingReturn() throws Exception {
        UUID refundId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().id(customerId).role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer, null, java.util.List.of()));

        Refund refund = Refund.builder().id(refundId)
                .returnRequest(ReturnRequest.builder().customerId(customerId).build())
                .build();
        when(refundService.get(refundId)).thenReturn(refund);

        mockMvc.perform(get("/api/v1/refunds/" + refundId))
                .andExpect(status().isOk());
    }

    @Test
    void get_returns404_whenCustomerDoesNotOwnTheUnderlyingReturn() throws Exception {
        UUID refundId = UUID.randomUUID();
        User caller = User.builder().id(UUID.randomUUID()).role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(caller, null, java.util.List.of()));

        Refund refund = Refund.builder().id(refundId)
                .returnRequest(ReturnRequest.builder().customerId(UUID.randomUUID()).build())
                .build();
        when(refundService.get(refundId)).thenReturn(refund);

        // Real gap this closes: a customer could previously read another
        // customer's refund amount/method by guessing a UUID.
        mockMvc.perform(get("/api/v1/refunds/" + refundId))
                .andExpect(status().isNotFound());
    }

    @Test
    void approve_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(refundService.approve(id)).thenReturn(new Refund());

        mockMvc.perform(put("/api/v1/refunds/" + id + "/approve"))
                .andExpect(status().isOk());
    }

    @Test
    void reject_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(refundService.reject(any(), any())).thenReturn(new Refund());

        String json = "{\"reason\":\"Customer evidence invalid\"}";
        mockMvc.perform(put("/api/v1/refunds/" + id + "/reject").contentType("application/json").content(json))
                .andExpect(status().isOk());
    }

    @Test
    void markCredited_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(refundService.markCredited(id)).thenReturn(new Refund());

        mockMvc.perform(put("/api/v1/refunds/" + id + "/credited"))
                .andExpect(status().isOk());
    }

    @Test
    void list_returns200() throws Exception {
        when(refundService.list()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/refunds"))
                .andExpect(status().isOk());
    }
}
