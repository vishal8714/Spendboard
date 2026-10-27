package org.vishal.expensetracker.budget;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.vishal.expensetracker.common.BadRequestException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;

/** Monthly budgets per category. A budget applies to every month; spending is counted per month. */
@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService service;

    public BudgetController(BudgetService service) {
        this.service = service;
    }

    @GetMapping
    public BudgetOverview getOverview(@RequestParam String month) {
        YearMonth yearMonth;
        try {
            yearMonth = YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("month must use the format yyyy-MM, for example 2026-10");
        }
        return service.getOverview(yearMonth);
    }

    @PutMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setBudget(@PathVariable Long categoryId, @Valid @RequestBody BudgetRequest body) {
        service.setBudget(categoryId, body.amount());
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeBudget(@PathVariable Long categoryId) {
        service.removeBudget(categoryId);
    }
}
