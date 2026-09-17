package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.QcInspectionRequest;
import com.returnflow.rrpms.entity.QcInspection;
import com.returnflow.rrpms.entity.ReturnRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.ConditionGrade;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.FunctionalTest;
import com.returnflow.rrpms.enums.ReturnStatus;
import com.returnflow.rrpms.enums.ReturnType;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.QcInspectionRepository;
import com.returnflow.rrpms.repository.ReturnRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QcInspectionServiceTest {

    @Mock private QcInspectionRepository qcInspectionRepository;
    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private RestockService restockService;
    @Mock private LiquidationService liquidationService;
    @Mock private CommunicationService communicationService;
    @Mock private FraudDetectionService fraudDetectionService;
    @Mock private ReturnEventPublisher returnEventPublisher;
    @Mock private com.returnflow.rrpms.repository.RefundRepository refundRepository;

    @InjectMocks private QcInspectionService qcInspectionService;

    @Test
    void submit_throwsNotFound_whenReturnDoesNotExist() {
        UUID returnId = UUID.randomUUID();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.empty());
        QcInspectionRequest req = new QcInspectionRequest(returnId, ConditionGrade.MINT, FunctionalTest.PASS, true, null, Disposition.RESTOCK_NEW, null);

        assertThatThrownBy(() -> qcInspectionService.submit(req, new User()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void submit_setsReturnStatusToQcDone() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).returnType(ReturnType.RETURN).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(qcInspectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QcInspectionRequest req = new QcInspectionRequest(returnId, ConditionGrade.MINT, FunctionalTest.PASS, true, null, Disposition.RESTOCK_NEW, null);
        qcInspectionService.submit(req, new User());

        assertThat(returnRequest.getStatus()).isEqualTo(ReturnStatus.QC_DONE);
        verify(returnRequestRepository).save(returnRequest);
    }

    @Test
    void submit_triggersRestockAndLiquidation_forEveryInspection() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).returnType(ReturnType.RETURN).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(qcInspectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QcInspectionRequest req = new QcInspectionRequest(returnId, ConditionGrade.DAMAGED, FunctionalTest.FAIL, true, null, Disposition.DISPOSE, null);
        QcInspection result = qcInspectionService.submit(req, new User());

        // Both are always called — each service internally decides whether
        // its disposition applies (RestockService/LiquidationService are
        // no-ops for a non-matching disposition, not skipped here).
        verify(restockService).restockFromInspection(result);
        verify(liquidationService).routeFromInspection(result);
    }

    @Test
    void submit_runsFraudMismatchCheck_onEverySubmission() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).returnType(ReturnType.RETURN).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(qcInspectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QcInspectionRequest req = new QcInspectionRequest(returnId, ConditionGrade.FAIR, FunctionalTest.NA, false, null, Disposition.LIQUIDATE, null);
        QcInspection result = qcInspectionService.submit(req, new User());

        verify(fraudDetectionService).checkQcMismatch(any(QcInspection.class));
        assertThat(result.isComplaintValidated()).isFalse();
    }

    @Test
    void submit_sendsMilestoneWithExchangeWording_forExchangeType() {
        UUID returnId = UUID.randomUUID();
        ReturnRequest returnRequest = ReturnRequest.builder().id(returnId).returnType(ReturnType.EXCHANGE).build();
        when(returnRequestRepository.findById(returnId)).thenReturn(java.util.Optional.of(returnRequest));
        when(qcInspectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QcInspectionRequest req = new QcInspectionRequest(returnId, ConditionGrade.GOOD, FunctionalTest.PASS, true, null, Disposition.RESTOCK_REFURB, null);
        qcInspectionService.submit(req, new User());

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(communicationService).sendMilestone(any(), org.mockito.ArgumentMatchers.eq("QC_COMPLETE"), messageCaptor.capture());
        assertThat(messageCaptor.getValue()).contains("Replacement will be dispatched");
    }

    @Test
    void get_throwsNotFound_whenInspectionDoesNotExist() {
        UUID id = UUID.randomUUID();
        when(qcInspectionRepository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> qcInspectionService.get(id)).isInstanceOf(NotFoundException.class);
    }
}
