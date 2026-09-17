package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.PolicyEntityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePolicyRequest {
    @NotBlank
    private String name;

    @NotNull
    private PolicyEntityType entityType;

    private String entityRef;

    @NotNull
    private Integer returnWindowDays;

    private boolean freeReturn;
    private boolean exchangeEligible;
    private boolean active;

    public String name() { return name; }
    public PolicyEntityType entityType() { return entityType; }
    public String entityRef() { return entityRef; }
    public Integer returnWindowDays() { return returnWindowDays; }
    public boolean freeReturn() { return freeReturn; }
    public boolean exchangeEligible() { return exchangeEligible; }
    public boolean active() { return active; }
}
