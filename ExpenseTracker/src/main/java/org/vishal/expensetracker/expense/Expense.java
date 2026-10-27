package org.vishal.expensetracker.expense;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Set when the expense was created by a recurring rule; null for expenses added by hand. */
    @Column(name = "recurring_expense_id")
    private Long recurringExpenseId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected Expense() {
        // required by JPA
    }

    public Expense(BigDecimal amount, String description, LocalDate date, Category category, User user) {
        this.amount = amount;
        this.description = description;
        this.date = date;
        this.category = category;
        this.user = user;
    }

    public static Expense fromRecurring(BigDecimal amount, String description, LocalDate date,
                                        Category category, User user, Long recurringExpenseId) {
        Expense expense = new Expense(amount, description, date, category, user);
        expense.recurringExpenseId = recurringExpenseId;
        return expense;
    }

    public Long getId() { return id; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public User getUser() { return user; }

    public Long getRecurringExpenseId() { return recurringExpenseId; }

    public Instant getCreatedAt() { return createdAt; }
}
