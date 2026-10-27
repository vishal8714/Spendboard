package org.vishal.expensetracker.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;
import org.vishal.expensetracker.common.UnauthorizedException;
import org.vishal.expensetracker.user.User;
import org.vishal.expensetracker.user.UserResponse;
import org.vishal.expensetracker.user.UserService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SessionAuthenticator sessionAuthenticator;
    private final CurrentUser currentUser;
    private final UserService userService;
    private final ObjectProvider<ClientRegistrationRepository> googleClients;

    public AuthController(AuthService authService,
                          SessionAuthenticator sessionAuthenticator,
                          CurrentUser currentUser,
                          UserService userService,
                          ObjectProvider<ClientRegistrationRepository> googleClients) {
        this.authService = authService;
        this.sessionAuthenticator = sessionAuthenticator;
        this.currentUser = currentUser;
        this.userService = userService;
        this.googleClients = googleClients;
    }

    /** Step 1: create an unverified account and email a 6-digit code. Not logged in yet. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RegistrationResponse register(@Valid @RequestBody RegisterRequest body) {
        User user = authService.register(body);
        return new RegistrationResponse(user.getEmail(), true);
    }

    /** Step 2: the correct code verifies the email and logs the user in. */
    @PostMapping("/verify")
    public UserResponse verify(@Valid @RequestBody VerifyEmailRequest body,
                               HttpServletRequest request,
                               HttpServletResponse response) {
        User user = authService.verify(body);
        sessionAuthenticator.logIn(user, request, response);
        return UserResponse.from(user);
    }

    /** Send a new code (at most once a minute). Always 204, whether or not the email exists. */
    @PostMapping("/resend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resend(@Valid @RequestBody ResendCodeRequest body) {
        authService.resendCode(body.email());
    }

        /** Forgot password, step 1: email a reset code. Always 204, whether or not the email exists. */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ResendCodeRequest body) {
        authService.forgotPassword(body.email());
    }

    /** Forgot password, step 2: correct code + new password → password changed and logged in. */
    @PostMapping("/reset-password")
    public UserResponse resetPassword(@Valid @RequestBody ResetPasswordRequest body,
                                      HttpServletRequest request,
                                      HttpServletResponse response) {
        User user = authService.resetPassword(body);
        sessionAuthenticator.logIn(user, request, response);
        return UserResponse.from(user);
    }
    
    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest body,
                              HttpServletRequest request,
                              HttpServletResponse response) {
        User user = authService.authenticate(body);
        sessionAuthenticator.logIn(user, request, response);
        return UserResponse.from(user);
    }

    /** Deletes the session on the server, so the old cookie stops working immediately. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        new SecurityContextLogoutHandler().logout(request, response, auth);
        new CookieClearingLogoutHandler("JSESSIONID").logout(request, response, auth);
    }

    /** Who am I? 401 if not logged in (the React app uses this on startup). */
    @GetMapping("/me")
    public UserResponse me() {
        User user = userService.getById(currentUser.id());
        if (user == null) {
            throw new UnauthorizedException("You need to log in");
        }
        return UserResponse.from(user);
    }

    /** Tells the frontend whether to show the "Continue with Google" button. */
    @GetMapping("/config")
    public AuthConfigResponse config() {
        return new AuthConfigResponse(googleClients.getIfAvailable() != null);
    }

    public record AuthConfigResponse(boolean googleEnabled) {}
}
