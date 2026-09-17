package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.ReturnCommunication;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.enums.CommStatus;
import com.returnflow.rrpms.integration.NotificationService;
import com.returnflow.rrpms.repository.ReturnCommunicationRepository;
import com.returnflow.rrpms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommunicationService {

    private final NotificationService notificationService;
    private final ReturnCommunicationRepository repository;
    private final UserRepository userRepository;

    public void sendMilestone(ReturnRequest returnRequest, String eventType, String message) {
        CommChannel channel = userRepository.findById(returnRequest.getCustomerId())
                .map(com.returnflow.rrpms.entity.User::getPreferredChannel)
                .orElse(CommChannel.SMS);
        boolean delivered = notificationService.send(returnRequest.getCustomerId().toString(), channel.name(), eventType, message);

        ReturnCommunication comm = ReturnCommunication.builder()
                .returnRequest(returnRequest)
                .eventType(eventType)
                .channel(channel)
                .status(delivered ? CommStatus.SENT : CommStatus.FAILED)
                .build();
        repository.save(comm);
    }

    public void sendRefundReceipt(ReturnRequest returnRequest, java.math.BigDecimal amount,
                                   com.returnflow.rrpms.enums.RefundMethod method, java.time.LocalDate expectedDate) {
        String message = "Refund receipt: " + amount + " via " + method
                + ". Expected by " + expectedDate + ".";
        boolean delivered = notificationService.send(returnRequest.getCustomerId().toString(),
                CommChannel.EMAIL.name(), "REFUND_RECEIPT", message);

        ReturnCommunication comm = ReturnCommunication.builder()
                .returnRequest(returnRequest)
                .eventType("REFUND_RECEIPT")
                .channel(CommChannel.EMAIL)
                .status(delivered ? CommStatus.SENT : CommStatus.FAILED)
                .build();
        repository.save(comm);
    }
}
