package org.vishal.expensetracker.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.time.Instant;

/**
 * Writes 401/403 responses from the security filters in the same JSON shape as ApiError.
 * (These errors happen before any controller runs, so GlobalExceptionHandler never sees them.)
 */
final class JsonErrorWriter {

    private JsonErrorWriter() {}

    static void write(HttpServletRequest request, HttpServletResponse response,
                      HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"timestamp\":\"" + Instant.now() + "\"," +
                "\"status\":" + status.value() + "," +
                "\"error\":\"" + escape(status.getReasonPhrase()) + "\"," +
                "\"message\":\"" + escape(message) + "\"," +
                "\"path\":\"" + escape(request.getRequestURI()) + "\"}");
    }

    private static String escape(String value) {
        StringBuilder sb = new StringBuilder();
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.toString();
    }
}
