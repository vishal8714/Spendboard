package org.vishal.expensetracker.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(

        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        // Optional: empty means "use the initials of the name"
        @Pattern(regexp = "^\\s*[\\p{L}\\p{N}]{0,2}\\s*$", message = "Use up to 2 letters or digits")
        String avatarInitials,

        // Optional: empty means the default colour
        @Pattern(regexp = "^(#[0-9a-fA-F]{6})?$", message = "Pick a colour")
        String avatarColor
) {}
