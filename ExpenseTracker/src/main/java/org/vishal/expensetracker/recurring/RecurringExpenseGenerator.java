package org.vishal.expensetracker.recurring;

import org.springframework.stereotype.Component;
import org.vishal.expensetracker.expense.Expense;
import org.vishal.expensetracker.expense.ExpenseRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Turns the due occurrences of a rule into real expenses. Callers provide the transaction. */
@Component
public class RecurringExpenseGenerator {

    // A daily rule started a year ago is ~366 rows; this only guards against a runaway loop
    private static final int MAX_PER_RUN = 1000;

    private final ExpenseRepository expenseRepository;

    public RecurringExpenseGenerator(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    /** Creates an expense for every occurrence up to and including today. Returns how many. */
    public int createDue(RecurringExpense rule, LocalDate today) {
        List<Expense> created = new ArrayList<>();
        while (rule.isDue(today) && created.size() < MAX_PER_RUN) {
            created.add(Expense.fromRecurring(rule.getAmount(), rule.getDescription(), rule.getNextDate(),
                    rule.getCategory(), rule.getUser(), rule.getId()));
            rule.advance();
        }
        expenseRepository.saveAll(created);
        return created.size();
    }
}
