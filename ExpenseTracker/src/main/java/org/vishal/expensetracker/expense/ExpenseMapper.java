package org.vishal.expensetracker.expense;

import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.category.CategoryMapper;
import org.vishal.expensetracker.user.User;

public final class ExpenseMapper {

    private ExpenseMapper() {}

    public static Expense toEntity(ExpenseRequest request, Category category, User user) {
        return new Expense(
                request.amount(),
                request.description(),
                request.date(),
                category,
                user
        );
    }

    public static void updateEntity(Expense expense, ExpenseRequest request, Category category) {
        expense.setAmount(request.amount());
        expense.setDescription(request.description());
        expense.setDate(request.date());
        expense.setCategory(category);
    }

    public static ExpenseResponse toResponse(Expense expense) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getAmount(),
                expense.getDescription(),
                expense.getDate(),
                CategoryMapper.toResponse(expense.getCategory()),
                expense.getCreatedAt()
        );
    }
}
