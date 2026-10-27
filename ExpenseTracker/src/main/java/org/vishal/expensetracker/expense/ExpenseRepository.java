package org.vishal.expensetracker.expense;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @EntityGraph(attributePaths = "category")
    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    boolean existsByCategoryId(Long categoryId);

    @Query("""
            select e from Expense e
            join fetch e.category
            where e.user.id = :userId
              and (:from is null or e.date >= :from)
              and (:to is null or e.date <= :to)
              and (:categoryId is null or e.category.id = :categoryId)
            order by e.date desc, e.id desc
            """)
    List<Expense> search(@Param("userId") Long userId,
                         @Param("from") LocalDate from,
                         @Param("to") LocalDate to,
                         @Param("categoryId") Long categoryId);

    @Query("""
            select new org.vishal.expensetracker.expense.CategoryTotal(c.id, c.name, sum(e.amount))
            from Expense e
            join e.category c
            where e.user.id = :userId
              and e.date >= :start and e.date <= :end
            group by c.id, c.name
            order by sum(e.amount) desc
            """)
    List<CategoryTotal> totalsByCategory(@Param("userId") Long userId,
                                         @Param("start") LocalDate start,
                                         @Param("end") LocalDate end);
}
