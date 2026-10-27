package org.vishal.expensetracker.expense;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vishal.expensetracker.auth.CurrentUser;
import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.category.CategoryRepository;
import org.vishal.expensetracker.common.BadRequestException;
import org.vishal.expensetracker.common.ResourceNotFoundException;
import org.vishal.expensetracker.user.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public ExpenseService(ExpenseRepository expenseRepository,
                          CategoryRepository categoryRepository,
                          UserRepository userRepository,
                          CurrentUser currentUser) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public List<ExpenseResponse> search(LocalDate from, LocalDate to, Long categoryId) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("'from' must be on or before 'to'");
        }
        return expenseRepository.search(currentUser.id(), from, to, categoryId).stream()
                .map(ExpenseMapper::toResponse)
                .toList();
    }

    public ExpenseResponse getById(Long id) {
        return ExpenseMapper.toResponse(findExpense(id));
    }

    public MonthlySummary getMonthlySummary(YearMonth month) {
        List<CategoryTotal> totals = expenseRepository.totalsByCategory(
                currentUser.id(), month.atDay(1), month.atEndOfMonth());
        BigDecimal total = totals.stream()
                .map(CategoryTotal::total)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new MonthlySummary(month.toString(), total, totals);
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest request) {
        Long userId = currentUser.id();
        Category category = findCategory(request.categoryId());
        Expense expense = ExpenseMapper.toEntity(request, category, userRepository.getReferenceById(userId));
        return ExpenseMapper.toResponse(expenseRepository.save(expense));
    }

    @Transactional
    public ExpenseResponse update(Long id, ExpenseRequest request) {
        Expense expense = findExpense(id);
        Category category = findCategory(request.categoryId());
        ExpenseMapper.updateEntity(expense, request, category);
        return ExpenseMapper.toResponse(expense);
    }

    @Transactional
    public void delete(Long id) {
        expenseRepository.delete(findExpense(id));
    }

    /** Only the logged-in user's expenses; someone else's id gives 404, as if it didn't exist. */
    private Expense findExpense(Long id) {
        return expenseRepository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Expense", id));
    }

    /** A user can only file expenses under their own categories. */
    private Category findCategory(Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, currentUser.id())
                .orElseThrow(() -> new BadRequestException(
                        "Category with id " + categoryId + " does not exist"));
    }
}
