package com.returnflow.rrpms.service;

import com.returnflow.rrpms.entity.CustomerReturnStats;
import com.returnflow.rrpms.entity.FraudFlag;
import com.returnflow.rrpms.enums.FraudFlagStatus;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.CustomerReturnStatsRepository;
import com.returnflow.rrpms.repository.FraudFlagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FraudFlagServiceTest {

    @Mock
    private FraudFlagRepository repository;

    @Mock
    private CustomerReturnStatsRepository customerReturnStatsRepository;

    @InjectMocks
    private FraudFlagService fraudFlagService;

    private UUID flagId;
    private FraudFlag flag;

    @BeforeEach
    void setUp() {
        flagId = UUID.randomUUID();
        flag = FraudFlag.builder()
                .id(flagId)
                .customerId(UUID.randomUUID())
                .flagType("EXCESSIVE_RETURNS")
                .status(FraudFlagStatus.OPEN)
                .build();
    }

    @Test
    void queue_returnsAllFlags() {
        when(repository.findAll()).thenReturn(List.of(flag));

        List<FraudFlag> queue = fraudFlagService.queue();

        assertThat(queue).hasSize(1);
        assertThat(queue.get(0).getId()).isEqualTo(flagId);
    }

    @Test
    void blacklist_setsStatusToConfirmed() {
        when(repository.findById(flagId)).thenReturn(Optional.of(flag));
        when(repository.save(any(FraudFlag.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudFlag result = fraudFlagService.blacklist(flagId);

        assertThat(result.getStatus()).isEqualTo(FraudFlagStatus.CONFIRMED);
    }

    @Test
    void investigate_setsStatusToInvestigating() {
        when(repository.findById(flagId)).thenReturn(Optional.of(flag));
        when(repository.save(any(FraudFlag.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudFlag result = fraudFlagService.investigate(flagId);

        assertThat(result.getStatus()).isEqualTo(FraudFlagStatus.INVESTIGATING);
    }

    @Test
    void clear_setsStatusToCleared() {
        when(repository.findById(flagId)).thenReturn(Optional.of(flag));
        when(repository.save(any(FraudFlag.class))).thenAnswer(inv -> inv.getArgument(0));

        FraudFlag result = fraudFlagService.clear(flagId);

        assertThat(result.getStatus()).isEqualTo(FraudFlagStatus.CLEARED);
    }

    @Test
    void get_throwsNotFound_whenMissing() {
        when(repository.findById(flagId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fraudFlagService.get(flagId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Fraud flag not found");
    }

    @Test
    void setTotalOrders_updatesExistingStats() {
        UUID customerId = UUID.randomUUID();
        CustomerReturnStats stats = CustomerReturnStats.builder()
                .customerId(customerId)
                .totalOrders(5)
                .build();
        when(customerReturnStatsRepository.findByCustomerId(customerId)).thenReturn(Optional.of(stats));
        when(customerReturnStatsRepository.save(any(CustomerReturnStats.class))).thenAnswer(inv -> inv.getArgument(0));

        CustomerReturnStats updated = fraudFlagService.setTotalOrders(customerId, 12);

        assertThat(updated.getTotalOrders()).isEqualTo(12);
        assertThat(updated.getCustomerId()).isEqualTo(customerId);
    }

    @Test
    void setTotalOrders_createsNewStatsWhenNoneExist() {
        UUID customerId = UUID.randomUUID();
        when(customerReturnStatsRepository.findByCustomerId(customerId)).thenReturn(Optional.empty());
        when(customerReturnStatsRepository.save(any(CustomerReturnStats.class))).thenAnswer(inv -> inv.getArgument(0));

        CustomerReturnStats updated = fraudFlagService.setTotalOrders(customerId, 8);

        assertThat(updated.getTotalOrders()).isEqualTo(8);
        assertThat(updated.getCustomerId()).isEqualTo(customerId);
    }

    @Test
    void listStats_returnsAllStats() {
        CustomerReturnStats stats = CustomerReturnStats.builder().totalOrders(3).build();
        when(customerReturnStatsRepository.findAll()).thenReturn(List.of(stats));

        List<CustomerReturnStats> list = fraudFlagService.listStats();

        assertThat(list).hasSize(1);
    }
}
