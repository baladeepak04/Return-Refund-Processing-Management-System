package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.RestockedItem;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.service.RestockService;
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

@WebMvcTest(controllers = RestockController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class RestockControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private RestockService restockService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void list_returns200_withRealList() throws Exception {
        when(restockService.list()).thenReturn(List.of(new RestockedItem()));

        mockMvc.perform(get("/api/v1/restock"))
                .andExpect(status().isOk());
    }

    @Test
    void approve_callsService_andReturns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(restockService.approve(id)).thenReturn(new RestockedItem());

        mockMvc.perform(put("/api/v1/restock/" + id + "/approve"))
                .andExpect(status().isOk());

        verify(restockService).approve(id);
    }

    @Test
    void approve_returns404_whenItemMissing() throws Exception {
        UUID id = UUID.randomUUID();
        when(restockService.approve(id)).thenThrow(new NotFoundException("Restocked item not found: " + id));

        mockMvc.perform(put("/api/v1/restock/" + id + "/approve"))
                .andExpect(status().isNotFound());
    }
}
