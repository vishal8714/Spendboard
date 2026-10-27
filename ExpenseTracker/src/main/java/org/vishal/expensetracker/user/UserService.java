package org.vishal.expensetracker.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vishal.expensetracker.category.Category;
import org.vishal.expensetracker.category.CategoryRepository;

import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    /** Every new account starts with these categories. */
    private static final List<String> DEFAULT_CATEGORIES = List.of(
            "Food", "Transport", "Rent", "Bills", "Shopping", "Entertainment", "Other"
    );

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    public UserService(UserRepository userRepository, CategoryRepository categoryRepository) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email)).orElse(null);
    }

    public User getById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    /** Creates an unverified email/password account. The caller checks for duplicates first. */
    @Transactional
    public User createPendingPasswordUser(String email, String name, String passwordHash) {
        User user = userRepository.save(User.pendingWithPassword(normalizeEmail(email), name.trim(), passwordHash));
        createDefaultCategories(user);
        return user;
    }

    /**
     * Called after Google has confirmed who the user is.
     * 1. Signed in with this Google account before?           → same account.
     * 2. A VERIFIED account with the same email exists?        → link Google to it.
     * 3. An UNVERIFIED account with the same email exists?     → Google proves the real owner is here:
     *                                                            take the account over and remove its password.
     * 4. Otherwise                                             → create a new, verified account.
     */
    @Transactional
    public User findOrCreateGoogleUser(String googleId, String email, String name, boolean emailVerified) {
        String normalized = normalizeEmail(email);

        User existing = userRepository.findByGoogleId(googleId).orElse(null);
        if (existing != null) {
            if (!existing.isEmailVerified() && emailVerified && existing.getEmail().equals(normalized)) {
                existing.markEmailVerified();
            }
            return existing;
        }

        if (!emailVerified || normalized == null) {
            throw new GoogleAccountException("Your Google email address is not verified");
        }

        String displayName = (name == null || name.isBlank()) ? normalized.split("@")[0] : name.trim();

        User sameEmail = userRepository.findByEmail(normalized).orElse(null);
        if (sameEmail != null) {
            if (sameEmail.isEmailVerified()) {
                sameEmail.linkGoogle(googleId);
            } else {
                log.info("Google sign-in took over unverified account {}", sameEmail.getId());
                sameEmail.takeOverWithGoogle(googleId, displayName);
            }
            return sameEmail;      // dirty checking saves the changes
        }

        User user = userRepository.save(User.withGoogle(normalized, displayName, googleId));
        createDefaultCategories(user);
        return user;
    }

    private void createDefaultCategories(User user) {
        categoryRepository.saveAll(
                DEFAULT_CATEGORIES.stream().map(name -> new Category(name, user)).toList()
        );
    }

    public static class GoogleAccountException extends RuntimeException {
        public GoogleAccountException(String message) {
            super(message);
        }
    }
}
