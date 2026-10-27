package org.vishal.expensetracker.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;
import org.vishal.expensetracker.common.BadRequestException;
import org.vishal.expensetracker.common.UnauthorizedException;
import org.vishal.expensetracker.user.User;
import org.vishal.expensetracker.user.UserResponse;
import org.vishal.expensetracker.user.UserService;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // ---- Rate limits ----
    // Failed logins for one email: 5 in 15 minutes → that email is locked for 15 minutes
    private static final int LOGIN_EMAIL_MAX = 5;
    // Failed logins from one IP address (any emails): 20 in 15 minutes → that IP is locked for 15 minutes
    private static final int LOGIN_IP_MAX = 20;
    // Wrong verification/reset codes from one IP: 20 in 15 minutes
    private static final int CODE_IP_MAX = 20;
    private static final Duration FAILURE_WINDOW = Duration.ofMinutes(15);
    private static final Duration FAILURE_LOCK = Duration.ofMinutes(15);
    // Requests that send an email (sign-up, resend, forgot password) from one IP: 10 per hour
    private static final int EMAIL_SEND_IP_MAX = 10;
    private static final Duration EMAIL_SEND_WINDOW = Duration.ofHours(1);

    private static final String LOGIN_LOCKED = "Too many failed sign-in attempts.";
    private static final String CODE_LOCKED = "Too many incorrect codes.";
    private static final String EMAIL_LOCKED = "Too many emails requested.";
    // Wrong current password when changing it, per user: 5 in 15 minutes
    private static final int CHANGE_PASSWORD_MAX = 5;
    private static final String PASSWORD_LOCKED = "Too many incorrect passwords.";

    private final AuthService authService;
    private final SessionAuthenticator sessionAuthenticator;
    private final CurrentUser currentUser;
    private final UserService userService;
    private final RateLimiter rateLimiter;
    private final ObjectProvider<ClientRegistrationRepository> googleClients;

    public AuthController(AuthService authService,
                          SessionAuthenticator sessionAuthenticator,
                          CurrentUser currentUser,
                          UserService userService,
                          RateLimiter rateLimiter,
                          ObjectProvider<ClientRegistrationRepository> googleClients) {
        this.authService = authService;
        this.sessionAuthenticator = sessionAuthenticator;
        this.currentUser = currentUser;
        this.userService = userService;
        this.rateLimiter = rateLimiter;
        this.googleClients = googleClients;
    }

    /** Step 1: create an unverified account and email a 6-digit code. Not logged in yet. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RegistrationResponse register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        limitEmailSending(request);
        User user = authService.register(body);
        return new RegistrationResponse(user.getEmail(), true);
    }

    /** Step 2: the correct code verifies the email and logs the user in. */
    @PostMapping("/verify")
    public UserResponse verify(@Valid @RequestBody VerifyEmailRequest body,
                               HttpServletRequest request,
                               HttpServletResponse response) {
        String ipKey = "code-ip:" + request.getRemoteAddr();
        rateLimiter.check(ipKey, CODE_LOCKED);
        User user;
        try {
            user = authService.verify(body);
        } catch (BadRequestException e) {
            rateLimiter.record(ipKey, CODE_IP_MAX, FAILURE_WINDOW, FAILURE_LOCK);
            throw e;
        }
        sessionAuthenticator.logIn(user, request, response);
        return UserResponse.from(user);
    }

    /** Send a new code (at most once a minute). Always 204, whether or not the email exists. */
    @PostMapping("/resend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resend(@Valid @RequestBody ResendCodeRequest body, HttpServletRequest request) {
        limitEmailSending(request);
        authService.resendCode(body.email());
    }

    /** Forgot password, step 1: email a reset code. Always 204, whether or not the email exists. */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ResendCodeRequest body, HttpServletRequest request) {
        limitEmailSending(request);
        authService.forgotPassword(body.email());
    }

    /** Forgot password, step 2: correct code + new password → password changed and logged in. */
    @PostMapping("/reset-password")
    public UserResponse resetPassword(@Valid @RequestBody ResetPasswordRequest body,
                                      HttpServletRequest request,
                                      HttpServletResponse response) {
        String ipKey = "code-ip:" + request.getRemoteAddr();
        rateLimiter.check(ipKey, CODE_LOCKED);
        User user;
        try {
            user = authService.resetPassword(body);
        } catch (BadRequestException e) {
            rateLimiter.record(ipKey, CODE_IP_MAX, FAILURE_WINDOW, FAILURE_LOCK);
            throw e;
        }
        rateLimiter.reset("login-email:" + UserService.normalizeEmail(body.email()));  // new password, fresh start
        sessionAuthenticator.logIn(user, request, response);
        return UserResponse.from(user);
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest body,
                              HttpServletRequest request,
                              HttpServletResponse response) {
        String emailKey = "login-email:" + UserService.normalizeEmail(body.email());
        String ipKey = "login-ip:" + request.getRemoteAddr();

        // Checked BEFORE the password, so a locked account gives nothing away even with the right password
        rateLimiter.check(ipKey, LOGIN_LOCKED);
        rateLimiter.check(emailKey, LOGIN_LOCKED);

        User user;
        try {
            user = authService.authenticate(body);
        } catch (UnauthorizedException e) {
            rateLimiter.record(emailKey, LOGIN_EMAIL_MAX, FAILURE_WINDOW, FAILURE_LOCK);
            rateLimiter.record(ipKey, LOGIN_IP_MAX, FAILURE_WINDOW, FAILURE_LOCK);
            throw e;
        }

        rateLimiter.reset(emailKey);    // successful login clears this email's failures
        sessionAuthenticator.logIn(user, request, response);
        return UserResponse.from(user);
    }

    /** Deletes the session on the server, so the old cookie stops working immediately. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        endSession(request, response);
    }

    /** Edit profile: name and the profile circle (initials + colour). The email can't be changed here. */
    @PutMapping("/me")
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest body) {
        User user = userService.updateProfile(currentUser.id(), body.name(), body.avatarInitials(), body.avatarColor());
        if (user == null) {
            throw new UnauthorizedException("You need to log in");
        }
        return UserResponse.from(user);
    }

    /** Change (or, for Google-only accounts, set) the password while logged in. */
    @PostMapping("/change-password")
    public UserResponse changePassword(@Valid @RequestBody ChangePasswordRequest body) {
        Long userId = currentUser.id();
        String key = "change-password:" + userId;
        rateLimiter.check(key, PASSWORD_LOCKED);
        try {
            return UserResponse.from(authService.changePassword(userId, body));
        } catch (AuthService.WrongPasswordException e) {
            rateLimiter.record(key, CHANGE_PASSWORD_MAX, FAILURE_WINDOW, FAILURE_LOCK);
            throw e;
        }
    }

    /** Permanently deletes the logged-in user's account, expenses and categories, then ends the session. */
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(HttpServletRequest request, HttpServletResponse response) {
        userService.deleteAccount(currentUser.id());
        endSession(request, response);
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

    private void endSession(HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        new SecurityContextLogoutHandler().logout(request, response, auth);
        new CookieClearingLogoutHandler("JSESSIONID").logout(request, response, auth);
    }

    /** Stops one IP address from using the app to send lots of emails (spam, or using up the Gmail quota). */
    private void limitEmailSending(HttpServletRequest request) {
        rateLimiter.checkAndRecord("email-ip:" + request.getRemoteAddr(), EMAIL_LOCKED,
                EMAIL_SEND_IP_MAX, EMAIL_SEND_WINDOW, EMAIL_SEND_WINDOW);
    }
}