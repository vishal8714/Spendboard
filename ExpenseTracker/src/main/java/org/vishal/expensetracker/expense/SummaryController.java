package org.vishal.expensetracker.expense;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.vishal.expensetracker.common.BadRequestException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final ExpenseService service;

    public SummaryController(ExpenseService service) {
        this.service = service;
    }

    @GetMapping
    public MonthlySummary getMonthlySummary(@RequestParam String month) {
        YearMonth yearMonth;
        try {
            yearMonth = YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("month must use the format yyyy-MM, for example 2026-10");
        }
        return service.getMonthlySummary(yearMonth);
    }
}
