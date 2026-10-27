package org.vishal.expensetracker.auth;

import org.springframework.stereotype.Component;
import org.vishal.expensetracker.common.TooManyRequestsException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Counts attempts per key (e.g. "login-email:a@b.com" or "login-ip:1.2.3.4") inside a time window.
 * When a key reaches its limit, it is locked for a while and check() rejects it with a 429.
 *
 * Kept in memory: it resets when the app restarts and isn't shared between several servers.
 * That's fine for one server; a bigger deployment would keep these counters in Redis.
 */
@Component
public class RateLimiter {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private record Entry(int count, Instant windowEnds, Instant lockedUntil) {

        boolean isLocked(Instant now) {
            return lockedUntil != null && now.isBefore(lockedUntil);
        }

        /** The window has passed (or the lock has run out): start counting from zero again. */
        boolean isExpired(Instant now) {
            return lockedUntil != null ? !now.isBefore(lockedUntil) : !now.isBefore(windowEnds);
        }
    }

    // ConcurrentHashMap: many requests (threads) update it at the same time
    private final ConcurrentHashMap<String, Entry> entries = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter() {
        this(Clock.systemUTC());
    }

    /** For tests: lets a test move time forward. Spring uses the no-argument constructor above. */
    RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Throws 429 if this key is currently locked. */
    public void check(String key, String message) {
        Entry entry = entries.get(key);
        Instant now = clock.instant();
        if (entry != null && entry.isLocked(now)) {
            long seconds = Math.max(1, Duration.between(now, entry.lockedUntil()).toSeconds());
            long minutes = (seconds + 59) / 60;
            throw new TooManyRequestsException(
                    message + " Please try again in " + minutes + (minutes == 1 ? " minute." : " minutes."),
                    seconds);
        }
    }

    /** Counts one attempt. On reaching maxAttempts within the window, the key is locked for lockFor. */
    public void record(String key, int maxAttempts, Duration window, Duration lockFor) {
        Instant now = clock.instant();
        // compute() runs atomically per key, so two simultaneous requests can't lose a count
        entries.compute(key, (k, entry) -> {
            if (entry != null && entry.isLocked(now)) {
                return entry;
            }
            if (entry == null || entry.isExpired(now)) {
                entry = new Entry(0, now.plus(window), null);
            }
            int count = entry.count() + 1;
            return new Entry(count, entry.windowEnds(), count >= maxAttempts ? now.plus(lockFor) : null);
        });
        if (entries.size() > CLEANUP_THRESHOLD) {
            entries.values().removeIf(e -> e.isExpired(now));
        }
    }

    /** check() then record(): allows exactly maxAttempts calls per window. */
    public void checkAndRecord(String key, String message, int maxAttempts, Duration window, Duration lockFor) {
        check(key, message);
        record(key, maxAttempts, window, lockFor);
    }

    /** Forget a key, e.g. after a successful login. */
    public void reset(String key) {
        entries.remove(key);
    }
}