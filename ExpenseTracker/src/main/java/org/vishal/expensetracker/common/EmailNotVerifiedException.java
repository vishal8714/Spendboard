package org.vishal.expensetracker.common;

/** Correct password, but the email hasn't been verified yet. A new code has been sent. */
public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException(String email) {
        super("Please verify your email first. We've sent a code to " + email + ".");
    }
}
