package org.vishal.expensetracker.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(

        // Required only if the account already has a password (Google-only accounts are setting their first one)
        String currentPassword,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters")
        String newPassword
) {}
