package org.vishal.expensetracker.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vishal.expensetracker.common.BadRequestException;
import org.vishal.expensetracker.common.ConflictException;
import org.vishal.expensetracker.common.EmailNotVerifiedException;
import org.vishal.expensetracker.common.UnauthorizedException;
import org.vishal.expensetracker.user.User;
import org.vishal.expensetracker.user.UserService;

@Service
public class AuthService {

    private static final String INVALID = "Invalid email or password";

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService verification;
    private final String dummyHash;

    public AuthService(UserService userService,
                       PasswordEncoder passwordEncoder,
                       EmailVerificationService verification) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.verification = verification;
        // Used when the email doesn't exist, so a wrong email takes as long as a wrong password.
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    /**
     * Step 1 of sign-up: create (or replace) an UNVERIFIED account and email a code.
     * Nobody is logged in yet; that happens in verify().
     */
    @Transactional
    public User register(RegisterRequest request) {
        User existing = userService.findByEmail(request.email());
        if (existing != null && existing.isEmailVerified()) {
            throw new ConflictException("An account with this email already exists");
        }

        String hash = passwordEncoder.encode(request.password());
        User user;
        if (existing != null) {
            // Never verified, so nobody has proven they own it. Whoever can read the inbox wins.
            existing.replacePendingRegistration(request.name().trim(), hash);
            user = existing;
        } else {
            user = userService.createPendingPasswordUser(request.email(), request.name(), hash);
        }
        verification.sendCode(user);
        return user;
    }

    /** Step 2 of sign-up: check the code. On success the email is verified (the caller logs the user in). */
    @Transactional(noRollbackFor = BadRequestException.class)   // keep the failed-attempt count when throwing
    public User verify(VerifyEmailRequest request) {
        User user = userService.findByEmail(request.email());
        if (user == null) {
            throw new BadRequestException("This code has expired. Please request a new one.");
        }
        if (user.isEmailVerified()) {
            throw new BadRequestException("This email is already verified. Please sign in.");
        }

        requireValidCode(user, request.code());
        user.markEmailVerified();
        return user;
    }

    /** Forgot password, step 1. Always succeeds silently, so it can't reveal which emails are registered. */
    @Transactional
    public void forgotPassword(String email) {
        User user = userService.findByEmail(email);
        if (user != null) {
            verification.sendPasswordResetCode(user);
        }
    }

    /** Forgot password, step 2: the emailed code proves inbox ownership, so the password can be replaced. */
    @Transactional(noRollbackFor = BadRequestException.class)   // keep the failed-attempt count when throwing
    public User resetPassword(ResetPasswordRequest request) {
        User user = userService.findByEmail(request.email());
        if (user == null) {
            throw new BadRequestException("This code has expired. Please request a new one.");
        }

        requireValidCode(user, request.code());
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        user.markEmailVerified();    // receiving the code also proves the email; clears the used code
        return user;
    }

    /**
     * Logged-in password change. The current password must be given, unless the account has none yet
     * (signed up with Google): then this sets its first password, so it can also sign in with email.
     */
    @Transactional
    public User changePassword(Long userId, ChangePasswordRequest request) {
        User user = userService.getById(userId);
        if (user == null) {
            throw new UnauthorizedException("You need to log in");
        }

        if (user.getPasswordHash() != null) {
            String current = request.currentPassword();
            if (current == null || current.isEmpty()) {
                throw new BadRequestException("Enter your current password");
            }
            if (!passwordEncoder.matches(current, user.getPasswordHash())) {
                throw new WrongPasswordException();
            }
            if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
                throw new BadRequestException("The new password must be different from the current one");
            }
        }

        user.changePassword(passwordEncoder.encode(request.newPassword()));
        return user;
    }

    /** A BadRequestException the controller can count towards the rate limit. */
    public static class WrongPasswordException extends BadRequestException {
        public WrongPasswordException() {
            super("Your current password is incorrect");
        }
    }

    private void requireValidCode(User user, String code) {
        switch (verification.check(user, code)) {
            case VERIFIED -> { }
            case WRONG_CODE -> throw new BadRequestException(
                    "Incorrect code. " + verification.attemptsLeft(user) + " attempts left.");
            case TOO_MANY_ATTEMPTS -> throw new BadRequestException(
                    "Too many incorrect attempts. Please request a new code.");
            case EXPIRED, NO_CODE -> throw new BadRequestException(
                    "This code has expired. Please request a new one.");
        }
    }

    /** Always succeeds silently, so this endpoint can't be used to find out which emails are registered. */
    @Transactional
    public void resendCode(String email) {
        User user = userService.findByEmail(email);
        if (user != null && !user.isEmailVerified()) {
            verification.sendCode(user);
        }
    }

    @Transactional(noRollbackFor = EmailNotVerifiedException.class)   // keep the newly sent code
    public User authenticate(LoginRequest request) {
        User user = userService.findByEmail(request.email());

        if (user == null || user.getPasswordHash() == null) {
            passwordEncoder.matches(request.password(), dummyHash);
            throw new UnauthorizedException(INVALID);
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException(INVALID);
        }
        // Only someone who knows the password learns that the email is unverified
        if (!user.isEmailVerified()) {
            verification.sendCode(user);
            throw new EmailNotVerifiedException(user.getEmail());
        }
        return user;
    }
}