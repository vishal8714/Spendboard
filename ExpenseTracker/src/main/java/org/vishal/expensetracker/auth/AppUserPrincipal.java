package org.vishal.expensetracker.auth;

import java.io.Serializable;

/**
 * What we keep in the session about the logged-in user.
 * Both password login and Google login end up with this same object,
 * so the rest of the app never needs to know how the user logged in.
 * Serializable because sessions can be saved to disk (DevTools keeps them across restarts).
 */
public record AppUserPrincipal(Long id, String email, String displayName) implements Serializable {
}
