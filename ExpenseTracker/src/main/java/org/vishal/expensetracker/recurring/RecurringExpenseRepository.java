package org.vishal.expensetracker.recurring;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecurringExpenseRepository extends JpaRepository<RecurringExpense, Long> {

    @EntityGraph(attributePaths = "category")
    List<RecurringExpense> findByUserIdOrderByNextDateAscIdAsc(Long userId);

    @EntityGraph(attributePaths = "category")
    Optional<RecurringExpense> findByIdAndUserId(Long id, Long userId);

    /** Candidates for the scheduler; isDue() makes the final check (end date). */
    @EntityGraph(attributePaths = {"category", "user"})
    List<RecurringExpense> findByActiveTrueAndNextDateLessThanEqual(LocalDate date);

    boolean existsByCategoryId(Long categoryId);

    @Modifying
    @Query("delete from RecurringExpense r where r.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
