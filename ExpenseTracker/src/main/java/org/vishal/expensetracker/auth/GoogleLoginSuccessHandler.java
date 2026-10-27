package org.vishal.expensetracker.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Component;
import org.vishal.expensetracker.user.User;
import org.vishal.expensetracker.user.UserService;

import java.io.IOException;

/**
 * Runs after Spring Security has finished the Google flow
 * (redirect → code → token exchange → ID token verified).
 * Google has told us who the user is; now we find or create OUR user
 * and log them in with a normal session, exactly like a password login.
 */
@Component
public class GoogleLoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(GoogleLoginSuccessHandler.class);

    private final UserService userService;
    private final SessionAuthenticator sessionAuthenticator;

    public GoogleLoginSuccessHandler(UserService userService, SessionAuthenticator sessionAuthenticator) {
        this.userService = userService;
        this.sessionAuthenticator = sessionAuthenticator;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User google = (OAuth2User) authentication.getPrincipal();

        String googleId = google.getAttribute("sub");     // Google's permanent id for this person
        String email = google.getAttribute("email");
        String name = google.getAttribute("name");
        Boolean emailVerified = google.getAttribute("email_verified");

        try {
            User user = userService.findOrCreateGoogleUser(
                    googleId, email, name, Boolean.TRUE.equals(emailVerified));
            // Replace Google's login object in the session with our own principal
            sessionAuthenticator.logIn(user, request, response);
            response.sendRedirect("/");
        } catch (UserService.GoogleAccountException e) {
            log.warn("Google login rejected: {}", e.getMessage());
            new SecurityContextLogoutHandler().logout(request, response, authentication);
            response.sendRedirect("/?loginError=google");
        }
    }
}
