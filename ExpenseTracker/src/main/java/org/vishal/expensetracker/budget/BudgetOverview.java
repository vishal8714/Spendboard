package org.vishal.expensetracker.budget;

import java.math.BigDecimal;
import java.util.List;

/**
 * overallBudget: the limit for all spending in the month (null if none set).
 * categories: every category with its own budget (null if none) and what was spent in the month.
 */
public record BudgetOverview(String month, BigDecimal overallBudget, List<Item> categories) {

    public record Item(Long categoryId, String categoryName, BigDecimal budget, BigDecimal spent) {}
}
