package org.vishal.expensetracker.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends emails through the SMTP server configured with spring.mail.* (Gmail, Mailpit, Brevo...).
 * If no mail server is configured at all, the code is written to the log instead, so you can
 * still test on your own machine. Never run a live app without spring.mail.host set.
 */
@Component
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;

    public EmailSender(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${app.mail.from:Spendboard <no-reply@spendboard.local>}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void sendVerificationCode(String to, String name, String code) {
        send(to, code, "Your Spendboard verification code", """
                Hi %s,

                Your Spendboard verification code is:

                    %s

                It expires in 10 minutes. If you didn't try to sign up, you can ignore this email.
                """.formatted(name, code));
    }

    public void sendPasswordResetCode(String to, String name, String code) {
        send(to, code, "Reset your Spendboard password", """
                Hi %s,

                Someone asked to reset your Spendboard password. Your reset code is:

                    %s

                It expires in 10 minutes. If you didn't ask for this, ignore this email:
                your password stays the same.
                """.formatted(name, code));
    }

    private void send(String to, String code, String subject, String text) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("No mail server configured (spring.mail.host). \"{}\" code for {}: {}", subject, to, code);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);

        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Could not send email to {}", to, e);
            throw new EmailDeliveryException();
        }
    }
}