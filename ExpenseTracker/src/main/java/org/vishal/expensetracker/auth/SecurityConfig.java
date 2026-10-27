package org.vishal.expensetracker.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.savedrequest.NullRequestCache;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   ObjectProvider<ClientRegistrationRepository> googleClients,
                                                   GoogleLoginSuccessHandler googleLoginSuccessHandler) throws Exception {
        http
                // Who may call what
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/auth/register",
                                "/api/auth/verify", "/api/auth/resend",
                                "/api/auth/forgot-password", "/api/auth/reset-password",
                                "/api/auth/logout", "/api/auth/config").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())          // the React files, if served by Spring

                // CSRF: token in a cookie React can read (XSRF-TOKEN); React sends it back in X-XSRF-TOKEN
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)

                // JSON errors instead of redirects to a login page
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) ->
                                JsonErrorWriter.write(request, response, HttpStatus.UNAUTHORIZED,
                                        "You need to log in"))
                        .accessDeniedHandler((request, response, e) ->
                                JsonErrorWriter.write(request, response, HttpStatus.FORBIDDEN,
                                        "Request rejected: missing or invalid CSRF token")))

                // Don't remember "where the user was going" (we're an API, not server-rendered pages)
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))

                // We have our own JSON login/logout endpoints in AuthController
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);

        // "Continue with Google" is only switched on when Google credentials are configured
        if (googleClients.getIfAvailable() != null) {
            http.oauth2Login(oauth -> oauth
                    .successHandler(googleLoginSuccessHandler)
                    .failureHandler((request, response, e) -> response.sendRedirect("/?loginError=google")));
        }

        return http.build();
    }
}