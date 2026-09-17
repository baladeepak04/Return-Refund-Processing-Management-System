package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.exception.GlobalExceptionHandler;
import com.returnflow.rrpms.service.LiquidationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Web-layer: the real PDF certificate endpoint sends actual bytes with a
// real application/pdf content type, not JSON wrapping a base64 string.
@WebMvcTest(controllers = LiquidationController.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.context.annotation.Import(GlobalExceptionHandler.class)
class LiquidationControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private LiquidationService liquidationService;
    @MockBean private com.returnflow.rrpms.security.JwtService jwtService;
    @MockBean private com.returnflow.rrpms.repository.UserRepository userRepository;

    @Test
    void certificate_returnsRealPdfContentType_andBytes() throws Exception {
        UUID id = UUID.randomUUID();
        byte[] fakePdfBytes = "%PDF-1.4 fake content".getBytes();
        when(liquidationService.generateCertificatePdf(id)).thenReturn(fakePdfBytes);

        mockMvc.perform(get("/api/v1/liquidation/" + id + "/certificate"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", "inline; filename=disposal-certificate-" + id + ".pdf"))
                .andExpect(content().bytes(fakePdfBytes));
    }

    @Test
    void certificate_returns400_whenBatchHasNoCertificate() throws Exception {
        UUID id = UUID.randomUUID();
        when(liquidationService.generateCertificatePdf(id)).thenThrow(new IllegalStateException("This batch has no disposal certificate"));

        mockMvc.perform(get("/api/v1/liquidation/" + id + "/certificate"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_returns200() throws Exception {
        when(liquidationService.list()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/liquidation"))
                .andExpect(status().isOk());
    }

    @Test
    void settle_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(liquidationService.settle(any(), any())).thenReturn(new com.returnflow.rrpms.entity.LiquidationBatch());

        String json = "{\"payoutAmount\":1500.00}";
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/liquidation/" + id + "/settle")
                .contentType("application/json").content(json))
                .andExpect(status().isOk());
    }
}
