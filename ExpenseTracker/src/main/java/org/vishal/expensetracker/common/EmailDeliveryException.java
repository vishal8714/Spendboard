package org.vishal.expensetracker.common;

public class EmailDeliveryException extends RuntimeException {

    public EmailDeliveryException() {
        super("We couldn't send the verification email right now. Please try again in a minute.");
    }
}
