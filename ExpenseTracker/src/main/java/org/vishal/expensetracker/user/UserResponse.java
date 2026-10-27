package org.vishal.expensetracker.user;

/**
 * hasPassword is false for Google-only accounts, so the UI can offer "Set password" instead of "Change".
 * avatarInitials / avatarColor are null when the user hasn't chosen them (the UI then picks automatic ones).
 */
public record UserResponse(Long id, String name, String email, boolean hasPassword,
                           String avatarInitials, String avatarColor) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getPasswordHash() != null,
                user.getAvatarInitials(), user.getAvatarColor());
    }
}
