package org.vishal.expensetracker.recurring;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Creates the expenses for recurring rules that are due. Runs every day just after midnight,
 * and once at startup to catch up on any days the server was off.
 */
@Component
public class RecurringExpenseScheduler {

    private static final Logger log = LoggerFactory.getLogger(RecurringExpenseScheduler.class);

    private final RecurringExpenseRepository repository;
    private final RecurringExpenseGenerator generator;

    public RecurringExpenseScheduler(RecurringExpenseRepository repository, RecurringExpenseGenerator generator) {
        this.repository = repository;
        this.generator = generator;
    }

    // @Transactional sits on the entry points: a call from one method of this class to another
    // skips Spring's proxy, so a transaction on runDue() alone would never start.

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void onStartup() {
        runDue();
    }

    @Scheduled(cron = "0 1 0 * * *")       // 00:01 every day, server time
    @Transactional
    public void daily() {
        runDue();
    }

    private void runDue() {
        LocalDate today = LocalDate.now();
        List<RecurringExpense> due = repository.findByActiveTrueAndNextDateLessThanEqual(today);
        int created = due.stream().mapToInt(rule -> generator.createDue(rule, today)).sum();
        if (created > 0) {
            log.info("Created {} expenses from {} recurring rules", created, due.size());
        }
    }
}
