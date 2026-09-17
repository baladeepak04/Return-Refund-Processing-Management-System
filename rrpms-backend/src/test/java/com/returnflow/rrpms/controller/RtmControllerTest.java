package com.returnflow.rrpms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.returnflow.rrpms.dto.CreateRtmBatchRequest;
import com.returnflow.rrpms.entity.RtmBatch;
import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.RtmBatchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RtmController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class RtmControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private RtmBatchService rtmBatchService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void createBatch_returns400_whenSupplierReturnIdsMissing() throws Exception {
        String json = "{\"supplierId\":\"" + UUID.randomUUID() + "\",\"supplierName\":\"Acme\"}";

        mockMvc.perform(post("/api/v1/rtm").contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createBatch_returns200_forValidRequest() throws Exception {
        when(rtmBatchService.createBatch(any())).thenReturn(new RtmBatch());
        CreateRtmBatchRequest req = new CreateRtmBatchRequest(UUID.randomUUID(), "Acme Supplies", List.of(UUID.randomUUID()));

        mockMvc.perform(post("/api/v1/rtm").contentType("application/json").content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void markDisputed_worksWithoutNotesParam() throws Exception {
        UUID id = UUID.randomUUID();
        when(rtmBatchService.markDisputed(id, null)).thenReturn(new RtmBatch());

        mockMvc.perform(put("/api/v1/rtm/" + id + "/dispute"))
                .andExpect(status().isOk());

        verify(rtmBatchService).markDisputed(id, null);
    }

    @Test
    void markDisputed_passesNotesParam_whenProvided() throws Exception {
        UUID id = UUID.randomUUID();
        when(rtmBatchService.markDisputed(id, "Wrong count")).thenReturn(new RtmBatch());

        mockMvc.perform(put("/api/v1/rtm/" + id + "/dispute").param("notes", "Wrong count"))
                .andExpect(status().isOk());

        verify(rtmBatchService).markDisputed(id, "Wrong count");
    }
}
