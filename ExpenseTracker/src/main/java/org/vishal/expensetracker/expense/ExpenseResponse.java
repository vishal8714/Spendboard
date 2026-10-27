package org.vishal.expensetracker.expense;

import org.vishal.expensetracker.category.CategoryResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ExpenseResponse(
        Long id,
        BigDecimal amount,
        String description,
        LocalDate date,
        CategoryResponse category,
        Long recurringExpenseId,     // null unless created by a recurring rule
        Instant createdAt
) {}
