package org.vishal.expensetracker.category;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vishal.expensetracker.auth.CurrentUser;
import org.vishal.expensetracker.common.ConflictException;
import org.vishal.expensetracker.common.ResourceNotFoundException;
import org.vishal.expensetracker.expense.ExpenseRepository;
import org.vishal.expensetracker.user.UserRepository;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public CategoryService(CategoryRepository categoryRepository,
                           ExpenseRepository expenseRepository,
                           UserRepository userRepository,
                           CurrentUser currentUser) {
        this.categoryRepository = categoryRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public List<CategoryResponse> getAll() {
        return categoryRepository.findByUserId(currentUser.id(), Sort.by("name")).stream()
                .map(CategoryMapper::toResponse)
                .toList();
    }

    public CategoryResponse getById(Long id) {
        return CategoryMapper.toResponse(findCategory(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Long userId = currentUser.id();
        String name = request.name().trim();
        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, name)) {
            throw new ConflictException("Category '" + name + "' already exists");
        }
        // getReferenceById: a lazy reference to the user, no extra SELECT needed
        Category saved = categoryRepository.save(new Category(name, userRepository.getReferenceById(userId)));
        return CategoryMapper.toResponse(saved);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findCategory(id);
        String name = request.name().trim();
        if (categoryRepository.existsByUserIdAndNameIgnoreCaseAndIdNot(currentUser.id(), name, id)) {
            throw new ConflictException("Category '" + name + "' already exists");
        }
        category.setName(name);
        return CategoryMapper.toResponse(category);
    }

    @Transactional
    public void delete(Long id) {
        Category category = findCategory(id);
        if (expenseRepository.existsByCategoryId(id)) {
            throw new ConflictException(
                    "Category '" + category.getName() + "' is used by existing expenses and cannot be deleted");
        }
        categoryRepository.delete(category);
    }

    /** Only finds categories that belong to the logged-in user; anyone else's gives 404. */
    private Category findCategory(Long id) {
        return categoryRepository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
    }
}
