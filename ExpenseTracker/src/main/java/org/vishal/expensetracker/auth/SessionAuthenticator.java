package org.vishal.expensetracker.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.vishal.expensetracker.user.User;

import java.util.List;

/**
 * Logs a user in by storing them in the HTTP session.
 * The browser then gets a JSESSIONID cookie and sends it with every request.
 */
@Component
public class SessionAuthenticator {

    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public void logIn(User user, HttpServletRequest request, HttpServletResponse response) {
        // Session fixation protection: never keep a session id that existed before login
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }

        AppUserPrincipal principal = new AppUserPrincipal(user.getId(), user.getEmail(), user.getName());
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(authentication);
        holder.setContext(context);

        // Store it in the session, so the next requests are recognized
        contextRepository.saveContext(context, request, response);
    }
}
