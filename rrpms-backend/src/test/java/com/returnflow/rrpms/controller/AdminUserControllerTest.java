package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.CreateUserRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminUserController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class AdminUserControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private UserService userService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void create_returns400_whenEmailInvalid() throws Exception {
        CreateUserRequest req = new CreateUserRequest("Priya", "not-an-email", Role.CUSTOMER, null, "Password123!");

        mockMvc.perform(post("/api/v1/admin/users").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns200_forValidRequest() throws Exception {
        when(userService.create(any())).thenReturn(new User());
        CreateUserRequest req = new CreateUserRequest("Priya", "priya@rrpms.com", Role.CUSTOMER, null, "Password123!");

        mockMvc.perform(post("/api/v1/admin/users").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void disable_callsServiceWithFalse() throws Exception {
        UUID id = UUID.randomUUID();
        when(userService.setEnabled(id, false)).thenReturn(new User());

        mockMvc.perform(put("/api/v1/admin/users/" + id + "/disable"))
                .andExpect(status().isOk());

        verify(userService).setEnabled(id, false);
    }

    @Test
    void setVip_bindsBooleanQueryParam() throws Exception {
        UUID id = UUID.randomUUID();
        when(userService.setVip(id, true)).thenReturn(new User());

        mockMvc.perform(put("/api/v1/admin/users/" + id + "/vip").param("isVip", "true"))
                .andExpect(status().isOk());

        verify(userService).setVip(id, true);
    }

    @Test
    void list_returns200() throws Exception {
        when(userService.list()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk());
    }

    @Test
    void enable_callsServiceWithTrue() throws Exception {
        UUID id = UUID.randomUUID();
        when(userService.setEnabled(id, true)).thenReturn(new User());

        mockMvc.perform(put("/api/v1/admin/users/" + id + "/enable"))
                .andExpect(status().isOk());

        verify(userService).setEnabled(id, true);
    }
}
