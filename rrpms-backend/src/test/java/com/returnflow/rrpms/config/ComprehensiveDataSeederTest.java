package com.returnflow.rrpms.config;

import com.returnflow.rrpms.entity.*;
import com.returnflow.rrpms.enums.*;
import com.returnflow.rrpms.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComprehensiveDataSeederTest {

    @Mock private UserRepository userRepository;
    @Mock private ReturnPolicyRepository returnPolicyRepository;
    @Mock private CustomerReturnStatsRepository customerReturnStatsRepository;
    @Mock private ReturnRequestRepository returnRequestRepository;
    @Mock private ReturnItemRepository returnItemRepository;
    @Mock private PickupRepository pickupRepository;
    @Mock private QcInspectionRepository qcInspectionRepository;
    @Mock private RestockedItemRepository restockedItemRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private LiquidationBatchRepository liquidationBatchRepository;
    @Mock private RtmBatchRepository rtmBatchRepository;
    @Mock private SupplierReturnRepository supplierReturnRepository;
    @Mock private FraudFlagRepository fraudFlagRepository;
    @Mock private ReturnCommunicationRepository returnCommunicationRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ComprehensiveDataSeeder comprehensiveDataSeeder;

    @Test
    void testSkipsWhenAlreadyPopulated() {
        when(returnRequestRepository.count()).thenReturn(20L);

        comprehensiveDataSeeder.run();

        verify(returnRequestRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void testSeedsComprehensiveDataWhenUnderpopulated() {
        when(returnRequestRepository.count()).thenReturn(5L);
        when(passwordEncoder.encode(any())).thenReturn("hashedPassword");

        ReturnPolicy mockPolicy = ReturnPolicy.builder().name("Platform Default").entityType(PolicyEntityType.PLATFORM).build();
        when(returnPolicyRepository.findAll()).thenReturn(List.of(mockPolicy));
        when(returnPolicyRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UUID dummyId = UUID.randomUUID();
        User mockCustomer = User.builder().id(dummyId).email("priya@example.com").name("Priya Sharma").role(Role.CUSTOMER).build();
        User mockQc = User.builder().id(UUID.randomUUID()).email("deepak.qc@returnflow.io").name("Deepak Nair").role(Role.WAREHOUSE_QC).build();
        when(userRepository.findAll()).thenReturn(List.of(mockCustomer, mockQc));
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            return u;
        });

        when(customerReturnStatsRepository.findByCustomerId(any())).thenReturn(Optional.empty());

        when(returnRequestRepository.save(any())).thenAnswer(invocation -> {
            ReturnRequest req = invocation.getArgument(0);
            if (req.getId() == null) {
                req.setId(UUID.randomUUID());
            }
            return req;
        });

        when(qcInspectionRepository.save(any())).thenAnswer(invocation -> {
            QcInspection qc = invocation.getArgument(0);
            if (qc.getId() == null) {
                qc.setId(UUID.randomUUID());
            }
            return qc;
        });

        when(rtmBatchRepository.save(any())).thenAnswer(invocation -> {
            RtmBatch batch = invocation.getArgument(0);
            if (batch.getId() == null) {
                batch.setId(UUID.randomUUID());
            }
            return batch;
        });

        comprehensiveDataSeeder.run();

        verify(returnPolicyRepository, atLeastOnce()).save(any(ReturnPolicy.class));
        verify(userRepository, atLeastOnce()).save(any(User.class));
        verify(customerReturnStatsRepository, atLeastOnce()).save(any(CustomerReturnStats.class));
        verify(returnRequestRepository, atLeastOnce()).save(any(ReturnRequest.class));
        verify(returnItemRepository, atLeastOnce()).save(any(ReturnItem.class));
        verify(pickupRepository, atLeastOnce()).save(any(Pickup.class));
        verify(qcInspectionRepository, atLeastOnce()).save(any(QcInspection.class));
        verify(restockedItemRepository, atLeastOnce()).save(any(RestockedItem.class));
        verify(refundRepository, atLeastOnce()).save(any(Refund.class));
        verify(liquidationBatchRepository, atLeastOnce()).saveAll(any());
        verify(rtmBatchRepository, atLeastOnce()).save(any(RtmBatch.class));
        verify(supplierReturnRepository, atLeastOnce()).saveAll(any());
        verify(fraudFlagRepository, atLeastOnce()).save(any(FraudFlag.class));
        verify(returnCommunicationRepository, atLeastOnce()).save(any(ReturnCommunication.class));
    }
}
