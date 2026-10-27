package org.vishal.expensetracker.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.vishal.expensetracker.common.EmailSender;
import org.vishal.expensetracker.user.User;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

/**
 * One-time codes for proving an email address belongs to the person signing up.
 * Must be called inside a transaction: it changes the (managed) User entity.
 */
@Service
public class EmailVerificationService {

    static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    static final int MAX_ATTEMPTS = 5;

    public enum Result { VERIFIED, WRONG_CODE, TOO_MANY_ATTEMPTS, EXPIRED, NO_CODE }

    private final SecureRandom random = new SecureRandom();   // unpredictable, unlike java.util.Random
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;

    public EmailVerificationService(PasswordEncoder passwordEncoder, EmailSender emailSender) {
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
    }

    /** Code to verify the email after sign-up. */
    public void sendCode(User user) {
        send(user, false);
    }

    /** Code to reset a forgotten password (same rules, different email). */
    public void sendPasswordResetCode(User user) {
        send(user, true);
    }

    /**
     * Creates a new code and emails it. Does nothing if a code was sent less than a minute ago
     * (the earlier code still works), so nobody can flood an inbox by clicking "resend".
     */
    private void send(User user, boolean passwordReset) {
        Instant now = Instant.now();
        if (user.getVerificationSentAt() != null
                && user.getVerificationSentAt().plus(RESEND_COOLDOWN).isAfter(now)
                && user.getVerificationCodeHash() != null) {
            return;
        }

        String code = String.format("%06d", random.nextInt(1_000_000));   // 000000 to 999999
        user.startVerification(passwordEncoder.encode(code), now.plus(CODE_LIFETIME), now);
        if (passwordReset) {
            emailSender.sendPasswordResetCode(user.getEmail(), user.getName(), code);
        } else {
            emailSender.sendVerificationCode(user.getEmail(), user.getName(), code);
        }
    }

    public Result check(User user, String code) {
        if (user.getVerificationCodeHash() == null) {
            return Result.NO_CODE;
        }
        if (Instant.now().isAfter(user.getVerificationExpiresAt())) {
            return Result.EXPIRED;
        }
        if (user.getVerificationAttempts() >= MAX_ATTEMPTS) {
            return Result.TOO_MANY_ATTEMPTS;
        }
        if (passwordEncoder.matches(code, user.getVerificationCodeHash())) {
            return Result.VERIFIED;
        }
        user.recordFailedAttempt();
        return user.getVerificationAttempts() >= MAX_ATTEMPTS ? Result.TOO_MANY_ATTEMPTS : Result.WRONG_CODE;
    }

    public int attemptsLeft(User user) {
        return Math.max(0, MAX_ATTEMPTS - user.getVerificationAttempts());
    }
}