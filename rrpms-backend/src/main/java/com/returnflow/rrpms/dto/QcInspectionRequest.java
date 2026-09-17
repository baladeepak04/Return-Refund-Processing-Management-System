package com.returnflow.rrpms.dto;

import com.returnflow.rrpms.enums.ConditionGrade;
import com.returnflow.rrpms.enums.Disposition;
import com.returnflow.rrpms.enums.FunctionalTest;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record QcInspectionRequest(
        @NotNull UUID returnId,
        @NotNull ConditionGrade conditionGrade,
        @NotNull FunctionalTest functionalTest,
        boolean complaintValidated,
        List<String> images,
        @NotNull Disposition disposition,
        String notes
) {}
