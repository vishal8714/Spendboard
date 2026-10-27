package org.vishal.expensetracker.recurring;

import org.vishal.expensetracker.category.CategoryMapper;
import org.vishal.expensetracker.category.CategoryResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** nextDate is null once the rule has ended. status: ACTIVE, PAUSED or ENDED. */
public record RecurringExpenseResponse(
        Long id,
        BigDecimal amount,
        String description,
        CategoryResponse category,
        Frequency frequency,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate nextDate,
        String status,
        Instant createdAt
) {

    public static RecurringExpenseResponse from(RecurringExpense r) {
        String status = r.isFinished() ? "ENDED" : r.isActive() ? "ACTIVE" : "PAUSED";
        return new RecurringExpenseResponse(
                r.getId(),
                r.getAmount(),
                r.getDescription(),
                CategoryMapper.toResponse(r.getCategory()),
                r.getFrequency(),
                r.getStartDate(),
                r.getEndDate(),
                r.isFinished() ? null : r.getNextDate(),
                status,
                r.getCreatedAt()
        );
    }
}
