package org.vishal.expensetracker.user;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "users")   // "user" is a reserved word in some databases, so the table is "users"
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;            // always stored in lowercase

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "password_hash")
    private String passwordHash;     // BCrypt hash; null for accounts that only use Google

    @Column(name = "google_id", unique = true)
    private String googleId;         // Google's permanent "sub" id; null if Google was never used

    /** True once the user has proven they own the email (code from the inbox, or Google). */
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    // ----- the pending one-time code (only while the email is unverified) -----

    @Column(name = "verification_code_hash")
    private String verificationCodeHash;     // BCrypt hash of the 6-digit code, never the code itself

    @Column(name = "verification_expires_at")
    private Instant verificationExpiresAt;

    @Column(name = "verification_attempts", nullable = false)
    private int verificationAttempts;

    @Column(name = "verification_sent_at")
    private Instant verificationSentAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected User() {
        // required by JPA
    }

    private User(String email, String name, String passwordHash, String googleId, boolean emailVerified) {
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.googleId = googleId;
        this.emailVerified = emailVerified;
    }

    /** Email/password signup: the account exists but can't be used until the email is verified. */
    public static User pendingWithPassword(String email, String name, String passwordHash) {
        return new User(email, name, passwordHash, null, false);
    }

    /** Google signup: Google has already verified the email. */
    public static User withGoogle(String email, String name, String googleId) {
        return new User(email, name, null, googleId, true);
    }

    /** Someone signs up again with an email that was never verified: the new details replace the old ones. */
    public void replacePendingRegistration(String name, String passwordHash) {
        this.name = name;
        this.passwordHash = passwordHash;
    }
    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }
    public void startVerification(String codeHash, Instant expiresAt, Instant sentAt) {
        this.verificationCodeHash = codeHash;
        this.verificationExpiresAt = expiresAt;
        this.verificationSentAt = sentAt;
        this.verificationAttempts = 0;
    }

    public void recordFailedAttempt() {
        this.verificationAttempts++;
    }

    public void markEmailVerified() {
        this.emailVerified = true;
        this.verificationCodeHash = null;
        this.verificationExpiresAt = null;
        this.verificationAttempts = 0;
    }

    /** Verified account, same email as the Google account → safe to link. */
    public void linkGoogle(String googleId) {
        this.googleId = googleId;
    }

    /**
     * Unverified account, same email as the Google account. Google has just proven who really owns
     * this email, so whoever created this account without verifying it loses it: the password is removed.
     */
    public void takeOverWithGoogle(String googleId, String name) {
        this.googleId = googleId;
        this.name = name;
        this.passwordHash = null;
        markEmailVerified();
    }

    public Long getId() { return id; }

    public String getEmail() { return email; }

    public String getName() { return name; }

    public String getPasswordHash() { return passwordHash; }

    public String getGoogleId() { return googleId; }

    public boolean isEmailVerified() { return emailVerified; }

    public String getVerificationCodeHash() { return verificationCodeHash; }

    public Instant getVerificationExpiresAt() { return verificationExpiresAt; }

    public int getVerificationAttempts() { return verificationAttempts; }

    public Instant getVerificationSentAt() { return verificationSentAt; }

    public Instant getCreatedAt() { return createdAt; }
}
