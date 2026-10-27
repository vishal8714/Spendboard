package org.vishal.expensetracker.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email is not valid")
        String email,

        @NotBlank(message = "Enter the 6-digit code")
        @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code")
        String code
) {}
