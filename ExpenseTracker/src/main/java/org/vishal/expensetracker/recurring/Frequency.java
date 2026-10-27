package org.vishal.expensetracker.recurring;

import java.time.LocalDate;

public enum Frequency {
    DAILY, WEEKLY, MONTHLY, YEARLY;

    /**
     * The n-th occurrence (0 = the start date). Always counted from the start date, never from the
     * previous occurrence, so a rule starting on the 31st lands on the 31st again after a short month.
     */
    public LocalDate occurrence(LocalDate start, long n) {
        return switch (this) {
            case DAILY -> start.plusDays(n);
            case WEEKLY -> start.plusWeeks(n);
            case MONTHLY -> start.plusMonths(n);
            case YEARLY -> start.plusYears(n);
        };
    }
}
