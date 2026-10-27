package org.vishal.expensetracker.expense;

import java.math.BigDecimal;
import java.util.List;

public record MonthlySummary(String month, BigDecimal total, List<CategoryTotal> byCategory) {}
