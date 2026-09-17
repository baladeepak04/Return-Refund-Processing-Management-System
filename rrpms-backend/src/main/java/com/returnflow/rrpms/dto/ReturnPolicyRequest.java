package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.PolicyEntityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnPolicyRequest {
    @NotBlank
    private String name;

    @NotNull
    private PolicyEntityType entityType;

    private String entityRef;

    @NotNull
    private Integer returnWindowDays;

    private boolean freeReturn;
    private boolean exchangeEligible;
    private List<UUID> nonReturnableSkus;
    private LocalDate effectiveFrom;

    public String name() { return name; }
    public PolicyEntityType entityType() { return entityType; }
    public String entityRef() { return entityRef; }
    public Integer returnWindowDays() { return returnWindowDays; }
    public boolean freeReturn() { return freeReturn; }
    public boolean exchangeEligible() { return exchangeEligible; }
    public List<UUID> nonReturnableSkus() { return nonReturnableSkus; }
    public LocalDate effectiveFrom() { return effectiveFrom; }
}
