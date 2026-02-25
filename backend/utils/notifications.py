"""
AquaSentinel X — Notification Service
"""
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.models import Notification, NotificationChannel, User
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    message: str,
    subject: Optional[str] = None,
    complaint_id: Optional[UUID] = None,
    channel: NotificationChannel = NotificationChannel.in_app,
) -> Notification:
    """Create an in-app notification."""
    notification = Notification(
        user_id=user_id,
        complaint_id=complaint_id,
        channel=channel,
        subject=subject,
        message=message,
    )
    db.add(notification)
    await db.flush()
    return notification


async def send_email_notification(
    to_email: str,
    subject: str,
    body: str,
) -> bool:
    """
    Send email notification via SMTP.
    Returns True on success, False on failure.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        logger.warning("SMTP not configured. Email notification skipped.")
        return False

    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email

        html_body = f"""
        <html>
        <body style="font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); border-radius: 12px; overflow: hidden;">
                <div style="padding: 30px; color: white; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">🌊 AquaSentinel X</h1>
                    <p style="opacity: 0.8; margin-top: 5px;">Water Body Protection Platform</p>
                </div>
                <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #0f3460; margin-top: 0;">{subject}</h2>
                    <div style="line-height: 1.6; color: #333;">
                        {body}
                    </div>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">
                        This is an automated notification from AquaSentinel X.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            use_tls=True,
        )
        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def notify_complaint_submitted(
    db: AsyncSession,
    citizen: User,
    complaint_number: str,
):
    """Notify citizen that complaint was submitted."""
    message = f"Your complaint {complaint_number} has been submitted successfully. We will process it shortly."
    await create_notification(
        db, citizen.id, message,
        subject=f"Complaint {complaint_number} Submitted",
    )
    await send_email_notification(
        citizen.email,
        f"Complaint {complaint_number} Submitted",
        f"<p>Dear {citizen.full_name},</p>"
        f"<p>{message}</p>"
        f"<p>Track your complaint status at any time on the AquaSentinel X platform.</p>",
    )


async def notify_complaint_assigned(
    db: AsyncSession,
    officer: User,
    complaint_number: str,
    severity: str,
    deadline: str,
):
    """Notify officer about assigned complaint."""
    message = f"Complaint {complaint_number} (Priority: {severity.upper()}) has been assigned to you. Deadline: {deadline}"
    await create_notification(
        db, officer.id, message,
        subject=f"New Assignment: {complaint_number}",
    )
    await send_email_notification(
        officer.email,
        f"New Assignment: {complaint_number} [{severity.upper()}]",
        f"<p>Dear {officer.full_name},</p>"
        f"<p>{message}</p>"
        f"<p>Please take action within the SLA deadline.</p>",
    )


async def notify_escalation(
    db: AsyncSession,
    officer: User,
    complaint_number: str,
    escalation_level: str,
):
    """Notify about escalation."""
    message = f"⚠️ ESCALATION ALERT: Complaint {complaint_number} has been escalated to {escalation_level}."
    await create_notification(
        db, officer.id, message,
        subject=f"Escalation Alert: {complaint_number}",
    )
    await send_email_notification(
        officer.email,
        f"⚠️ Escalation Alert: {complaint_number}",
        f"<p>Dear {officer.full_name},</p>"
        f"<p>{message}</p>"
        f"<p>Immediate action is required.</p>",
    )
