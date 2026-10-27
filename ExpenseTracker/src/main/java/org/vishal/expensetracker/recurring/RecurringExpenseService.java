package org.vishal.expensetracker.recurring;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vishal.expensetracker.auth.CurrentUser;
import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.category.CategoryRepository;
import org.vishal.expensetracker.common.BadRequestException;
import org.vishal.expensetracker.common.ResourceNotFoundException;
import org.vishal.expensetracker.expense.ExpenseRepository;
import org.vishal.expensetracker.user.UserRepository;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class RecurringExpenseService {

    private final RecurringExpenseRepository repository;
    private final RecurringExpenseGenerator generator;
    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public RecurringExpenseService(RecurringExpenseRepository repository,
                                   RecurringExpenseGenerator generator,
                                   CategoryRepository categoryRepository,
                                   ExpenseRepository expenseRepository,
                                   UserRepository userRepository,
                                   CurrentUser currentUser) {
        this.repository = repository;
        this.generator = generator;
        this.categoryRepository = categoryRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public List<RecurringExpenseResponse> getAll() {
        return repository.findByUserIdOrderByNextDateAscIdAsc(currentUser.id()).stream()
                .map(RecurringExpenseResponse::from)
                .toList();
    }

    /** If the start date is today or earlier, the expenses up to today are created straight away. */
    @Transactional
    public RecurringExpenseResponse create(RecurringExpenseRequest request) {
        LocalDate today = LocalDate.now();
        if (request.startDate().isBefore(today.minusYears(1))) {
            throw new BadRequestException("Start date can be at most one year in the past");
        }
        requireValidEndDate(request.startDate(), request.endDate());

        Long userId = currentUser.id();
        RecurringExpense rule = repository.save(new RecurringExpense(
                request.amount(),
                request.description().trim(),
                findCategory(request.categoryId()),
                userRepository.getReferenceById(userId),
                request.frequency(),
                request.startDate(),
                request.endDate()));
        generator.createDue(rule, today);
        return RecurringExpenseResponse.from(rule);
    }

    /** Changes apply to future occurrences only; expenses already created keep their values. */
    @Transactional
    public RecurringExpenseResponse update(Long id, RecurringExpenseRequest request) {
        RecurringExpense rule = findRule(id);
        requireValidEndDate(rule.getStartDate(), request.endDate());
        rule.update(request.amount(), request.description().trim(), findCategory(request.categoryId()),
                request.endDate());
        return RecurringExpenseResponse.from(rule);
    }

    @Transactional
    public RecurringExpenseResponse setActive(Long id, boolean active) {
        RecurringExpense rule = findRule(id);
        LocalDate today = LocalDate.now();
        if (active && !rule.isActive()) {
            rule.resume(today);
            generator.createDue(rule, today);   // today's occurrence, if there is one
        } else if (!active) {
            rule.pause();
        }
        return RecurringExpenseResponse.from(rule);
    }

    /** Stops future occurrences. Expenses it already created are kept. */
    @Transactional
    public void delete(Long id) {
        RecurringExpense rule = findRule(id);
        expenseRepository.unlinkRecurring(rule.getId());
        repository.delete(rule);
    }

    private void requireValidEndDate(LocalDate start, LocalDate end) {
        if (end != null && end.isBefore(start)) {
            throw new BadRequestException("End date must be on or after the start date");
        }
    }

    private RecurringExpense findRule(Long id) {
        return repository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Recurring expense", id));
    }

    private Category findCategory(Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, currentUser.id())
                .orElseThrow(() -> new BadRequestException(
                        "Category with id " + categoryId + " does not exist"));
    }
}
