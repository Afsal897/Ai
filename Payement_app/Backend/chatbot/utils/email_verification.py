"""This module handles the sending of emails, including email verification and  password reset"""

import logging
from smtplib import SMTPException, SMTPAuthenticationError
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger("api_logger")


def send_email(
    email,
    token,
    app_key,
    scenario,
    template="email/reset_password.html",
):
    """
    Sends an email with the provided token to the given email address.

    """
    api_endpoint = scenario
    if scenario == "forgot-password":
        subject = "Reset Password"
    elif scenario == "confirm-and-set-password":
        subject = "Confirm Your Account"
        api_endpoint = "activate-account"
    else:
        subject = "Verify Your Email Address"

    ui_url = f"{settings.WEB_URL}/{api_endpoint}"
    if app_key:
        ui_url = f"{settings.APP_URL}/{api_endpoint}"

    expiry_in_minutes = (
        settings.SIGNUP_TOKEN_EXPIRY
        if scenario == "signup"
        else settings.PASSWORD_RESET_TOKEN_EXPIRY
    )
    # Prepare context for template
    context = {
        'target_url': f"{ui_url}/{token}",
        'expiry_in_hours': int(expiry_in_minutes) / 60
    }

    # Render HTML template
    message = render_to_string(template, context)

    logger.info("message: %s", message)
    try:
        # Send HTML email
        email_message = EmailMessage(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [email],
        )

        email_message.content_subtype = "html"

        email_message.send(fail_silently=False)
        logger.info("Email sent successfully to: %s", email)

    except SMTPAuthenticationError as e:
        logger.error("SMTP Authentication Error: %s", e)
        raise SMTPAuthenticationError(
            535, "SMTP Authentication Error: " + str(e)
        ) from e

    except SMTPException as e:
        logger.error("SMTP Error: %s", e)
        raise SMTPException(535, "SMTP Error: " + str(e)) from e
