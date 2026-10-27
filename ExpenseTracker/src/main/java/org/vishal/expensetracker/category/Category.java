package org.vishal.expensetracker.category;

import jakarta.persistence.*;
import org.vishal.expensetracker.user.User;

@Entity
@Table(name = "categories",
        // Names are unique per user: two users can both have "Food"
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "name"}))
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    protected Category() {
        // required by JPA
    }

    public Category(String name, User user) {
        this.name = name;
        this.user = user;
    }

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public User getUser() { return user; }
}
