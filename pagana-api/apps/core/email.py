from django.conf import settings
from django.db import transaction

from .tasks import send_email_task


def queue_email(subject, message, recipient_list, html_message=None, from_email=None):
    payload = {
        "subject": subject,
        "message": message,
        "recipient_list": recipient_list,
        "html_message": html_message,
        "from_email": from_email or settings.DEFAULT_FROM_EMAIL,
    }
    transaction.on_commit(lambda: send_email_task.delay(**payload))
