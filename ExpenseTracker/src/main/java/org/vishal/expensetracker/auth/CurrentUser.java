package org.vishal.expensetracker.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.vishal.expensetracker.common.UnauthorizedException;

/** Answers "who is making this request?" anywhere in the services. */
@Component
public class CurrentUser {

    public Long id() {
        return principal().id();
    }

    public AppUserPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserPrincipal principal) {
            return principal;
        }
        throw new UnauthorizedException("You need to log in");
    }
}
