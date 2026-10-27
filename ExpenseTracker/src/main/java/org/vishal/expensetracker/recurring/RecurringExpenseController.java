package org.vishal.expensetracker.recurring;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/recurring-expenses")
public class RecurringExpenseController {

    private final RecurringExpenseService service;

    public RecurringExpenseController(RecurringExpenseService service) {
        this.service = service;
    }

    @GetMapping
    public List<RecurringExpenseResponse> getAll() {
        return service.getAll();
    }

    @PostMapping
    public ResponseEntity<RecurringExpenseResponse> create(@Valid @RequestBody RecurringExpenseRequest request) {
        RecurringExpenseResponse saved = service.create(request);
        return ResponseEntity
                .created(URI.create("/api/recurring-expenses/" + saved.id()))
                .body(saved);
    }

    @PutMapping("/{id}")
    public RecurringExpenseResponse update(@PathVariable Long id, @Valid @RequestBody RecurringExpenseRequest request) {
        return service.update(id, request);
    }

    /** Pause (active=false) or resume (active=true). */
    @PostMapping("/{id}/active")
    public RecurringExpenseResponse setActive(@PathVariable Long id, @RequestBody ActiveRequest body) {
        return service.setActive(id, body.active());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    public record ActiveRequest(boolean active) {}
}
