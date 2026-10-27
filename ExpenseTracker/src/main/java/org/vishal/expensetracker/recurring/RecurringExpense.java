package org.vishal.expensetracker.recurring;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A rule such as "Rent, ₹15,000, every month from 5 Jan". The scheduler turns each due occurrence
 * into a normal Expense, so recurring expenses show up in the list, filters and summary like any other.
 */
@Entity
@Table(name = "recurring_expenses")
public class RecurringExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Frequency frequency;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;             // null = repeats forever

    /** How many occurrences have been passed (created, or skipped while paused). The next one is number `occurrences`. */
    @Column(nullable = false)
    private int occurrences;

    @Column(name = "next_date", nullable = false)
    private LocalDate nextDate;

    @Column(nullable = false)
    private boolean active = true;         // false = paused

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected RecurringExpense() {
        // required by JPA
    }

    public RecurringExpense(BigDecimal amount, String description, Category category, User user,
                            Frequency frequency, LocalDate startDate, LocalDate endDate) {
        this.amount = amount;
        this.description = description;
        this.category = category;
        this.user = user;
        this.frequency = frequency;
        this.startDate = startDate;
        this.endDate = endDate;
        this.occurrences = 0;
        this.nextDate = startDate;
    }

    /** True once the next occurrence would be after the end date. */
    public boolean isFinished() {
        return endDate != null && nextDate.isAfter(endDate);
    }

    /** Is an occurrence due on or before this day? */
    public boolean isDue(LocalDate today) {
        return active && !isFinished() && !nextDate.isAfter(today);
    }

    /** Move on to the following occurrence. */
    public void advance() {
        occurrences++;
        nextDate = frequency.occurrence(startDate, occurrences);
    }

    public void pause() {
        active = false;
    }

    /** Occurrences missed while paused are skipped, not back-filled. */
    public void resume(LocalDate today) {
        active = true;
        while (nextDate.isBefore(today)) {
            advance();
        }
    }

    public void update(BigDecimal amount, String description, Category category, LocalDate endDate) {
        this.amount = amount;
        this.description = description;
        this.category = category;
        this.endDate = endDate;
    }

    public Long getId() { return id; }

    public BigDecimal getAmount() { return amount; }

    public String getDescription() { return description; }

    public Category getCategory() { return category; }

    public User getUser() { return user; }

    public Frequency getFrequency() { return frequency; }

    public LocalDate getStartDate() { return startDate; }

    public LocalDate getEndDate() { return endDate; }

    public LocalDate getNextDate() { return nextDate; }

    public boolean isActive() { return active; }

    public Instant getCreatedAt() { return createdAt; }
}
