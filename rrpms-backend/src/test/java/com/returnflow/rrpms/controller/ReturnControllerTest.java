package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.InitiateReturnRequest;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.PreferredRefundMethod;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.enums.ReturnType;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.exception.ReturnWindowClosedException;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import com.returnflow.rrpms.service.ReturnRequestService;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReturnController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class ReturnControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private ReturnRequestService returnRequestService;
    @MockBean private ReturnPolicyRepository returnPolicyRepository;
    // See AuthControllerTest — same JwtAuthenticationFilter construction requirement.
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    private InitiateReturnRequest validRequest() {
        return new InitiateReturnRequest(UUID.randomUUID(), UUID.randomUUID(), ReturnType.RETURN,
                "CHANGED_MIND", PreferredRefundMethod.ORIGINAL, UUID.randomUUID(), null, null, null, null, null, null);
    }

    @Test
    void initiate_returns400_whenOrderIdMissing() throws Exception {
        String json = "{\"customerId\":\"" + UUID.randomUUID() + "\",\"returnType\":\"RETURN\","
                + "\"reasonCode\":\"CHANGED_MIND\",\"preferredRefundMethod\":\"ORIGINAL\",\"policyId\":\"" + UUID.randomUUID() + "\"}";

        mockMvc.perform(post("/api/v1/returns").contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void initiate_returns400_whenReasonCodeBlank() throws Exception {
        InitiateReturnRequest req = new InitiateReturnRequest(UUID.randomUUID(), UUID.randomUUID(), ReturnType.RETURN,
                "", PreferredRefundMethod.ORIGINAL, UUID.randomUUID(), null, null, null, null, null, null);

        mockMvc.perform(post("/api/v1/returns").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void initiate_returns200_forValidRequest() throws Exception {
        when(returnRequestService.initiate(any())).thenReturn(new ReturnRequest());

        mockMvc.perform(post("/api/v1/returns").contentType("application/json").content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk());
    }

    @Test
    void initiate_returns400_whenReturnWindowClosed() throws Exception {
        when(returnRequestService.initiate(any())).thenThrow(new ReturnWindowClosedException("Return window has closed"));

        mockMvc.perform(post("/api/v1/returns").contentType("application/json").content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void get_returns404_whenReturnDoesNotExist() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.get(id)).thenThrow(new NotFoundException("Return not found: " + id));

        mockMvc.perform(get("/api/v1/returns/" + id))
                .andExpect(status().isNotFound());
    }

    @AfterEach
    void clearSecurityContext() {
        // Ownership tests below set a real Authentication manually (since
        // addFilters=false means the real JwtAuthenticationFilter never
        // runs) — clear it so it doesn't leak into unrelated tests.
        SecurityContextHolder.clearContext();
    }

    @Test
    void get_returnsResource_whenCustomerRequestsTheirOwnReturn() throws Exception {
        UUID id = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().id(customerId).role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer, null, java.util.List.of()));

        ReturnRequest returnRequest = ReturnRequest.builder().id(id).customerId(customerId).build();
        when(returnRequestService.get(id)).thenReturn(returnRequest);

        mockMvc.perform(get("/api/v1/returns/" + id))
                .andExpect(status().isOk());
    }

    @Test
    void get_returns404_whenCustomerRequestsSomeoneElsesReturn() throws Exception {
        UUID id = UUID.randomUUID();
        UUID ownerCustomerId = UUID.randomUUID();
        UUID callerCustomerId = UUID.randomUUID();
        User caller = User.builder().id(callerCustomerId).role(Role.CUSTOMER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(caller, null, java.util.List.of()));

        ReturnRequest returnRequest = ReturnRequest.builder().id(id).customerId(ownerCustomerId).build();
        when(returnRequestService.get(id)).thenReturn(returnRequest);

        // Real gap this closes: without the ownership check, a customer
        // could read another customer's return purely by guessing/
        // incrementing a UUID in the URL — the controller previously
        // returned it with no check at all.
        mockMvc.perform(get("/api/v1/returns/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void saveDraft_returns200_evenWithBlankReasonCode() throws Exception {
        InitiateReturnRequest partial = new InitiateReturnRequest(UUID.randomUUID(), UUID.randomUUID(), ReturnType.RETURN,
                "", PreferredRefundMethod.ORIGINAL, UUID.randomUUID(), null, null, null, null, null, null);
        when(returnRequestService.saveDraft(any())).thenReturn(new ReturnRequest());

        mockMvc.perform(post("/api/v1/returns/draft").contentType("application/json").content(objectMapper.writeValueAsString(partial)))
                .andExpect(status().isOk());
    }

    @Test
    void listDrafts_returns200() throws Exception {
        UUID customerId = UUID.randomUUID();
        when(returnRequestService.listDrafts(any())).thenReturn(java.util.List.of(new ReturnRequest()));

        mockMvc.perform(get("/api/v1/returns/drafts").param("customerId", customerId.toString()))
                .andExpect(status().isOk());
    }

    @Test
    void finalizeDraft_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.finalizeDraft(id)).thenReturn(new ReturnRequest());

        mockMvc.perform(put("/api/v1/returns/" + id + "/finalize"))
                .andExpect(status().isOk());
    }

    @Test
    void cancelReturn_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.cancel(id)).thenReturn(new ReturnRequest());

        mockMvc.perform(put("/api/v1/returns/" + id + "/cancel"))
                .andExpect(status().isOk());
    }

    @Test
    void overrideReturnWindow_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.overrideReturnWindow(any(), any())).thenReturn(new ReturnRequest());

        String json = "{\"extraDays\":5,\"reason\":\"Customer delayed in hospital\"}";
        mockMvc.perform(put("/api/v1/returns/" + id + "/override").contentType("application/json").content(json))
                .andExpect(status().isOk());
    }

    @Test
    void dispatchExchange_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.dispatchExchange(id)).thenReturn(new ReturnRequest());

        mockMvc.perform(put("/api/v1/returns/" + id + "/exchange/dispatch"))
                .andExpect(status().isOk());
    }

    @Test
    void submitSatisfaction_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.submitSatisfactionFeedback(any(), anyInt(), any())).thenReturn(new ReturnRequest());

        String json = "{\"rating\":5,\"comment\":\"Fast turnaround!\"}";
        mockMvc.perform(put("/api/v1/returns/" + id + "/satisfaction").contentType("application/json").content(json))
                .andExpect(status().isOk());
    }

    @Test
    void pickupLifecycleEndpoints_return200() throws Exception {
        UUID id = UUID.randomUUID();
        when(returnRequestService.markPickedUp(id)).thenReturn(new com.returnflow.rrpms.entity.Pickup());
        when(returnRequestService.markInTransit(id)).thenReturn(new com.returnflow.rrpms.entity.Pickup());
        when(returnRequestService.markDeliveredToWarehouse(id)).thenReturn(new com.returnflow.rrpms.entity.Pickup());
        when(returnRequestService.markPickupFailed(id)).thenReturn(new com.returnflow.rrpms.entity.Pickup());
        when(returnRequestService.confirmDropOff(id)).thenReturn(new ReturnRequest());

        mockMvc.perform(put("/api/v1/returns/" + id + "/pickup/picked-up")).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/returns/" + id + "/pickup/in-transit")).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/returns/" + id + "/pickup/delivered")).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/returns/" + id + "/pickup/failed")).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/returns/" + id + "/dropoff")).andExpect(status().isOk());
    }

    @Test
    void listPolicies_returns200() throws Exception {
        when(returnPolicyRepository.findAll()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/returns/policies"))
                .andExpect(status().isOk());
    }

    @Test
    void listOverrides_returns200() throws Exception {
        when(returnRequestService.listOverrides()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/returns/overrides"))
                .andExpect(status().isOk());
    }
}
