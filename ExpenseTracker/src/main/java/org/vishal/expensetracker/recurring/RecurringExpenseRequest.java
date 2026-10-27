package org.vishal.expensetracker.recurring;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** On update, frequency and startDate are ignored: the schedule is fixed once created. */
public record RecurringExpenseRequest(

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than 0")
        @Digits(integer = 8, fraction = 2, message = "Amount can have at most 8 digits and 2 decimal places")
        BigDecimal amount,

        @NotBlank(message = "Description is required")
        @Size(max = 255, message = "Description must be at most 255 characters")
        String description,

        @NotNull(message = "Category id is required")
        Long categoryId,

        @NotNull(message = "Choose how often it repeats")
        Frequency frequency,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        LocalDate endDate
) {}
