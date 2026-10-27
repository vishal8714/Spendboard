package org.vishal.expensetracker.expense;

import java.math.BigDecimal;

public record CategoryTotal(Long categoryId, String categoryName, BigDecimal total) {}
