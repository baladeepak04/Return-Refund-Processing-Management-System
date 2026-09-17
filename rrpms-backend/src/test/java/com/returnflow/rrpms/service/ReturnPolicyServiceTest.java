package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.ReturnPolicyRequest;
import com.returnflow.rrpms.dto.UpdatePolicyRequest;
import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.enums.PolicyEntityType;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReturnPolicyServiceTest {

    @Mock
    private ReturnPolicyRepository repository;

    @InjectMocks
    private ReturnPolicyService returnPolicyService;

    private UUID policyId;
    private ReturnPolicy policy;

    @BeforeEach
    void setUp() {
        policyId = UUID.randomUUID();
        policy = ReturnPolicy.builder()
                .id(policyId)
                .name("Default Electronics Policy")
                .entityType(PolicyEntityType.CATEGORY)
                .entityRef("ELECTRONICS")
                .returnWindowDays(10)
                .freeReturn(true)
                .exchangeEligible(true)
                .active(true)
                .effectiveFrom(LocalDate.now())
                .build();
    }

    @Test
    void listAll_returnsAllPolicies() {
        when(repository.findAll()).thenReturn(List.of(policy));

        List<ReturnPolicy> result = returnPolicyService.listAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Default Electronics Policy");
    }

    @Test
    void create_savesAndReturnsNewPolicy() {
        ReturnPolicyRequest req = new ReturnPolicyRequest(
                "Apparel Policy", PolicyEntityType.CATEGORY, "APPAREL", 15, true, true, List.of(), LocalDate.now());
        when(repository.save(any(ReturnPolicy.class))).thenAnswer(inv -> {
            ReturnPolicy p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        ReturnPolicy result = returnPolicyService.create(req);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Apparel Policy");
        assertThat(result.getReturnWindowDays()).isEqualTo(15);
        assertThat(result.isActive()).isTrue();
    }

    @Test
    void get_returnsPolicyWhenFound() {
        when(repository.findById(policyId)).thenReturn(Optional.of(policy));

        ReturnPolicy result = returnPolicyService.get(policyId);

        assertThat(result).isEqualTo(policy);
    }

    @Test
    void get_throwsNotFound_whenMissing() {
        when(repository.findById(policyId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> returnPolicyService.get(policyId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Policy not found");
    }

    @Test
    void delete_callsRepositoryDelete() {
        returnPolicyService.delete(policyId);

        verify(repository, times(1)).deleteById(policyId);
    }

    @Test
    void update_modifiesAndSavesPolicy() {
        when(repository.findById(policyId)).thenReturn(Optional.of(policy));
        when(repository.save(any(ReturnPolicy.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdatePolicyRequest req = new UpdatePolicyRequest(
                "Updated Name", PolicyEntityType.SELLER, "SELLER-999", 30, false, false, false);

        ReturnPolicy updated = returnPolicyService.update(policyId, req);

        assertThat(updated.getName()).isEqualTo("Updated Name");
        assertThat(updated.getEntityType()).isEqualTo(PolicyEntityType.SELLER);
        assertThat(updated.getEntityRef()).isEqualTo("SELLER-999");
        assertThat(updated.getReturnWindowDays()).isEqualTo(30);
        assertThat(updated.isFreeReturn()).isFalse();
        assertThat(updated.isExchangeEligible()).isFalse();
        assertThat(updated.isActive()).isFalse();
    }
}
