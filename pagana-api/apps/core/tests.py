from unittest.mock import patch

from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase

from .email import queue_email


class HealthCheckTests(APITestCase):
    def test_health_check_is_public(self):
        response = self.client.get("/api/v1/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")


class EmailTaskTests(APITestCase):
    def test_queue_email_uses_configured_from_address(self):
        with patch("apps.core.email.send_email_task.delay") as mocked_delay:
            with self.captureOnCommitCallbacks(execute=True):
                queue_email(
                    subject="Test subject",
                    message="Test body",
                    recipient_list=["recipient@example.com"],
                )

        mocked_delay.assert_called_once_with(
            subject="Test subject",
            message="Test body",
            recipient_list=["recipient@example.com"],
            html_message=None,
            from_email=settings.DEFAULT_FROM_EMAIL,
        )
