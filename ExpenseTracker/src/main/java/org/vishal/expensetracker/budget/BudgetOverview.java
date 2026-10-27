package org.vishal.expensetracker.budget;

import java.math.BigDecimal;
import java.util.List;

/** Every category with its budget (null if none) and what was spent in the month. */
public record BudgetOverview(String month, List<Item> categories) {

    public record Item(Long categoryId, String categoryName, BigDecimal budget, BigDecimal spent) {}
}
