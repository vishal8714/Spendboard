package org.vishal.expensetracker.budget;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record BudgetRequest(

        @NotNull(message = "Budget is required")
        @Positive(message = "Budget must be greater than 0")
        @Digits(integer = 8, fraction = 2, message = "Budget can have at most 8 digits and 2 decimal places")
        BigDecimal amount
) {}
