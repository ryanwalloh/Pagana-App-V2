import stripe
from django.conf import settings


def create_stripe_payment_intent(*, amount_cents, currency, metadata, idempotency_key):
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        metadata=metadata,
        idempotency_key=idempotency_key,
    )


def construct_stripe_webhook_event(*, payload, signature):
    return stripe.Webhook.construct_event(
        payload=payload,
        sig_header=signature,
        secret=settings.STRIPE_WEBHOOK_SECRET,
    )
