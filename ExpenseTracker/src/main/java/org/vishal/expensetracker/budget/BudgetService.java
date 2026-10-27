package org.vishal.expensetracker.budget;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vishal.expensetracker.auth.CurrentUser;
import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.category.CategoryRepository;
import org.vishal.expensetracker.common.ResourceNotFoundException;
import org.vishal.expensetracker.common.UnauthorizedException;
import org.vishal.expensetracker.user.User;
import org.vishal.expensetracker.user.UserRepository;
import org.vishal.expensetracker.expense.CategoryTotal;
import org.vishal.expensetracker.expense.ExpenseRepository;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class BudgetService {

    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public BudgetService(CategoryRepository categoryRepository,
                         ExpenseRepository expenseRepository,
                         UserRepository userRepository,
                         CurrentUser currentUser) {
        this.categoryRepository = categoryRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public BudgetOverview getOverview(YearMonth month) {
        Long userId = currentUser.id();
        Map<Long, BigDecimal> spent = expenseRepository
                .totalsByCategory(userId, month.atDay(1), month.atEndOfMonth()).stream()
                .collect(Collectors.toMap(CategoryTotal::categoryId, CategoryTotal::total));

        var items = categoryRepository.findByUserId(userId, Sort.by("name")).stream()
                .map(c -> new BudgetOverview.Item(c.getId(), c.getName(), c.getMonthlyBudget(),
                        spent.getOrDefault(c.getId(), BigDecimal.ZERO)))
                .toList();
        BigDecimal overall = userRepository.findById(userId).map(User::getMonthlyBudget).orElse(null);
        return new BudgetOverview(month.toString(), overall, items);
    }

    /** amount null removes the overall budget. */
    @Transactional
    public void setOverallBudget(BigDecimal amount) {
        userRepository.findById(currentUser.id())
                .orElseThrow(() -> new UnauthorizedException("You need to log in"))
                .setMonthlyBudget(amount);
    }

    @Transactional
    public void setBudget(Long categoryId, BigDecimal amount) {
        findCategory(categoryId).setMonthlyBudget(amount);
    }

    @Transactional
    public void removeBudget(Long categoryId) {
        findCategory(categoryId).setMonthlyBudget(null);
    }

    private Category findCategory(Long id) {
        return categoryRepository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
    }
}
