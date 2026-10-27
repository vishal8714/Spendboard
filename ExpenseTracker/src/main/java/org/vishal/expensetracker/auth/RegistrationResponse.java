package org.vishal.expensetracker.auth;

/** Sign-up isn't finished yet: the user must enter the code we emailed to this address. */
public record RegistrationResponse(String email, boolean verificationRequired) {}
