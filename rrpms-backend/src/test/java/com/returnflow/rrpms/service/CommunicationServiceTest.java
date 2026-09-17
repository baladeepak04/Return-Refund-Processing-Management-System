package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.ReturnCommunication;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.enums.CommStatus;
import com.returnflow.rrpms.enums.RefundMethod;
import com.returnflow.rrpms.integration.NotificationService;
import com.returnflow.rrpms.repository.ReturnCommunicationRepository;
import com.returnflow.rrpms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommunicationServiceTest {

    @Mock private NotificationService notificationService;
    @Mock private ReturnCommunicationRepository repository;
    @Mock private UserRepository userRepository;
    @InjectMocks private CommunicationService communicationService;

    @Test
    void sendMilestone_usesCustomerPreferredChannel_whenUserExists() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().customerId(customerId).build();
        User user = User.builder().id(customerId).preferredChannel(CommChannel.WHATSAPP).build();
        when(userRepository.findById(customerId)).thenReturn(java.util.Optional.of(user));
        when(notificationService.send(anyString(), anyString(), anyString(), anyString())).thenReturn(true);

        communicationService.sendMilestone(returnRequest, "RETURN_INITIATED", "hello");

        verify(notificationService).send(customerId.toString(), "WHATSAPP", "RETURN_INITIATED", "hello");
        ArgumentCaptor<ReturnCommunication> captor = ArgumentCaptor.forClass(ReturnCommunication.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getChannel()).isEqualTo(CommChannel.WHATSAPP);
        assertThat(captor.getValue().getStatus()).isEqualTo(CommStatus.SENT);
    }

    @Test
    void sendMilestone_defaultsToSms_whenCustomerHasNoUserRecord() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().customerId(customerId).build();
        when(userRepository.findById(customerId)).thenReturn(java.util.Optional.empty());
        when(notificationService.send(anyString(), anyString(), anyString(), anyString())).thenReturn(true);

        communicationService.sendMilestone(returnRequest, "RETURN_INITIATED", "hello");

        verify(notificationService).send(customerId.toString(), "SMS", "RETURN_INITIATED", "hello");
    }

    @Test
    void sendMilestone_recordsFailedStatus_whenDeliveryFails() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().customerId(customerId).build();
        when(userRepository.findById(customerId)).thenReturn(java.util.Optional.empty());
        when(notificationService.send(anyString(), anyString(), anyString(), anyString())).thenReturn(false);

        communicationService.sendMilestone(returnRequest, "RETURN_INITIATED", "hello");

        ArgumentCaptor<ReturnCommunication> captor = ArgumentCaptor.forClass(ReturnCommunication.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(CommStatus.FAILED);
    }

    @Test
    void sendRefundReceipt_alwaysUsesEmail_regardlessOfPreference() {
        UUID customerId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().customerId(customerId).build();
        when(notificationService.send(anyString(), anyString(), anyString(), anyString())).thenReturn(true);

        communicationService.sendRefundReceipt(returnRequest, new BigDecimal("500"), RefundMethod.BANK_TRANSFER, LocalDate.now().plusDays(7));

        verify(notificationService).send(any(), org.mockito.ArgumentMatchers.eq("EMAIL"), org.mockito.ArgumentMatchers.eq("REFUND_RECEIPT"), anyString());
        // Preference lookup is never even needed for a receipt.
        verify(userRepository, org.mockito.Mockito.never()).findById(any());
    }

    @Test
    void sendRefundReceipt_messageIncludesAmountMethodAndDate() {
        ReturnRequest returnRequest = ReturnRequest.builder().customerId(UUID.randomUUID()).build();
        LocalDate expected = LocalDate.of(2026, 9, 5);
        when(notificationService.send(anyString(), anyString(), anyString(), anyString())).thenReturn(true);

        communicationService.sendRefundReceipt(returnRequest, new BigDecimal("999.50"), RefundMethod.STORE_CREDIT, expected);

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).send(any(), any(), any(), messageCaptor.capture());
        assertThat(messageCaptor.getValue()).contains("999.50").contains("STORE_CREDIT").contains("2026-09-05");
    }
}
